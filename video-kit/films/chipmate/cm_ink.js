// cm_ink.js - per-frame NPR extras (lights, glows, comic FX), the p5.brush ink overlay that tracks 3D
// points (puffs, stars, sparks, motion lines, emotes), and the Canvas2D lettering (BZZT!, "!" takes).
import { T, st, K, W, PAL, COL, TAU, cycF, stationX, clamp, lerp, sm, ob, ringv, hsh } from './cm_core.js';
import { burst } from './npr/brush.js';
import { layoutWord } from './cm_glyphs.js';
import { star4 } from './cm_paint.js';

const V3 = (x, y, z) => new T.THREE.Vector3(x, y, z);
const BAD = () => cycF(1, K.bad) + Math.round(K.cyc1 * 0.6) + 1;   // the frame the red lamp lights
function prj(ctx, x, y, z) {
  const v = V3(x, y, z), s = ctx.project(v, T.camera), vc = v.clone().applyMatrix4(T.camera.matrixWorldInverse);
  return { x: s.x, y: s.y, front: vc.z < 0, d: -vc.z };
}
function pxu(ctx, x, y, z) { const p = prj(ctx, x, y, z); return p.front ? (ctx.DH / 2) / (Math.tan(T.camera.fov * Math.PI / 360) * p.d) : 0; }
const onScreen = (p, m = 80) => p.front && p.x > -m && p.x < 1920 + m && p.y > -m && p.y < 1080 + m;

// ---------------------------------------------------------------------------------------------------
// npr per frame
// ---------------------------------------------------------------------------------------------------
export function drawNPR(ctx, LOOK) {
  const { npr, camera } = T, F = ctx.iw;
  npr.frame(ctx);
  npr.setLook(LOOK);
  const rg = st.rig;
  npr.setLight({ dir: [-0.5, 0.8, 0.62], target: [rg.tg[0], 0, rg.tg[2]], size: clamp(rg.r * 0.7, 4.2, 12), dist: 22, far: 50 });
  npr.setSmear(st.smear || 0, 0);
  // check-lamps: comic glow (dots in the light's colour); the red one bursts
  let pl = 0;
  st.lamps.forEach((L, k) => {
    if (!L.s) return;
    const p = V3(stationX(k), 0.13, W.lampZ);
    if (L.s === 1) npr.glowAt(ctx, camera, p, { radius: 0.24, i: 0.5 + 0.35 * Math.exp(-L.age / 5), color: 0xffc04a, behind: true, seed: k, rays: L.age < 6 ? 0.6 * (1 - L.age / 6) : 0, rayCount: 10, rayLen: 0.3 });
    else npr.glowAt(ctx, camera, p, { radius: 0.3, i: 0.9, color: 0xff5a4a, behind: true, seed: k, rays: L.age < 14 ? 0.9 : 0.25, rayCount: 12, rayLen: 0.6 });
  });
  // painted light spill: the newest lit lamps, the red alarm
  const lit = st.lamps.map((L, k) => ({ L, k })).filter((o) => o.L.s).slice(-2);
  for (const { L, k } of lit) { if (pl < 2) { npr.pointLight(V3(stationX(k), 0.35, W.lampZ), { color: L.s === 2 ? 0xff5a4a : 0xffc04a, radius: L.s === 2 ? 1.4 : 0.9, i: L.s === 2 ? 0.8 : 0.5 }); pl++; } }
  // DING at match 1.0: the harness bell bursts
  const dg = F - K.ding;
  if (dg >= 0 && dg < 16) npr.glowAt(ctx, camera, T.bell.localToWorld(V3(0, 0.05, 0)), { radius: 0.16, i: 1, color: 0xffd257, rays: 1 - dg / 16, rayCount: 12, rayLen: 0.7, seed: 3 });
  // city lights: warm pools over the city once it lights up
  if (st.cityLit > 0) { npr.pointLight(V3(W.tower[0], 3.2, W.tower[1] + 0.8), { color: 0xffd27a, radius: 3.5, i: 0.45 * clamp(st.cityLit / 10) }); }
  // fairground: warm light on the stage
  if (F >= K.whipG[0] && F < K.whipH[1]) npr.pointLight(V3(6.4, 2.6, 0.4), { color: 0xffc46a, radius: 3.2, i: 0.35 });
  // the puck glows at the top of its climb
  if (st.puck > 0.05 && (F >= K.dHit || (F >= K.gHit && F < K.puckFall[1]))) {
    const S = W.striker, py = S.y0 + st.puck * (S.y1 - S.y0);
    const top = F >= K.puckD[1] - 2 || (F >= K.puckG[1] - 2 && F < K.puckFall[0]);
    if (top) npr.glowAt(ctx, camera, V3(S.x, py, S.z + 0.12), { radius: 0.22, i: 0.9, color: F >= K.dHit ? 0xffd257 : 0xb8b6e0, rays: F >= K.dHit ? 0.8 : 0.3, rayCount: 12, rayLen: 0.5, seed: 9 });
  }
  // concentration lines + impact frames on the big hits
  const fl = (f0, dur, p, r0, amt = 0.85) => { const a = F - f0; if (a >= 0 && a < dur) { const c = ctx.project(p, camera); npr.focusLines({ x: c.x, y: c.y, r0, amount: amt * (1 - a / dur), count: 110, width: 1.3, seed: f0 }); } };
  const bad = BAD();
  fl(bad, 16, V3(stationX(K.bad), 0.3, W.lampZ), 260);
  fl(K.gHit, 12, V3(W.pad[0], W.stage.h + 0.3, W.pad[1]), 300, 0.7);
  fl(K.dHit, 14, V3(W.pad[0], W.stage.h + 0.3, W.pad[1]), 240);
  fl(K.slam, 16, V3((W.podium.x0 + W.podium.x1) / 2, W.stage.h + 0.9, -0.7), 380, 0.8);
  if (F === bad) npr.impact(1, { invert: true, threshold: 0.55 });
  if (F === K.gHit) npr.impact(0.85, { threshold: 0.5 });
  if (F === K.dHit || F === K.dHit + 1) npr.impact(1, { invert: F === K.dHit, threshold: 0.55 });
  if (F === K.slam) npr.impact(0.8, { threshold: 0.55 });
  npr.render(T.scene, camera);
}

// ---------------------------------------------------------------------------------------------------
// ink overlay (p5.brush), boiling on twos
// ---------------------------------------------------------------------------------------------------
function puff(brush, x, y, s, col, a) {
  if (a <= 0 || s < 2) return;
  brush.set('inkpen', col, 1.0 * a + 0.3);
  for (let q = 0; q < 3; q++) { const cx = x + (q - 1) * s * 0.8, cy = y - (q === 1 ? s * 0.4 : 0); const pts = []; for (let k = 0; k <= 8; k++) { const an = Math.PI + k / 8 * Math.PI; pts.push([cx + Math.cos(an) * s * 0.6, cy + Math.sin(an) * s * 0.6]); } brush.spline(pts, 0.5); }
}
function starBurst(brush, x, y, r0, r1, n, col, w, rot = 0) {
  brush.set('bigink', col, w);
  for (let q = 0; q < n; q++) { const an = rot + q / n * TAU; brush.line(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1); }
}
function vein(brush, x, y, s, col) {   // comic anger mark (four bulging corners)
  brush.set('fatink', col, Math.max(0.5, s / 40));
  for (let q = 0; q < 4; q++) {
    const a = q * Math.PI / 2 + Math.PI / 4, cx = x + Math.cos(a) * s * 0.45, cy = y + Math.sin(a) * s * 0.45;
    const t = a + Math.PI / 2;
    brush.spline([[cx + Math.cos(t) * s * 0.3, cy + Math.sin(t) * s * 0.3], [cx + Math.cos(a) * s * 0.12, cy + Math.sin(a) * s * 0.12], [cx - Math.cos(t) * s * 0.3, cy - Math.sin(t) * s * 0.3]], 0.6);
  }
}
function drop(brush, x, y, s) {
  const pts = [[x, y - s], [x + s * 0.5, y], [x + s * 0.32, y + s * 0.45], [x - s * 0.32, y + s * 0.45], [x - s * 0.5, y]];
  brush.noStroke(); brush.fill('#8fd3f0', 255); brush.fillBleed(0.01); brush.polygon(pts); brush.noFill();
  brush.set('inkpen', PAL.ink, 1.0); brush.beginShape(0.4); pts.forEach(([a, b]) => brush.vertex(a, b)); brush.endShape(true);
}
function sparkle(brush, x, y, r, col, rot = 0) { brush.noStroke(); brush.fill(col, 255); brush.fillBleed(0.02); brush.polygon(star4(x, y, r, rot)); brush.noFill(); }

export function inkOverlay(ctx, brush) {
  const F = ctx.iw, r = ctx.boilRng('ink'), ink = PAL.ink;
  brush.noHatch();
  // ticket poof
  const pa = F - K.split;
  if (pa >= 0 && pa < 9) { const p = prj(ctx, W.screenX, 1.78, -0.9), u = pxu(ctx, W.screenX, 1.78, -0.9); if (onScreen(p)) { puff(brush, p.x, p.y + 10, 0.14 * u * (1 + pa * 0.12), ink, 1 - pa / 9); starBurst(brush, p.x, p.y, 0.12 * u * (1 + pa * 0.2), 0.26 * u * (1 + pa * 0.1), 8, ink, 1.2, 0.3); } }
  // tube THUNK lines
  const ta = F - K.tube;
  if (ta >= 0 && ta < 8) { const p = prj(ctx, W.screenX, 1.4, -1.4), u = pxu(ctx, W.screenX, 1.4, -1.4); if (onScreen(p)) starBurst(brush, p.x, p.y, 0.25 * u, 0.42 * u, 6, ink, 1.2, -0.3 + ta * 0.02); }
  // the bonk (screen top vs Py's snout)
  const bk = F - K.bonk;
  if (bk >= 0 && bk < 7) { const p = prj(ctx, W.screenX + 0.12, 1.28, -0.75), u = pxu(ctx, W.screenX, 1.2, -0.75); if (onScreen(p)) { starBurst(brush, p.x, p.y, 0.08 * u * (1 + bk * 0.3), 0.22 * u * (1 + bk * 0.15), 8, ink, 1.4, 0.2); sparkle(brush, p.x + 0.2 * u, p.y - 0.15 * u, 0.07 * u, PAL.ochre, 0.3); } }
  // hammer hits on the gate-blocks, the fuse sparkle
  for (const h of K.hits) { const a = F - h; if (a >= 0 && a < 5) { const p = prj(ctx, -6.15, 0.45, -0.3), u = pxu(ctx, -6.15, 0.4, -0.3); if (onScreen(p)) starBurst(brush, p.x, p.y, 0.08 * u, 0.2 * u * (1 + a * 0.15), 7, ink, 1.2, h); } }
  const fu = F - K.fuse;
  if (fu >= 0 && fu < 24) { const p = prj(ctx, -6.15, 0.5, -0.3), u = pxu(ctx, -6.15, 0.5, -0.3); if (onScreen(p)) { if (fu < 8) puff(brush, p.x, p.y + 0.05 * u, 0.12 * u * (1 + fu * 0.1), ink, 1 - fu / 8); for (let q = 0; q < 4; q++) { const ph = ((fu / 14) + q * 0.27) % 1; sparkle(brush, p.x + Math.cos(q * 1.9) * 0.25 * u, p.y - 0.1 * u - Math.sin(q * 1.3 + 0.5) * 0.18 * u, 0.06 * u * Math.sin(Math.PI * ph), q % 2 ? PAL.ochre : '#ffffff', q); } } }
  // show-off sparkles (chip overhead, the can)
  if (F >= 136 && F < 152 && st.dut) { const u = pxu(ctx, ...st.dut); const p = prj(ctx, ...st.dut); for (let q = 0; q < 3; q++) { const ph = ((F - 136) / 10 + q * 0.33) % 1; sparkle(brush, p.x + (q - 1) * 0.22 * u, p.y - 0.18 * u - ph * 0.1 * u, 0.06 * u * Math.sin(Math.PI * ph), PAL.ochre, q); } }
  // check-lamps have faces: a grin when both traces agree on the cycle, X-eyes when they disagree
  st.lamps.forEach((L, k) => {
    if (!L.s) return;
    const x = stationX(k), p = prj(ctx, x, 0.13, W.lampZ + 0.06), u = pxu(ctx, x, 0.13, W.lampZ);
    if (!onScreen(p) || u < 25) return;
    const s = 0.1 * u * (L.s === 2 ? 1.15 : 1) * (1 + (L.age < 5 ? 0.25 * (1 - L.age / 5) : 0)), wl = Math.max(0.6, s / 22);
    if (L.s === 1) {
      for (const sg of [-1, 1]) { brush.noStroke(); brush.fill(ink, 255); brush.fillBleed(0.01); brush.circle(p.x + sg * s * 0.45, p.y - s * 0.2, s * 0.16, 0.2); brush.noFill(); }
      brush.set('bigink', ink, wl); brush.spline([[p.x - s * 0.42, p.y + s * 0.18], [p.x, p.y + s * 0.5], [p.x + s * 0.42, p.y + s * 0.18]], 0.7);
    } else {
      brush.set('bigink', ink, wl * 1.1);
      for (const sg of [-1, 1]) { const cx = p.x + sg * s * 0.45, cy = p.y - s * 0.2, r = s * 0.2; brush.line(cx - r, cy - r, cx + r, cy + r); brush.line(cx - r, cy + r, cx + r, cy - r); }
      const pts = []; for (let q = 0; q <= 6; q++) pts.push([p.x - s * 0.45 + q * s * 0.15, p.y + s * 0.35 + (q % 2 ? -1 : 1) * s * 0.1]);
      for (let q = 0; q < 6; q++) brush.line(pts[q][0], pts[q][1], pts[q + 1][0], pts[q + 1][1]);
    }
  });
  // Py's model came back clean: a chalk tick next to it
  if (F >= K.check && F < K.grab + 6 && st.can) { const c = st.can, p = prj(ctx, c[0] + 0.12, c[1] + 0.25, c[2] + 0.05), u = pxu(ctx, ...c); if (onScreen(p)) { const k = sm((F - K.check) / 4), s = 0.16 * u; brush.set('fatink', PAL.tealD, Math.max(0.7, s / 30)); brush.line(p.x - s * 0.5, p.y, p.x - s * 0.5 + s * 0.35 * Math.min(1, k * 2), p.y + s * 0.35 * Math.min(1, k * 2)); if (k > 0.5) brush.line(p.x - s * 0.15, p.y + s * 0.35, p.x - s * 0.15 + s * 0.75 * (k - 0.5) * 2, p.y + s * 0.35 - s * 1.0 * (k - 0.5) * 2); } }
  // blame: anger veins over both heads
  if (F >= K.blame[0] + 3 && F < K.landPl[0]) {
    const pulse = 1 + 0.12 * Math.sin(F * 0.9);
    for (const hd of [st.chipHead, st.pyHead]) { const p = prj(ctx, hd.x + 0.18, hd.y + 0.2, hd.z), u = pxu(ctx, hd.x, hd.y, hd.z); if (onScreen(p)) vein(brush, p.x, p.y, 0.2 * u * pulse, PAL.red); }
  }
  // plane landings: little stars
  for (const [f, hd] of [[K.landPl[0], st.chipHead], [K.landPl[1], st.pyHead]]) { const a = F - f; if (a >= 0 && a < 6) { const p = prj(ctx, hd.x, hd.y + 0.28, hd.z), u = pxu(ctx, hd.x, hd.y, hd.z); if (onScreen(p)) starBurst(brush, p.x, p.y, 0.06 * u, 0.15 * u * (1 + a * 0.2), 6, ink, 1.1, f); } }
  // Chip sweats at the bug
  if (F >= K.bugPeek + 3 && F < K.grab + 2) { const hd = st.chipHead; const ph = ((F - K.bugPeek) % 14) / 14; const p = prj(ctx, hd.x - 0.28, hd.y + 0.05 - ph * 0.12, hd.z + 0.1), u = pxu(ctx, hd.x, hd.y, hd.z); if (onScreen(p)) drop(brush, p.x, p.y, 0.09 * u); }
  // WHACK
  const wk = F - K.whack;
  if (wk >= 0 && wk < 7) { const p = prj(ctx, -6.15, 0.5, -0.3), u = pxu(ctx, -6.15, 0.45, -0.3); if (onScreen(p)) { starBurst(brush, p.x, p.y, 0.1 * u * (1 + wk * 0.3), 0.3 * u * (1 + wk * 0.12), 9, ink, 1.6, 0.1); } }
  // the bug runs off: motion lines
  if (st.bug && F >= K.whack + 8 && F < 430) { const b = st.bug, p = prj(ctx, b[0], b[1] + 0.04, b[2]), u = pxu(ctx, ...b); if (onScreen(p)) { brush.set('inkpen', ink, 1.0); for (let q = 0; q < 3; q++) brush.line(p.x + 0.12 * u, p.y - 0.02 * u + q * 0.03 * u, p.x + (0.22 + q * 0.04) * u, p.y - 0.06 * u + q * 0.03 * u); } }
  // the stimulus die: landing puffs + a dashed hop arc
  if (st.die && T.die6.visible) {
    const d = st.die, u = pxu(ctx, d.x, d.y, d.z);
    if (d.land >= 0 && d.land < 7) { const p = prj(ctx, d.x, 0.02, d.z); if (onScreen(p)) puff(brush, p.x, p.y, 0.1 * u * (1 + d.land * 0.1), ink, 1 - d.land / 7); }
  }
  // BZZT: red zig-zag sparks round the failing lamp
  const bz = F - BAD();
  if (bz >= 0 && bz < 20) {
    const x = stationX(K.bad), p = prj(ctx, x, 0.15, W.lampZ), u = pxu(ctx, x, 0.15, W.lampZ);
    if (onScreen(p)) {
      brush.set('bigink', PAL.red, 1.4);
      for (let q = 0; q < 6; q++) {
        const an = q / 6 * TAU + 0.4 + (F >> 1) * 0.3, r0 = 0.22 * u, r1 = (0.42 + 0.08 * (q % 2)) * u * (1 + bz * 0.02);
        const pts = []; for (let s = 0; s <= 4; s++) { const rr = lerp(r0, r1, s / 4), off = (s % 2 ? 1 : -1) * 0.04 * u; pts.push([p.x + Math.cos(an) * rr - Math.sin(an) * off, p.y + Math.sin(an) * rr + Math.cos(an) * off]); }
        for (let s = 0; s < 4; s++) brush.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]);
      }
    }
  }
  // DING: rings round the harness bell
  if (dg(F) >= 0 && dg(F) < 12) { const w = T.bell.localToWorld(V3(0, 0.05, 0)), p = prj(ctx, w.x, w.y, w.z), u = pxu(ctx, w.x, w.y, w.z); if (onScreen(p)) { brush.set('bigink', ink, 1.2); for (let q = 1; q <= 2; q++) brush.spline([[p.x - 0.18 * u * q, p.y - 0.1 * u * q], [p.x - 0.22 * u * q - 4, p.y + 0.04 * u], [p.x - 0.18 * u * q, p.y + 0.16 * u * q]], 0.7); for (let q = 1; q <= 2; q++) brush.spline([[p.x + 0.18 * u * q, p.y - 0.1 * u * q], [p.x + 0.22 * u * q + 4, p.y + 0.04 * u], [p.x + 0.18 * u * q, p.y + 0.16 * u * q]], 0.7); } }
  // high five spark
  const hf = F - 503;
  if (hf >= 0 && hf < 9) { const a = st.handR, p = prj(ctx, a.x + 0.02, a.y + 0.05, a.z), u = pxu(ctx, a.x, a.y, a.z); if (onScreen(p)) { starBurst(brush, p.x, p.y, 0.06 * u * (1 + hf * 0.3), 0.2 * u * (1 + hf * 0.12), 8, ink, 1.3, 0.2); sparkle(brush, p.x, p.y, 0.1 * u * (1 - hf / 9), PAL.ochre, 0.4); } }
  // giant stomp dust, hammer hit, puck speed lines
  const sa = F - K.stomp;
  if (sa >= 0 && sa < 12) { for (const dz of [-0.6, 0.6]) { const x = W.giant[0] - 0.4, z = W.giant[1] + dz, p = prj(ctx, x, W.pcbY + 0.05, z), u = pxu(ctx, x, W.pcbY, z); if (onScreen(p)) puff(brush, p.x + dz * sa * 4, p.y - sa, 0.3 * u * (1 + sa * 0.08), ink, 1 - sa / 12); } }
  for (const [f, big] of [[K.gHit, 1.4], [K.dHit, 1]]) { const a = F - f; if (a >= 0 && a < 8) { const p = prj(ctx, W.pad[0], W.stage.h + 0.15, W.pad[1]), u = pxu(ctx, W.pad[0], W.stage.h, W.pad[1]); if (onScreen(p)) { starBurst(brush, p.x, p.y, 0.15 * u * big * (1 + a * 0.3), 0.45 * u * big * (1 + a * 0.12), 10, ink, 1.6, f); puff(brush, p.x - 0.4 * u - a * 3, p.y, 0.12 * u * (1 + a * 0.1), ink, 1 - a / 8); puff(brush, p.x + 0.4 * u + a * 3, p.y, 0.12 * u * (1 + a * 0.1), ink, 1 - a / 8); } } }
  if ((F >= K.gHit + 1 && F < K.puckG[1] - 3) || (F >= K.dHit + 1 && F < K.puckD[1] - 2)) {
    const S = W.striker, py = S.y0 + st.puck * (S.y1 - S.y0), p = prj(ctx, S.x, py - 0.1, S.z + 0.15), u = pxu(ctx, S.x, py, S.z);
    if (onScreen(p)) { brush.set('bigink', ink, 1.2); for (let q = -2; q <= 2; q++) brush.line(p.x + q * 0.06 * u, p.y + 0.08 * u, p.x + q * 0.06 * u, p.y + (0.35 + 0.1 * (q % 2)) * u); }
  }
  // slam: dust under each numeral, then sparkles round "80.1%"
  const sl = F - K.slam;
  if (sl >= -4 && sl < 14) T.num.letters.forEach((L, i) => {
    const a = F - (K.slam - 4 + i * 2); if (a < 0 || a >= 10) return;
    const w = L.g.localToWorld(V3(L.w / 2, 0.02, 0.2)), p = prj(ctx, w.x, w.y, w.z), u = pxu(ctx, w.x, w.y, w.z);
    if (onScreen(p)) { puff(brush, p.x - 0.3 * u - a * 3, p.y, 0.12 * u * (1 + a * 0.1), ink, 1 - a / 10); puff(brush, p.x + 0.3 * u + a * 3, p.y, 0.12 * u * (1 + a * 0.1), ink, 1 - a / 10); }
  });
  if (sl >= 6 && F < K.whipH[0] + 4) for (let q = 0; q < 6; q++) {
    const ph = ((sl / 18) + q * 0.29) % 1; if (ph > 0.75) continue;
    const w = T.num.g.localToWorld(V3(0.15 + q * 0.52, 0.95 + 0.25 * hsh(q, 3), 0.1)), p = prj(ctx, w.x, w.y, w.z), u = pxu(ctx, w.x, w.y, w.z);
    if (onScreen(p)) sparkle(brush, p.x, p.y, 0.09 * u * Math.sin(Math.PI * ph / 0.75), q % 2 ? PAL.ochre : '#ffffff', 0.2 * q);
  }
  // the giant sweats
  if (F >= K.gape[0] + 10 && F < K.whipH[0] + 2 && st.giantHead) { const h = st.giantHead, ph = ((F - K.slam) % 16) / 16; const p = prj(ctx, h.x - 0.2, h.y + 0.1 - ph * 0.3, h.z + 0.5), u = pxu(ctx, h.x, h.y, h.z); if (onScreen(p)) drop(brush, p.x, p.y, 0.22 * u); }
}
const dg = (F) => F - K.ding;

// ---------------------------------------------------------------------------------------------------
// lettering (Canvas2D): hand-built stroke letters, tapered like brush strokes -> ink drop shadow, ink outline, colour
// ---------------------------------------------------------------------------------------------------
// a stroke inked like a brush: width swells in the middle and tapers to the ends (filled polygon, no round caps)
function taper(g, pts, w, jr) {
  let P = pts;
  if (P.length === 2) { P = []; for (let k = 0; k <= 8; k++) P.push([lerp(pts[0][0], pts[1][0], k / 8), lerp(pts[0][1], pts[1][1], k / 8)]); }
  const n = P.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const t = i / (n - 1), wi = w * (0.55 + 0.6 * Math.sin(Math.PI * (0.08 + 0.84 * t))) * (jr ? 1 + jr.gauss(0, 0.05) : 1) / 2;
    L.push([P[i][0] + nx * wi, P[i][1] + ny * wi]); Rr.push([P[i][0] - nx * wi, P[i][1] - ny * wi]);
  }
  g.beginPath(); [...L, ...Rr.reverse()].forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
}
function handWord(g, word, x, y, size, o) {
  const { letters } = layoutWord(word, 0.16);
  const lw = size * (o.weight ?? 0.24), jr = o.jitter;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0);
  if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0);
  g.globalAlpha = o.alpha ?? 1;
  const L = letters.map((Lt, i) => ({ ...Lt, k: o.pops ? o.pops(i) : 1, ly: -o.arc * (1 - 4 * ((i / Math.max(1, letters.length - 1)) - 0.5) ** 2) + (hsh(i, word.length, 3) - 0.5) * size * 0.1, rot: (hsh(i, word.length, 5) - 0.5) * 0.2 }));
  const pass = (col, w, dx, dy) => {
    g.fillStyle = col;
    for (const Lt of L) {
      if (Lt.k <= 0.01) continue;
      g.save(); g.translate(Lt.x * size + dx, Lt.ly + dy); g.rotate(Lt.rot); g.scale(Lt.k, Lt.k);
      for (const s of Lt.strokes) taper(g, s.map(([u, v]) => [u * size, v * size]), w, jr);
      for (const [u, v] of Lt.dots) { g.beginPath(); g.arc(u * size, v * size, w * 0.55, 0, TAU); g.fill(); }
      g.restore();
    }
  };
  pass(o.ink, lw + size * 0.16, size * 0.07, size * 0.085);   // ink drop shadow
  pass(o.ink, lw + size * 0.16, 0, 0);                          // ink outline
  pass(o.fill, lw, 0, 0);                                       // colour
  g.restore();
}
function bang(g, x, y, s, rot, r) {   // comic "!" take mark
  if (s < 3) return;
  const j = () => (r ? r.gauss(0, s * 0.012) : 0);
  const bar = [[-0.21, -1.0], [0.21, -1.03], [0.075, -0.3], [-0.075, -0.29]].map(([u, v]) => [u * s + j(), v * s + j()]);
  const shape = (dx, dy) => { g.beginPath(); bar.forEach(([u, v], q) => (q ? g.lineTo(u + dx, v + dy) : g.moveTo(u + dx, v + dy))); g.closePath(); g.moveTo(0.14 * s + dx, dy); g.arc(dx, dy, 0.14 * s, 0, TAU); };
  g.save(); g.translate(x, y); g.rotate(rot); g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = PAL.ink; g.strokeStyle = PAL.ink; g.lineWidth = s * 0.13;
  shape(s * 0.06, s * 0.07); g.fill(); g.stroke();
  shape(0, 0); g.stroke();
  g.fillStyle = PAL.red; shape(0, 0); g.fill();
  g.restore();
}
export function lettering(ctx, g) {
  const F = ctx.iw, jr = ctx.boilRng('letters');
  // BZZT! - the only word SFX: a mismatch at cycle 5
  const bz = F - BAD();
  if (bz >= 0 && bz < 22) {
    const x = stationX(K.bad), p = prj(ctx, x + 0.2, 1.05, W.lampZ);
    if (p.front) handWord(g, 'BZZT!', clamp(p.x, 360, 1560), clamp(p.y, 240, 640), 150, { fill: PAL.red, ink: PAL.ink, arc: 14, rot: -0.12, skew: -0.18, weight: 0.3,
      alpha: 1 - sm((bz - 17) / 5), pops: (i) => ob((bz - i) / 3) * (1 + 0.05 * Math.sin(bz * 1.7 + i)), jitter: jr });
  }
  // "!" takes
  const takes = [[K.screenUp + 2, st.chipHead, 0.1], [K.screenUp + 3, st.pyHead, -0.12], [K.bugPeek + 1, st.pyHead, 0.12], [K.gape[0] + 9, st.giantHead, -0.1]];
  for (const [f, hd, rot] of takes) {
    const a = F - f; if (a < 0 || a > 16 || !hd) continue;
    const p = prj(ctx, hd.x + 0.12, hd.y + 0.34, hd.z), u = pxu(ctx, hd.x, hd.y, hd.z);
    if (!onScreen(p)) continue;
    const k = ob(a / 4) * (1 - sm((a - 12) / 4));
    bang(g, p.x + 0.12 * u, p.y, Math.min(130, (f === K.gape[0] + 9 ? 0.9 : 0.34) * u) * k, rot, jr);
  }
}
