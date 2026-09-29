export const meta = {
  name: 'guandan-fix-round',
  description: 'Track-owned fix agents implement a review round in their own worktrees, each checked by an independent verifier, looping until the checker passes',
  whenToUse: 'After a Guandan review round (args: {round, review, tracks:[{key, worktree, branch, ids, notes}]})',
  phases: [
    { title: 'Fix', detail: 'one agent per code-ownership track, in its own worktree/branch' },
    { title: 'Check', detail: 'independent verifier per track: every finding fixed, nothing regressed' },
  ],
}

const R = args.round
const REVIEW = args.review
const MAX_ITER = args.maxIter || 3
const SESSION = args.session
const BASE = args.base || 'guandan-cloud'

const COMMON = `
You are working on the Picasso Lab Guandan (掼蛋) redesign, fix round ${R}. Goal of the whole redesign: a 1:1 replica of Tencent's professional
Guandan UI (腾讯掼蛋 / 大掼蛋 2026) while keeping every lab easter egg and personalization; the user rejected earlier versions as "AI味 / 不专业"
and said "好好优化，不要糊弄" — do it properly. Read /home/user/Picasso-Lab/guandan-kit/SPEC.md (binding spec: §1 must-keep, §3 ground rules,
§4 architecture) and /home/user/Picasso-Lab/guandan-kit/refs/research-tencent.md (measured Tencent spec) before you change anything.

The review you are fixing: ${REVIEW} (Markdown; findings have ids R${R}-NN, a track, evidence and a proposed fix — the proposed fix is a
suggestion: find the right fix, don't apply one blindly).

RULES (hard):
- Work ONLY inside your own git worktree (path below) on your own branch. Never edit files in /home/user/Picasso-Lab itself, never touch other
  worktrees, never push, never merge, never change branches other than yours.
- UI only: the Firebase schema and writes, game rules and the AI engine (events/static/guandan-engine.js, guandan-ai-worker.js) must not
  change behaviour; guandan-records.js PLAYERS/MATCHES data and scoring must not change. If a finding truly needs a logic change, stop and
  report it instead.
- SPEC §3: no emoji in UI, no backdrop-filter/glassmorphism, no glow/neon, no halo/shadow outside avatar circles, no infinite decorative
  animation (only the turn timer and 报牌 pulse loop), animate only transform/opacity, respect prefers-reduced-motion, absolute asset URLs
  https://yil384.github.io/Picasso-Lab/..., Chinese-first copy through L(en, zh), no new third-party libraries.
- Match the surrounding code style (plain ES module, template strings, sparse useful comments, no dead code, no stacked override CSS: change
  the rule where it lives instead of adding a later override).
- Never commit screenshots or the Tencent reference images (copyrighted). Your shots go under <worktree>/guandan-kit/harness/shots or
  <worktree>/guandan-kit/scratch (both git-ignored).
- Commit early and often on your branch with clear messages in the repo's style, e.g. "fix(guandan): 提示 answers on the first press" /
  "style(guandan): ...". End every commit message with these two trailer lines exactly:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: ${SESSION}
  Never put a model name anywhere else in commits or code.

TOOLS: references (copyrighted, reference only) in /home/user/Picasso-Lab/guandan-kit/refs/img/ (full res) and downscaled copies in
/home/user/Picasso-Lab/guandan-kit/scratch/refs-small/ — dagd_store_4.jpg is the 2026 in-game action row. Baseline shots of the pre-fix build: /home/user/Picasso-Lab/guandan-kit/harness/shots/<vp>-<scene>.jpg.
The harness is in your worktree: <worktree>/guandan-kit/harness (gdh.py docstring; scenes.py = staged scenes, run e.g.
"python3 scenes.py phone portrait --only=table,result"; play.py <vp> 2 = two full rounds; sheet.py = contact sheets). Run it from your
worktree's harness dir so it serves YOUR worktree's files. The machine has 4 CPUs and another agent may be running a browser: one browser at
a time, short runs, close browsers (the session() context manager does). Downscale/crop screenshots with PIL before viewing them.
Viewports: desk 1440x900@2, hd 1280x720@2, ifr 1024x640@2, phone 844x390@3 touch, portrait 390x844@3 touch (table rotated).

VERIFY before you finish: node --check on the extracted module script of events/guandan.html (python: re.search(r'<script type="module">(.*?)</script>')
into a .mjs file), the affected scenes re-shot at every affected viewport and compared side by side with the baseline AND the Tencent
reference, python3 play.py phone 2 (two full rounds, zero console errors) and python3 play.py desk 1, zero new console errors in scenes.py.
`

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    track: { type: 'string' },
    branch: { type: 'string' },
    commits: { type: 'array', items: { type: 'string' } },
    findings: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['fixed', 'partial', 'not-fixed', 'wontfix'] }, notes: { type: 'string' }, evidence: { type: 'string' } }, required: ['id', 'status', 'notes'] } },
    other_changes: { type: 'string' },
    verification: { type: 'string' },
  },
  required: ['track', 'branch', 'commits', 'findings', 'verification'],
}
const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'true only if every assigned high/medium finding is really fixed and nothing regressed' },
    verdicts: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, verdict: { type: 'string', enum: ['fixed', 'partial', 'not-fixed', 'regressed', 'wontfix-accepted'] }, notes: { type: 'string' } }, required: ['id', 'verdict', 'notes'] } },
    regressions: { type: 'array', items: { type: 'string' } },
    todo: { type: 'string', description: 'precise instructions for the fixer if not ok' },
  },
  required: ['ok', 'verdicts', 'regressions', 'todo'],
}

function fixPrompt(t, iter, feedback) {
  return `${COMMON}
YOUR TRACK: ${t.key}. Your worktree: ${t.worktree} (branch ${t.branch}, already checked out — cd there first and stay there).
Code you own on this track: ${t.owns}
Findings assigned to you: ${t.ids.join(', ')} (read them in the review). Fix every high and medium one properly; fix the lows that are cheap
and safe. ${t.notes || ''}
${iter > 1 ? `\nThis is iteration ${iter}: an independent checker reviewed your branch and it is NOT done yet. Its verdicts and todo:\n${feedback}\nAddress all of it (and re-check your earlier fixes still hold).` : ''}
Return the per-finding status honestly (partial / not-fixed with the reason when you could not finish), the commit subjects, and how you verified.`
}

function checkPrompt(t, fix) {
  return `${COMMON}
YOU ARE THE INDEPENDENT CHECKER for track ${t.key} (worktree ${t.worktree}, branch ${t.branch}). You are READ-ONLY on the code: do not edit or
commit; your own scripts/shots go to ${t.worktree}/guandan-kit/scratch/check/. The fixer reports:
${JSON.stringify(fix, null, 1)}
Verify, don't trust: for every assigned finding (${t.ids.join(', ')}) re-shoot the scene at the affected viewports from the worktree, compare
with the baseline shot and the Tencent reference, and decide fixed / partial / not-fixed / regressed (a wontfix is acceptable only if the
reason is sound, e.g. it would need a game-logic change). Review the diff (git -C ${t.worktree} diff ${BASE}...HEAD) for SPEC §3
violations, logic/Firebase/engine changes, dead code, stacked overrides, relative URLs, and regressions on screens the fix touched indirectly
(run scenes.py for the other groups at phone and desk and look). Run play.py phone 2 and check console errors. ok = true only when every
high/medium finding is fixed and nothing regressed. If not ok, write a precise todo for the fixer.`
}

phase('Fix')
const results = await pipeline(args.tracks, async (t) => {
  let feedback = ''
  let fix = null, check = null
  for (let iter = 1; iter <= MAX_ITER; iter++) {
    fix = await agent(fixPrompt(t, iter, feedback), { label: `fix:${t.key}:${iter}`, phase: 'Fix', schema: FIX_SCHEMA })
    if (!fix) break
    check = await agent(checkPrompt(t, fix), { label: `check:${t.key}:${iter}`, phase: 'Check', schema: CHECK_SCHEMA })
    if (!check || check.ok) break
    feedback = JSON.stringify({ verdicts: check.verdicts, regressions: check.regressions, todo: check.todo }, null, 1)
    log(`${t.key}: checker not satisfied after iteration ${iter}`)
  }
  return { track: t.key, branch: t.branch, fix, check }
})
return results
