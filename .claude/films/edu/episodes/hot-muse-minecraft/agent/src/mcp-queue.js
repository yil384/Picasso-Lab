// src/mcp-queue.js - the job queue of one MCP game (ROADMAP M2, "queued sequences" and "idempotency"). The steps of
// play and play_sequence run one after another in the background, so steps that do not fit in a call's 45 s reply
// keep running and a later reply reports them. Each step is pending (waiting or running), confirmed, failed or
// cancelled; a step that fails cancels every step queued after it (they were planned on its result), and stop clears
// the queue. Each accepted call is remembered under a key: its request_id, or else the call and its arguments for
// REPEAT_MS after its last step ended. A repeat gets the first call's steps back and never runs anything twice (the
// 2026-07-28 protocol makes clients re-send a call after a broken stream). A call without a request_id is forgotten as
// soon as a delivered reply has carried every one of its results: the client has seen them, so the same call sent
// again is a deliberate repeat (a retry after a failure, the same collect after a go_to) and runs. A finished step
// waits in the outbox until a delivered reply has carried its result. A step cancelled before it ran keeps the code of
// what cancelled it (the failed step's code, or STOPPED), so a reply made only of cancelled steps still says why.

import { codeOf } from './contracts.js';

/** Steps waiting at most (the running one not counted); a call that would pass it is refused whole. */
export const QUEUE_MAX = 64;
/** How long the same call (same arguments, no request_id) counts as a repeat after its last step ended. */
export const REPEAT_MS = 60_000;
const IDS_KEPT = 256; // calls remembered by request_id, per game (the oldest are forgotten first)
const OUTBOX_KEPT = 128; // finished steps no delivered reply has carried yet (a client that never reads them)

const FINAL = new Set(['confirmed', 'failed', 'cancelled']);
export const isFinal = (step) => FINAL.has(step.status);
/** The status a client sees: pending (waiting or running), confirmed, failed or cancelled. */
export const statusOf = (step) => (isFinal(step) ? step.status : 'pending');
/**
 * A step in words, by the caller's own numbering: "step 4", or for a craft the check added "the craft added before
 * step 4" (the caller's steps keep their numbers; an added step gets none of its own).
 */
export const stepName = (step) => (step.step != null ? `step ${step.step}` : `the ${step.skill} added before step ${step.before ?? '?'}`);

/**
 * @param {{start: (skill: string, args: object) => ({ok: true, promise: Promise<object>}|{ok: false, error: string}), now?: () => number}} opts
 *   start runs one skill on the game's bot (web.js startAction); now is the clock for the repeat window
 */
export function createQueue({ start, now = Date.now }) {
  const waiting = [];
  let current = null;
  let outbox = [];
  const calls = new Map(); // key -> call
  let seq = 0;

  function settle(step, status, result, why = null) {
    if (isFinal(step)) return;
    step.status = status;
    step.result = result;
    step.code = status === 'confirmed' ? null : status === 'cancelled' && !result ? null : codeOf(result);
    step.why = why;
    step.endedAt = now();
    outbox.push(step);
    if (outbox.length > OUTBOX_KEPT) outbox.shift();
    step.resolve();
  }

  /** Cancel every waiting step (cause: the typed code of what cancelled them); returns them. */
  function cancelWaiting(why, cause = null) {
    const gone = waiting.splice(0);
    for (const step of gone) {
      step.cause = cause;
      settle(step, 'cancelled', null, why);
    }
    return gone;
  }

  function finish(step, r) {
    if (current === step) current = null;
    const result = {
      ok: Boolean(r?.ok), result: String(r?.result ?? ''), delta: r?.delta && typeof r.delta === 'object' ? r.delta : {},
      ...(r?.ms != null ? { ms: r.ms } : {}), ...(typeof r?.code === 'string' ? { code: r.code } : {}),
      ...(r?.own && typeof r.own === 'object' ? { own: r.own } : {}),
    };
    settle(step, result.ok ? 'confirmed' : step.stopping ? 'cancelled' : 'failed', result, step.stopping ? step.stopping : null);
    if (!result.ok) cancelWaiting(`${stepName(step)} of ${step.call.label} (${step.skill}) ${step.stopping ? 'was stopped' : 'failed'}`, step.code ?? (step.stopping ? 'STOPPED' : 'FAILED'));
    pump();
  }

  function pump() {
    while (!current && waiting.length) {
      const step = waiting.shift();
      if (step.skill === 'get_state') { // a read in a sequence: nothing to run
        step.startedAt = now();
        settle(step, 'confirmed', { ok: true, result: 'read the state (below)', delta: {} });
        continue;
      }
      let started;
      try { started = start(step.skill, step.args); } catch (e) { started = { ok: false, error: String(e?.message ?? e) }; }
      step.startedAt = now();
      if (!started.ok) {
        finish(step, { ok: false, result: `could not start: ${started.error}`, delta: {} });
        return;
      }
      current = step;
      step.status = 'running';
      Promise.resolve(started.promise).then((r) => finish(step, r), (e) => finish(step, { ok: false, result: `error: ${e?.message ?? e}`, delta: {} }));
    }
  }

  /** Forget repeats that ran out (derived keys only) and the oldest request_ids past IDS_KEPT. */
  function prune() {
    let ids = 0;
    for (const [key, call] of [...calls].reverse()) {
      if (call.requestId) { if (++ids > IDS_KEPT) calls.delete(key); continue; }
      if (expired(call)) calls.delete(key);
    }
  }
  function expired(call) {
    if (call.requestId) return false;
    if (call.steps.some((x) => !isFinal(x))) return false;
    const last = Math.max(call.at, ...call.steps.map((x) => x.endedAt ?? 0));
    return now() - last > REPEAT_MS;
  }

  return {
    /** The call remembered under key (still within its repeat window), or null. */
    find(key) {
      const call = calls.get(key);
      if (!call) return null;
      if (expired(call)) { calls.delete(key); return null; }
      return call;
    },

    /**
     * Accept a call: remember it under key and queue its steps. planned: [{skill, args, step, before?, added?, addedItems?}]
     * (step: the caller's number, null for a craft the check added before the caller's step `before`).
     * @returns {object} the call: {key, sig, requestId, label, at, steps, settled}
     */
    submit(key, { sig, requestId = null, label, planned }) {
      const call = { key, sig, requestId, label, at: now(), steps: [] };
      call.steps = planned.map((p, i) => {
        let resolve;
        const done = new Promise((r) => { resolve = r; });
        return {
          id: ++seq, call, n: i + 1, skill: p.skill, args: p.args, step: p.step ?? null, before: p.before ?? null, added: p.added ?? null,
          addedItems: p.addedItems ?? null, status: 'queued', result: null, code: null, cause: null, why: null, startedAt: null,
          endedAt: null, delivered: false, stopping: null, done, resolve,
        };
      });
      call.settled = Promise.all(call.steps.map((x) => x.done));
      calls.delete(key);
      calls.set(key, call);
      prune();
      waiting.push(...call.steps);
      pump();
      return call;
    },

    /** Stop: cancel the waiting steps; the running one ends as cancelled when the body has stopped it. */
    stop(why = 'stop cleared the queue') {
      if (current) current.stopping = why;
      const gone = cancelWaiting(why, 'STOPPED');
      // a deliberate repeat after a stop runs again; calls with a request_id stay remembered
      for (const [key, call] of calls) if (!call.requestId) calls.delete(key);
      return { running: current, cancelled: gone };
    },

    /** Steps that finished and that no delivered reply has carried yet (other than `skip`), in the order they were sent. */
    finished(skip = []) {
      outbox = outbox.filter((x) => !x.delivered);
      return outbox.filter((x) => !skip.includes(x)).sort((a, b) => a.id - b.id);
    },

    /**
     * A reply carrying these final steps was delivered. A call without a request_id whose results have all been
     * delivered is forgotten: the same call sent again runs (a deliberate repeat, not a re-send after a cut stream).
     */
    delivered(steps) {
      const touched = new Set();
      for (const x of steps) {
        if (!isFinal(x)) continue;
        x.delivered = true;
        touched.add(x.call);
      }
      outbox = outbox.filter((x) => !x.delivered);
      for (const call of touched) {
        if (call.requestId || calls.get(call.key) !== call) continue;
        if (call.steps.every((x) => isFinal(x) && x.delivered)) calls.delete(call.key);
      }
    },

    /** Resolves when nothing is running or waiting (at once if so). */
    idle() {
      const open = [current, ...waiting].filter(Boolean);
      return Promise.all(open.map((x) => x.done)).then(() => (current || waiting.length ? this.idle() : undefined));
    },

    get busy() { return Boolean(current) || waiting.length > 0; },
    get running() { return current; },
    get waiting() { return [...waiting]; },
    /** Steps planned but not finished, running first: what the dry-run check must assume will happen. */
    get open() { return [current, ...waiting].filter(Boolean); },
  };
}
