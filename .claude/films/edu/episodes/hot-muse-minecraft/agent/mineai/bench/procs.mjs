// mineai/bench/procs.mjs - every process under a running agent (BODY=mineai: each Mine AI host and its runtime child),
// sampled every few seconds: RSS, and CPU from the cumulative CPU time. Shared by gateway-iron.mjs and lease-soak.mjs.
// On staging the agent runs in a container: run the bench in a container of the agent image with --pid host, so it
// sees the agent's processes by their host pids; without `ps` there (the slim Node image has none) it reads /proc.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

const cpuSeconds = (t) => { // ps time: [[dd-]hh:]mm:ss.cc
  const [d, rest] = t.includes('-') ? t.split('-') : ['0', t];
  const parts = rest.split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return Number(d) * 86_400 + parts[0] * 3600 + parts[1] * 60 + parts[2];
};

/** Every process from /proc (Linux without ps): pid, ppid, RSS, CPU seconds (user + system), command line. */
function procRows() {
  const TICK = 100; // USER_HZ on Linux
  const out = [];
  for (const d of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try {
      const stat = fs.readFileSync(`/proc/${d}/stat`, 'utf8');
      const f = stat.slice(stat.lastIndexOf(')') + 2).split(' '); // fields from 3 (state) on
      const cmd = fs.readFileSync(`/proc/${d}/cmdline`, 'utf8').replace(/\0+$/, '').replace(/\0/g, ' ');
      out.push({ pid: Number(d), ppid: Number(f[1]), rssMb: (Number(f[21]) * 4096) / 1048576, cpuS: (Number(f[11]) + Number(f[12])) / TICK, cmd });
    } catch { /* gone meanwhile */ }
  }
  return out;
}

let hasPs = true;
/** The agent (agentPid, or its node child under an init) and every process under it, each with its role. */
export function processTree(agentPid) {
  let rows = null;
  if (hasPs) {
    try {
      rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,time=,command='], { encoding: 'utf8' }).trim().split('\n').map((l) => {
        const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(l);
        return m ? { pid: Number(m[1]), ppid: Number(m[2]), rssMb: Number(m[3]) / 1024, cpuS: cpuSeconds(m[4]), cmd: m[5] } : null;
      }).filter(Boolean);
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
      hasPs = false;
    }
  }
  rows ??= procRows();
  // under an init (compose init: true, docker inspect gives its pid) the agent is its node child; the init's own
  // command line ("/sbin/docker-init -- docker-entrypoint.sh node src/index.js") names the agent's script too
  const self = rows.find((r) => r.pid === agentPid);
  const isInit = self && (/(^|\/)(docker-init|tini)(\s|$)/.test(self.cmd) || !/src\/index\.js/.test(self.cmd));
  const agent = isInit ? rows.find((r) => r.ppid === agentPid && /src\/index\.js/.test(r.cmd))?.pid ?? agentPid : agentPid;
  const under = new Set([agent]);
  let grew = true;
  // the hosts run in process groups of their own, but stay the agent's children
  while (grew) { grew = false; for (const r of rows) if (!under.has(r.pid) && under.has(r.ppid)) { under.add(r.pid); grew = true; } }
  return rows.filter((r) => under.has(r.pid)).map((r) => ({
    ...r,
    role: r.pid === agent ? 'agent' : /host\.ts/.test(r.cmd) ? 'host' : r.ppid !== agent && /bun|node/.test(r.cmd) ? 'runtime' : 'other',
  }));
}

/**
 * Sample the agent's process tree every `everyMs` until stop(). `samples` grows as it runs: {t, pid, ppid, role, rssMb,
 * cpuPct (null on a process's first sample), cmd}.
 */
export function startSampler({ agentPid, everyMs = 5000 }) {
  const samples = [];
  const lastCpu = new Map();
  let sampling = true;
  const done = (async () => {
    while (sampling) {
      const t = Date.now();
      try {
        for (const p of processTree(agentPid)) {
          const prev = lastCpu.get(p.pid);
          lastCpu.set(p.pid, { t, cpuS: p.cpuS });
          const cpuPct = prev ? Math.round(((p.cpuS - prev.cpuS) / ((t - prev.t) / 1000)) * 1000) / 10 : null;
          samples.push({ t, pid: p.pid, ppid: p.ppid, role: p.role, rssMb: Math.round(p.rssMb), cpuPct, cmd: p.cmd.slice(0, 120) });
        }
      } catch { /* ps hiccup */ }
      await sleep(everyMs);
    }
  })();
  return { samples, async stop() { sampling = false; await done; } };
}
