// Guandan 3D table — Three.js/WebGL layer for events/guandan.html.
//
// Promoted from a standalone prototype (scratchpad, milestones 0-5, screenshot-verified with
// Playwright against captured real-game Firebase snapshots) into the init/sync/destroy/
// setEnabled contract this file exposes as window.Guandan3D, matching the same public-
// namespace convention window.GuandanRecords already established (guandan-records.js).
//
// This module is purely a local, read-only rendering choice: it never writes game state, never
// touches Firebase, and any failure anywhere in here must fall back live to the always-correct
// 2D table (guandan.html handles that by removing the .gd-3d-on class + hiding the canvas
// whenever init()/sync() throw or setEnabled(false) is called) — it must never throw in a way
// that could break the ~8000-line core game-logic script that calls into it.
//
// Real seat index (0-3, matches game.seats/hands/trickPlays array order) vs. VISUAL position
// (0-3, always 0=south/near-camera regardless of which real seat that is, per guandan.html's
// own visualSeatPos(i, mine) = (i - mine + 4) % 4) are two different things throughout this
// file. All 3D geometry (SEATS[], playedSlot(), stackSlot(), OPPONENT_CENTERS, turnRing/winRing
// placement) is indexed by VISUAL position; a small view-model step at the top of sync() maps
// real game data into visual order once, so everything below it stays index-0..3-means-visual,
// exactly like the original single-observer prototype.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ─────────────────────────────────────────────────────────────────────────
   COMPASS MAPPING (locked since the milestone-0 prototype):
     visual 0 = SOUTH  (+Z world axis) — nearest the camera, the local client's own seat
     visual 1 = WEST   (-X world axis)
     visual 2 = NORTH  (-Z world axis) — farthest from camera; always the partner seat
     visual 3 = EAST   (+X world axis)
   The camera rig sits south of the table (positive Z, beyond visual seat 0), elevated,
   looking north-ish across the table.
   ───────────────────────────────────────────────────────────────────────── */

// ── module state (all created/torn down by init()/destroy(), never at module top level) ──
let renderer = null, scene = null, camera = null, cardGroup = null, tableGroup = null;
let seatMeshes = [], turnRing = null, winRings = [];
let labelsContainer = null, labelEls = [];
let containerEl = null;
let initialized = false;
let enabled = false;
let contextLost = false;
let rafHandle = null;
let onResize = null, onContextLost = null;

// prefers-reduced-motion: new to this codebase (zero prior usage anywhere in guandan.html).
// The static table/cards/lighting aren't motion, so they stay; every *animation* (deal fly-in,
// sort-slide, play-flight, camera shake/zoom-tween, bomb/confetti particle bursts) checks this
// and jumps straight to its end state instead of skipping 3D rendering entirely.
let REDUCED_MOTION = false;
let reducedMotionMq = null;

function webglAvailable() {
    try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        return !!gl;
    } catch (_) {
        return false;
    }
}

/* ═══════════════════════════════════════════════════════════════════════
   init(container): builds the renderer/scene/camera/lighting/table/seats.
   Synchronous; throws on failure (caller in guandan.html wraps this in
   try/catch and never enables 3D if it throws). Idempotent — calling twice
   without an intervening destroy() just returns the existing state.
   ═══════════════════════════════════════════════════════════════════════ */
function init(container) {
    if (initialized) return true;
    if (!webglAvailable()) throw new Error('WebGL is not available in this browser.');

    containerEl = container || document.body;

    REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
        reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotionMq.addEventListener('change', (e) => { REDUCED_MOTION = e.matches; });
    } catch (_) {}

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    // DPR cap: address.html uses a flat min(devicePixelRatio, 2); this scene carries more live
    // geometry (27+ animated cards, particle bursts, PMREM env) than address.html's walkthrough,
    // and phones are both the tightest GPU budget and where a high DPR costs the most -- so
    // phones get a lower 1.5 cap. Measured via CDP CPU throttling in the prototype's milestone
    // 5 (~31-34% lower avg frame time at 1.5 vs 2.0 on a phone-sized viewport, both throttle
    // levels tested) -- see that milestone's report for the full numbers/caveats.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;pointer-events:none;transition:filter .4s ease;';
    containerEl.appendChild(renderer.domElement);

    // Deliberately no preventDefault() in the listener below: that would mark the context as
    // restorable and invite the browser to fire webglcontextrestored later. This module's job
    // on context loss is "fall back live to 2D", not "try to resurrect this WebGL context".
    onContextLost = () => {
        console.warn('[Guandan3D] webglcontextlost -- stopping the render loop and falling back to 2D.');
        setEnabled(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 200);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.AmbientLight(0xffffff, 0.48));
    scene.add(new THREE.HemisphereLight(0xdcefe6, 0x140f0a, 0.42));

    const keyLight = new THREE.DirectionalLight(0xfff0d2, 2.15);
    keyLight.position.set(4.2, 8.5, 4.8);
    keyLight.target.position.set(0, 0.1, -0.6);
    scene.add(keyLight, keyLight.target);

    const fillLight = new THREE.DirectionalLight(0xbfe0ff, 0.35);
    fillLight.position.set(-5, 5, -4);
    scene.add(fillLight);

    SEATS = buildSeatDefs(); // recompute in case the viewport width changed since a prior destroy()
    buildTable();
    buildSeatPlaques();
    buildSeatLabels();
    buildTurnRing();
    layoutCamera();
    preloadAllCardArt(); // fire-and-forget: warm the ~70-texture pool during lobby/seat-draft, before any deal starts

    cardGroup = new THREE.Group();
    scene.add(cardGroup);

    onResize = () => {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
        renderer.setSize(window.innerWidth, window.innerHeight);
        layoutCamera();
    };
    window.addEventListener('resize', onResize);

    initialized = true;
    contextLost = false;
    return true;
}

function pixelRatioCap() { return window.innerWidth < 500 ? 1.5 : 2; }

/* ═══════════════════════════════════════════════════════════════════════
   setEnabled(bool): toggles the canvas + render loop on/off. Does NOT
   dispose the scene (that's destroy()'s job) -- cheap to flip repeatedly.
   ═══════════════════════════════════════════════════════════════════════ */
function setEnabled(on) {
    enabled = !!on && initialized && !contextLost;
    if (renderer) renderer.domElement.style.display = enabled ? 'block' : 'none';
    if (labelsContainer) labelsContainer.style.display = enabled ? '' : 'none';
    document.documentElement.classList.toggle('gd-3d-on', enabled);
    if (enabled && rafHandle == null) {
        (function animate() {
            if (!enabled || contextLost) { rafHandle = null; return; }
            rafHandle = requestAnimationFrame(animate);
            // Keep scheduling frames even while the scene is hidden (lobby/seat-draft, see
            // setSceneVisible above), just skip the actual tick/draw work -- avoids spending
            // GPU time rendering a frame nothing will see, without tearing the loop down.
            if (!sceneVisible) return;
            tickDealAnimation();
            tickPlayAnimations();
            tickCameraEffects();
            tickBursts();
            renderer.render(scene, camera);
        })();
    } else if (!enabled && rafHandle != null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
    }
    if (!on) {
        // A user-visible failure/rollback should also clear anything transient (banner,
        // desaturation filter) so a later re-enable doesn't start from a stale visual state.
        if (renderer) renderer.domElement.style.filter = '';
        hideBanner();
    }
}

/* ═══════════════════════════════════════════════════════════════════════
   destroy(): full teardown -- disposes the renderer/scene, removes the
   canvas + label DOM, cancels the render loop and all listeners. Safe to
   call multiple times.
   ═══════════════════════════════════════════════════════════════════════ */
function destroy() {
    setEnabled(false);
    if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
    if (reducedMotionMq) { try { reducedMotionMq.removeEventListener('change', () => {}); } catch (_) {} reducedMotionMq = null; }
    if (renderer) {
        if (onContextLost) renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.remove();
        renderer.dispose();
    }
    if (labelsContainer) labelsContainer.remove();
    if (bannerEl) { bannerEl.remove(); bannerEl = null; }
    renderer = null; scene = null; camera = null; cardGroup = null; tableGroup = null;
    seatMeshes = []; turnRing = null; winRings = []; labelsContainer = null; labelEls = [];
    initialized = false;
    onContextLost = null;
    activeBursts.length = 0;
    dealAnim = null; activePlayFlights = {};
    activeGame = null; activeMeta = null;
    lastSeenPlayAt = { 0: 0, 1: 0, 2: 0, 3: 0 };
    lastCelebratedBombAt = 0;
    lastCelebratedRoundEndKey = '';
    sparkTex = null; confettiTex = null;
    sceneVisible = true;
}

/* ── canvas-texture helpers (no external image assets) ── */
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
function makeFeltTexture() {
    // matches this file's own :root felt palette: --felt-hi/#1c6b4a --felt-mid/#114331 --felt-lo/#0a2c20
    const s = 512;
    const c = makeCanvas(s, s);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(s * 0.5, s * 0.36, s * 0.05, s * 0.5, s * 0.5, s * 0.66);
    g.addColorStop(0, '#1c6b4a'); g.addColorStop(0.55, '#114331'); g.addColorStop(1, '#0a2c20');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 900; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    return c;
}
function makeWoodTexture() {
    const w = 512, h = 512;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#7a4a28'); g.addColorStop(0.5, '#5c3a21'); g.addColorStop(1, '#3b2415');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 34; i++) {
        const y = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.33, y + (Math.random() * 22 - 11), w * 0.66, y + (Math.random() * 22 - 11), w, y + (Math.random() * 12 - 6));
        ctx.stroke();
    }
    return c;
}
function makeSeatTexture(bg, compass) {
    const w = 512, h = 320;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    roundRectPath(ctx, 8, 8, w - 16, h - 16, 30); ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 7; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#101010';
    ctx.font = '800 72px Arial';
    ctx.fillText(compass, w / 2, 188);
    return c;
}

/* ── oval geometry helpers (Shape built in local XY, extruded along Z, then rotated flat) ──
   The oval is symmetric about both axes, so the rotateX(-90°) axis remap does not affect its
   footprint -- it stays a centered oval in world X/Z. */
function ovalPoints(rx, rz, segments = 128) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        pts.push([Math.cos(t) * rx, Math.sin(t) * rz]);
    }
    return pts;
}
function ovalShape(rx, rz) {
    const pts = ovalPoints(rx, rz);
    const shape = new THREE.Shape();
    pts.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
    return shape;
}
function ovalHolePath(rx, rz) {
    const pts = ovalPoints(rx, rz);
    const path = new THREE.Path();
    pts.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
    return path;
}

/* ── table dimensions ── */
const FELT_RX = 3.2, FELT_RZ = 2.6;
const RAIL_W = 0.46;
const RAIL_RX = FELT_RX + RAIL_W, RAIL_RZ = FELT_RZ + RAIL_W;
const FELT_H = 0.14, RAIL_H = 0.22;

function buildTable() {
    tableGroup = new THREE.Group();

    const feltTex = new THREE.CanvasTexture(makeFeltTexture()); feltTex.colorSpace = THREE.SRGBColorSpace;
    const feltCapMat = new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.92, metalness: 0.0 });
    const feltSideMat = new THREE.MeshStandardMaterial({ color: 0x0a2c20, roughness: 0.95, metalness: 0.0 });
    const feltGeo = new THREE.ExtrudeGeometry(ovalShape(FELT_RX, FELT_RZ), {
        depth: FELT_H, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 2, curveSegments: 128,
    });
    feltGeo.rotateX(-Math.PI / 2);
    tableGroup.add(new THREE.Mesh(feltGeo, [feltSideMat, feltCapMat]));

    const woodTex = new THREE.CanvasTexture(makeWoodTexture()); woodTex.colorSpace = THREE.SRGBColorSpace;
    const railCapMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.4, metalness: 0.08 });
    const railSideMat = new THREE.MeshStandardMaterial({ color: 0x3b2415, roughness: 0.55, metalness: 0.05 });
    const railShapeOuter = ovalShape(RAIL_RX, RAIL_RZ);
    railShapeOuter.holes.push(ovalHolePath(FELT_RX, FELT_RZ));
    const railGeo = new THREE.ExtrudeGeometry(railShapeOuter, {
        depth: RAIL_H, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 128,
    });
    railGeo.rotateX(-Math.PI / 2);
    tableGroup.add(new THREE.Mesh(railGeo, [railSideMat, railCapMat]));

    scene.add(tableGroup);

    const groundGeo = new THREE.CircleGeometry(14, 72);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x12100c, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    scene.add(ground);
}

/* ── seat plaques: visual markers at the 4 compass anchors. Real player names are a separate
   2D DOM overlay layer (buildSeatLabels/updateSeatLabels below), positioned via
   Vector3.project(camera) each sync -- avoids baking WebGL text for the bilingual L(en,zh)
   strings, per the plan. ── */
const PLAQUE_W = 1.05, PLAQUE_H = 0.62, PLAQUE_D = 0.10;
function seatGap() { return window.innerWidth < 500 ? 0.12 : 0.7; }
const SEAT_COLORS = ['#ffb020', '#38bdf8', '#ef4444', '#34d399'];
const SEAT_COMPASS = ['SOUTH', 'WEST', 'NORTH', 'EAST'];
function buildSeatDefs() {
    const gap = seatGap();
    return [
        { v: 0, compass: 'SOUTH', color: SEAT_COLORS[0], x: 0, z: RAIL_RZ + gap, faceOutward: true },
        { v: 1, compass: 'WEST', color: SEAT_COLORS[1], x: -(RAIL_RX + gap), z: 0 },
        { v: 2, compass: 'NORTH', color: SEAT_COLORS[2], x: 0, z: -(RAIL_RZ + gap) },
        { v: 3, compass: 'EAST', color: SEAT_COLORS[3], x: RAIL_RX + gap, z: 0 },
    ];
}
let SEATS = buildSeatDefs();

function buildSeatPlaques() {
    seatMeshes = SEATS.map((seat) => {
        const labelTex = new THREE.CanvasTexture(makeSeatTexture(seat.color, seat.compass));
        labelTex.colorSpace = THREE.SRGBColorSpace;
        const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.55, metalness: 0.05 });
        const flatMat = new THREE.MeshStandardMaterial({ color: seat.color, roughness: 0.6, metalness: 0.05 });
        const mats = [flatMat, flatMat, flatMat, flatMat, labelMat, flatMat];
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(PLAQUE_W, PLAQUE_H, PLAQUE_D), mats);
        mesh.position.set(seat.x, -0.03 + PLAQUE_H / 2, seat.z);
        mesh.rotation.y = seat.faceOutward ? Math.atan2(seat.x, seat.z) : Math.atan2(-seat.x, -seat.z);
        scene.add(mesh);
        return mesh;
    });
}

/* ── real player name labels: 2D DOM nodes positioned over the canvas each sync via
   Vector3.project(camera). Kept deliberately simple (name + a thinking/turn marker), not a
   full re-implementation of the 2D player card. ── */
function buildSeatLabels() {
    labelsContainer = document.createElement('div');
    labelsContainer.id = 'gd3d-labels';
    labelsContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;';
    containerEl.appendChild(labelsContainer);
    labelEls = [0, 1, 2, 3].map(() => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);padding:4px 10px;border-radius:8px;'
            + 'background:rgba(10,14,10,0.6);border:1px solid rgba(210,180,130,0.18);color:#f1e6cf;'
            + 'font:700 12px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;white-space:nowrap;'
            + 'backdrop-filter:blur(6px);display:none;';
        labelsContainer.appendChild(el);
        return el;
    });
}
// `vm` here is the seat-remapped view-model built by buildViewModel() (see near sync() below):
// vm.seats[v] / vm.currentTurn are already in VISUAL position (0=south/me .. 3=east), so this
// never needs to know the real seat-index <-> client mapping itself.
function updateSeatLabels(vm) {
    if (!labelEls.length || !camera || !renderer || !vm) return;
    const width = renderer.domElement.clientWidth || window.innerWidth;
    const height = renderer.domElement.clientHeight || window.innerHeight;
    for (let v = 0; v < 4; v++) {
        const el = labelEls[v];
        // Visual seat 0 (me) never gets a label, same convention as the real 2D playerHTML()
        // (which returns "" for i===mine) -- and seat 0's plaque projects to right around
        // where the always-visible 2D hand tray sits, so skipping it avoids visual clutter there.
        if (v === 0) { el.style.display = 'none'; continue; }
        const seat = vm.seats && vm.seats[v];
        if (!seat) { el.style.display = 'none'; continue; }
        const seatPos = SEATS[v];
        const worldPos = new THREE.Vector3(seatPos.x, 0.55, seatPos.z); // above the plaque
        const proj = worldPos.project(camera);
        if (proj.z > 1) { el.style.display = 'none'; continue; } // behind the camera
        const sx = (proj.x * 0.5 + 0.5) * width;
        const sy = (1 - (proj.y * 0.5 + 0.5)) * height;
        el.style.left = sx + 'px';
        el.style.top = sy + 'px';
        el.style.display = '';
        const rawName = seat.name || (seat.type === 'ai' ? 'AI' : `Seat ${v + 1}`);
        const label = v === 0 ? `${rawName} (You)` : rawName;
        const isTurn = v === vm.currentTurn;
        el.textContent = (isTurn ? '● ' : '') + label;
        el.style.color = isTurn ? '#ffd35a' : '#f1e6cf';
        el.style.borderColor = isTurn ? 'rgba(255,211,94,0.6)' : 'rgba(210,180,130,0.18)';
    }
}
function hideSeatLabels() { labelEls.forEach((el) => { el.style.display = 'none'; }); }

/* ── camera rig: elevated 3/4 view, frustum-fit so all 4 seat plaques always stay fully
   on-screen, tuned per viewport-width bucket. See the milestone-0/5 prototype reports for the
   derivation/measurement behind these specific numbers -- this is a direct port, not a re-tune. */
function elevationDegFor(w) { return w < 500 ? 55 : 32; }
const CAM_TARGET = new THREE.Vector3(0, 0.2, 0);
let camDirCam = new THREE.Vector3(0, 1, 0), camDist = 8, camZoomFactor = 0, camZoomAnim = null, camShakeAnim = null;

function collectFramePoints() {
    const pts = [];
    const hw = PLAQUE_W / 2, hh = PLAQUE_H / 2, hd = PLAQUE_D / 2;
    const localCorners = [];
    for (const sx of [-hw, hw]) for (const sy of [-hh, hh]) for (const sz of [-hd, hd]) localCorners.push(new THREE.Vector3(sx, sy, sz));
    seatMeshes.forEach((m) => {
        m.updateMatrixWorld(true);
        localCorners.forEach((lp) => pts.push(lp.clone().applyMatrix4(m.matrixWorld)));
    });
    [[RAIL_RX, 0, 0], [-RAIL_RX, 0, 0], [0, 0, RAIL_RZ], [0, 0, -RAIL_RZ]]
        .forEach(([x, y, z]) => pts.push(new THREE.Vector3(x, RAIL_H, z)));
    return pts;
}

function layoutCamera() {
    if (!camera) return;
    const w = window.innerWidth, h = window.innerHeight;
    const aspect = w / h;
    const fov = w < 500 ? 60 : (w <= 1000 ? 50 : 42);
    camera.fov = fov;
    camera.aspect = aspect;

    const vFov = THREE.MathUtils.degToRad(fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const tanV = Math.tan(vFov / 2), tanH = Math.tan(hFov / 2);

    const elevRad = THREE.MathUtils.degToRad(elevationDegFor(w));
    const dirCam = new THREE.Vector3(0, Math.sin(elevRad), Math.cos(elevRad)).normalize();
    const fwd = dirCam.clone().negate();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(fwd, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();

    let dist = 0;
    const rel = new THREE.Vector3();
    collectFramePoints().forEach((p) => {
        rel.copy(p).sub(CAM_TARGET);
        const x = rel.dot(right), y = rel.dot(up), zOff = rel.dot(fwd);
        const needed = Math.max(Math.abs(x) / tanH, Math.abs(y) / tanV) - zOff;
        if (needed > dist) dist = needed;
    });
    dist *= 1.08;

    camDirCam.copy(dirCam);
    camDist = dist;
    camZoomFactor = 0; camZoomAnim = null; camShakeAnim = null;
    camera.updateProjectionMatrix();
    applyCameraTransform();
}

function applyCameraTransform() {
    const pos = CAM_TARGET.clone().addScaledVector(camDirCam, camDist * (1 - camZoomFactor));
    if (camShakeAnim) {
        const age = performance.now() - camShakeAnim.startTime;
        if (age >= camShakeAnim.duration) {
            camShakeAnim = null;
        } else {
            const decay = 1 - age / camShakeAnim.duration;
            const mag = camShakeAnim.magnitude * decay * decay;
            pos.x += (prand(age * 0.021 + 3) - 0.5) * 2 * mag;
            pos.y += (prand(age * 0.037 + 11) - 0.5) * 2 * mag * 0.6;
            pos.z += (prand(age * 0.053 + 19) - 0.5) * 2 * mag;
        }
    }
    camera.position.copy(pos);
    camera.lookAt(CAM_TARGET);
}
function tickCameraEffects() {
    if (camZoomAnim) {
        const t = clamp01((performance.now() - camZoomAnim.startTime) / camZoomAnim.duration);
        camZoomFactor = THREE.MathUtils.lerp(camZoomAnim.from, camZoomAnim.to, easeOutCubic(t));
        if (t >= 1) camZoomAnim = null;
    }
    applyCameraTransform();
}
function triggerCameraZoom(toFactor, duration = 900) {
    if (REDUCED_MOTION) { camZoomFactor = toFactor; camZoomAnim = null; return; }
    camZoomAnim = { startTime: performance.now(), duration, from: camZoomFactor, to: toFactor };
}
function triggerCameraShake(magnitude = 0.22, duration = 480) {
    if (REDUCED_MOTION) return;
    camShakeAnim = { startTime: performance.now(), magnitude, duration };
}

function clamp01(t) { return Math.max(0, Math.min(1, t)); }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function prand(seed) { const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); }

/* ═══════════════════════════════════════════════════════════════════════
   Card texture pipeline. Real card-art + lab-portrait URLs are the EXACT
   same ones guandan.html's own cardAssetBase/Ranks/Suits (~line 3936) +
   cardAssetPath() (~line 4441) and guandan-records.js's AV base already
   use -- same-origin-friendly, verified CORS-open. Since art depends only
   on rank+suit, preloadAllCardArt() below warms the whole ~70-texture pool
   once during lobby/seat-draft, per the plan, instead of loading on demand
   mid-deal.
   ═══════════════════════════════════════════════════════════════════════ */
const CARD_ASSET_BASE = 'https://yil384.github.io/Picasso-Lab/events/static/playing-cards/';
const CARD_ASSET_RANKS = { A: 'ace', J: 'jack', Q: 'queen', K: 'king' };
const CARD_ASSET_SUITS = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const AVATAR_BASE = 'https://yil384.github.io/Picasso-Lab/people/static/';
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['S', 'H', 'D', 'C'];
function cardAssetURL(rank, suit) {
    const r = CARD_ASSET_RANKS[rank] || rank;
    const s = CARD_ASSET_SUITS[suit];
    return r && s ? `${CARD_ASSET_BASE}${r}_of_${s}.svg` : '';
}
function jokerAssetURL(joker) { return `${CARD_ASSET_BASE}${joker === 'RJ' ? 'red' : 'black'}_joker.svg`; }
const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_RED = { H: true, D: true };

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
const textureCache = new Map();
const cardLoadLog = { ok: [], failed: [] };
function loadCardTexture(url) {
    if (!url) return Promise.resolve(null);
    if (textureCache.has(url)) return Promise.resolve(textureCache.get(url));
    return new Promise((resolve) => {
        textureLoader.load(
            url,
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
                textureCache.set(url, tex);
                cardLoadLog.ok.push(url);
                resolve(tex);
            },
            undefined,
            (err) => {
                cardLoadLog.failed.push({ url, error: String((err && err.message) || err) });
                console.warn('[Guandan3D] texture failed to load:', url, err);
                resolve(null);
            }
        );
    });
}
function loadImageEl(url) {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { cardLoadLog.ok.push(url); resolve(img); };
        img.onerror = () => {
            cardLoadLog.failed.push({ url, error: 'portrait <img> onerror' });
            console.warn('[Guandan3D] portrait photo failed to load:', url);
            resolve(null);
        };
        img.src = url;
    });
}
function preloadAllCardArt() {
    const urls = [];
    for (const s of SUITS) for (const r of RANKS) urls.push(cardAssetURL(r, s));
    urls.push(jokerAssetURL('RJ'), jokerAssetURL('BJ'));
    Promise.all(urls.map(loadCardTexture)).then(() => {
        console.log('[Guandan3D] card art preload:', JSON.stringify({ ok: cardLoadLog.ok.length, failed: cardLoadLog.failed.length }));
    });
}

const CARD_W = 0.54, CARD_H = 0.75, CARD_T = 0.012;
const cardGeo = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T);
const cardEdgeMat = new THREE.MeshStandardMaterial({ color: 0xf1ead4, roughness: 0.75, metalness: 0.0 });

function drawCardBack(ctx, w, h) {
    ctx.fillStyle = '#1b1430';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(232,189,99,0.16)';
    ctx.lineWidth = 1;
    const step = w / 11;
    for (let gx = -h; gx < w + h; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0); ctx.lineTo(gx + h, h);
        ctx.moveTo(gx, h); ctx.lineTo(gx + h, 0);
        ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,211,94,0.5)';
    ctx.lineWidth = w * 0.014;
    ctx.strokeRect(w * 0.03, h * 0.03, w * 0.94, h * 0.94);
    const cx = w / 2, cy = h * 0.44, r = w * 0.155;
    const ring = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    ring.addColorStop(0, '#f6e3b4'); ring.addColorStop(1, '#c79a4b');
    ctx.fillStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = w * 0.012;
    ctx.strokeStyle = '#c79a4b';
    ctx.stroke();
    ctx.fillStyle = '#241703';
    ctx.font = `900 ${Math.round(r * 1.35)}px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('P', cx, cy + r * 0.06);
    ctx.fillStyle = 'rgba(255,224,150,0.85)';
    ctx.font = `900 ${Math.round(w * 0.05)}px Arial`;
    ctx.textAlign = 'center';
    ctx.save();
    try { ctx.letterSpacing = `${Math.round(w * 0.012)}px`; } catch (_) {}
    ctx.fillText('PICASSO', cx, cy + r * 1.55);
    ctx.fillText('LAB', cx, cy + r * 1.95);
    ctx.restore();
}
let cardBackMat = null;
function ensureCardBackMat() {
    if (cardBackMat) return cardBackMat;
    const canvas = makeCanvas(360, 504);
    drawCardBack(canvas.getContext('2d'), canvas.width, canvas.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    cardBackMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.03 });
    return cardBackMat;
}

const faceMatCache = new Map();
const jokerMatCache = new Map();
const fallbackFaceMat = new THREE.MeshStandardMaterial({ color: 0xf4efe0, roughness: 0.7 });
async function getFaceMaterial(rank, suit) {
    const url = cardAssetURL(rank, suit);
    if (!url) return fallbackFaceMat;
    if (faceMatCache.has(url)) return faceMatCache.get(url);
    const tex = await loadCardTexture(url);
    const mat = tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 }) : fallbackFaceMat;
    faceMatCache.set(url, mat);
    return mat;
}
async function getJokerMaterial(joker) {
    const url = jokerAssetURL(joker);
    if (jokerMatCache.has(url)) return jokerMatCache.get(url);
    const tex = await loadCardTexture(url);
    const mat = tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 }) : fallbackFaceMat;
    jokerMatCache.set(url, mat);
    return mat;
}

/* ── lab face-card portraits: VERBATIM port of guandan.html's own facePortraitMap()/
   faceCardPortrait() (confirmed lines 4448-4482 against the live file, including the exact
   16-key roster and the S/H/C/D iteration order -- kept identical rather than reusing this
   module's own SUITS=['S','H','D','C'] constant, so the round-robin fallback assignment order
   can never silently diverge from the real 2D game if guandan-records.js's roster ever
   changes). Each player's real signature card (guandan-records.js's PLAYERS[key].card, e.g.
   "A♠") is honored first; the remaining face slots are filled round-robin so every labmate
   appears and no face card is bare -- in practice today all 16 signature cards exactly cover
   A/K/Q/J x S/H/D/C, so the round-robin branch never actually fires. Reads
   window.GuandanRecords.PLAYERS directly (guandan-records.js is already loaded by
   guandan.html); if that data isn't present yet (script race, or genuinely unavailable),
   face cards just render as their plain real SVG art via getFaceMaterial -- never a crash. ── */
const portraitMatCache = new Map(); // "rank+suit" -> material, rebuilt if the underlying map changes
let _facePortraitMap = null;
function facePortraitMap() {
    if (_facePortraitMap) return _facePortraitMap;
    const PL = (window.GuandanRecords && window.GuandanRecords.PLAYERS) || {};
    // All 16 PICASSO Lab members get a face card (A♠→J♣); external opponents (zihan, yilin) are excluded.
    const keys = ['yufei', 'yue', 'zhengding', 'chang', 'hezi', 'keyi', 'xiang', 'jixuan', 'zaifeng', 'zhongkai', 'zhuo', 'yichen', 'xinwei', 'alon', 'chenyang', 'haotian']
        .filter((k) => PL[k] && PL[k].avatar);
    if (!keys.length) return {};
    const sig = {};
    keys.forEach((k) => { if (PL[k].card) sig[PL[k].card] = k; });
    const FACE_RANKS = ['A', 'K', 'Q', 'J'];
    const FACE_SUITS = ['S', 'H', 'C', 'D']; // matches guandan.html's facePortraitMap() exactly, not this module's own SUITS order
    const map = {};
    const leftover = [];
    FACE_RANKS.forEach((r) => FACE_SUITS.forEach((s) => {
        const str = r + (SUIT_GLYPH[s] || '');
        if (sig[str]) map[r + s] = sig[str]; else leftover.push(r + s);
    }));
    let i = 0;
    leftover.forEach((slot) => { map[slot] = keys[i % keys.length]; i++; });
    _facePortraitMap = map;
    return map;
}
function faceCardPortrait(rank, suit) {
    if (!['A', 'K', 'Q', 'J'].includes(rank)) return null;
    const PL = (window.GuandanRecords && window.GuandanRecords.PLAYERS) || {};
    const key = facePortraitMap()[rank + suit];
    const p = key && PL[key];
    if (!p || !p.avatar) return null;
    return { avatar: p.avatar, name: (p.name || '').split(' ')[0] };
}

async function buildPortraitFaceMaterial(rank, suit, avatarUrl, name) {
    const [artTex, photo] = await Promise.all([loadCardTexture(cardAssetURL(rank, suit)), loadImageEl(avatarUrl)]);
    const w = 480, h = 672;
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4efe0';
    ctx.fillRect(0, 0, w, h);
    if (artTex && artTex.image) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        try { ctx.drawImage(artTex.image, w * 0.08, h * 0.06, w * 0.84, h * 0.88); } catch (_) {}
        ctx.restore();
    }
    ctx.strokeStyle = 'rgba(176,138,46,0.65)';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    const red = !!SUIT_RED[suit];
    const ink = red ? '#961c28' : '#17181d';
    const glyph = SUIT_GLYPH[suit] || '';
    function corner(x, y, flip) {
        ctx.save();
        ctx.translate(x, y);
        if (flip) ctx.rotate(Math.PI);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 3;
        roundRectPath(ctx, -46, -42, 92, 104, 14);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.font = '900 62px Arial';
        ctx.fillText(rank, 0, 10);
        ctx.font = '900 42px Arial';
        ctx.fillText(glyph, 0, 52);
        ctx.restore();
    }
    corner(52, 66, false);
    corner(w - 52, h - 66, true);
    if (photo) {
        const r = w * 0.30, cx = w / 2, cy = h * 0.46;
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        const side = Math.min(photo.width, photo.height);
        const sx = (photo.width - side) / 2, sy = 0;
        ctx.drawImage(photo, sx, sy, side, side, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(190,150,50,0.9)'; ctx.stroke();
    }
    ctx.fillStyle = red ? 'rgba(150,28,40,0.85)' : 'rgba(30,22,8,0.78)';
    ctx.font = '800 29px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(name, w / 2, h * 0.82);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 });
}

async function faceMaterialForCard(card) {
    if (card.joker) return getJokerMaterial(card.joker);
    const portrait = faceCardPortrait(card.rank, card.suit);
    if (portrait) {
        const key = card.rank + card.suit;
        if (portraitMatCache.has(key)) return portraitMatCache.get(key);
        const mat = await buildPortraitFaceMaterial(card.rank, card.suit, portrait.avatar, portrait.name);
        portraitMatCache.set(key, mat);
        return mat;
    }
    return getFaceMaterial(card.rank, card.suit);
}

function buildCardMesh(topMat) {
    const mats = [cardEdgeMat, cardEdgeMat, cardEdgeMat, cardEdgeMat, topMat, ensureCardBackMat()];
    return new THREE.Mesh(cardGeo, mats);
}
const FLAT_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
function flatYawQuaternion(yawRad) {
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRad);
    return yawQ.multiply(FLAT_Q);
}
function cardQuaternion(yawRad, flipRad) {
    const flipQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), flipRad);
    const laid = FLAT_Q.clone().multiply(flipQ);
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRad);
    return yawQ.multiply(laid);
}

/* ═══════════════════════════════════════════════════════════════════════
   Slot geometry + resting-layout builders. Ported verbatim from the
   prototype: every index here (0-3) is a VISUAL position (0=south/near
   camera/me .. 3=east), matching SEATS[]. The seat-remapping adapter below
   (buildViewModel) is what converts real `game` seat indices into this
   space -- these functions never see a real seat index directly.
   ═══════════════════════════════════════════════════════════════════════ */
const CARD_Y0 = FELT_H + CARD_T / 2 + 0.015;

function handSlot(i, n) {
    const FAN_STEP_DEG = n > 1 ? THREE.MathUtils.clamp(130 / (n - 1), 5, 9.5) : 0;
    const FAN_RADIUS = 2.1;
    const pivotZ = 2.0;
    const a = (i - (n - 1) / 2) * FAN_STEP_DEG;
    const rad = THREE.MathUtils.degToRad(a);
    return { x: Math.sin(rad) * FAN_RADIUS, y: CARD_Y0 + i * CARD_T * 0.7, z: pivotZ, yaw: rad };
}
function stackSlot(center, i, seed) {
    const jx = (prand(seed + i * 3.1) - 0.5) * 0.05;
    const jz = (prand(seed + i * 7.7) - 0.5) * 0.05;
    const jyaw = (prand(seed + i * 5.3) - 0.5) * THREE.MathUtils.degToRad(8);
    return { x: center.x + jx, y: CARD_Y0 + i * CARD_T * 0.85, z: center.z + jz, yaw: jyaw };
}
function playedSlot(seatIndex, i, n) {
    const seat = SEATS[seatIndex];
    const factor = seatIndex === 0 ? 0.28 : 0.5;
    const cx = seat.x * factor, cz = seat.z * factor;
    const yaw = Math.atan2(-seat.x, -seat.z);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(flatYawQuaternion(yaw));
    const spacing = 0.3;
    const off = (i - (n - 1) / 2) * spacing;
    return { x: cx + rightDir.x * off, y: CARD_Y0 + i * CARD_T * 0.6, z: cz + rightDir.z * off, yaw };
}

async function buildHandFan(cards) {
    const n = cards.length;
    if (!n) return;
    const faceMats = await Promise.all(cards.map(faceMaterialForCard));
    faceMats.forEach((mat, i) => {
        const slot = handSlot(i, n);
        const mesh = buildCardMesh(mat);
        mesh.position.set(slot.x, slot.y, slot.z);
        mesh.quaternion.copy(flatYawQuaternion(slot.yaw));
        mesh.userData = { kind: 'hand', seat: 0, i, card: cards[i] };
        cardGroup.add(mesh);
    });
}
const OPPONENT_CENTERS = { 1: { x: -2.0, z: 0 }, 2: { x: 0, z: -2.0 }, 3: { x: 2.0, z: 0 } };
function buildOpponentStack(center, count, seed, seatIndex) {
    for (let i = 0; i < count; i++) {
        const slot = stackSlot(center, i, seed);
        const mesh = buildCardMesh(ensureCardBackMat());
        mesh.position.set(slot.x, slot.y, slot.z);
        mesh.quaternion.copy(flatYawQuaternion(slot.yaw));
        mesh.userData = { kind: 'oppstack', seat: seatIndex, i };
        cardGroup.add(mesh);
    }
}
async function buildPlayedCards(seatIndex, entry) {
    if (!entry || entry.actionType !== 'combo' || !entry.cards || !entry.cards.length) return;
    const cards = entry.cards;
    const n = cards.length;
    const faceMats = await Promise.all(cards.map(faceMaterialForCard));
    faceMats.forEach((mat, i) => {
        const slot = playedSlot(seatIndex, i, n);
        const mesh = buildCardMesh(mat);
        mesh.position.set(slot.x, slot.y, slot.z);
        mesh.quaternion.copy(flatYawQuaternion(slot.yaw));
        mesh.userData = { kind: 'played', seat: seatIndex, i, card: cards[i] };
        cardGroup.add(mesh);
    });
}
// IMPORTANT DEPARTURE FROM THE PROTOTYPE: the resting layout never builds a 3D fan for
// visual seat 0 (the local player's own hand). The plan requires the player's own hand to
// stay real 2D DOM (native drag-and-drop reordering, aria-labels) -- `.hand-zone` is kept
// `visibility:visible` even under `.gd-3d-on` for exactly that reason. A resting 3D fan
// drawn at the same seat would just be a confusing duplicate sitting behind/under the real
// interactive tray. (The prototype *did* render seat 0's hand at rest because it was a
// single-observer snapshot tool with no real 2D hand tray to conflict with -- that
// assumption doesn't carry over here.) buildDealAnimation() below still flies seat 0's
// cards in 3D during the dealing/sorting window, matching what the suppressed 2D
// `.deal-overlay` animation used to show; finalizeAfterDeal() then calls this function,
// which is exactly the moment the 3D hand should disappear and the 2D tray takes over.
async function buildStaticTable(vm, opts = {}) {
    const skipPlayed = opts.skipPlayedSeats || new Set();
    const jobs = [];
    [1, 2, 3].forEach((seat) => {
        const count = (vm.hands?.[seat] || []).length;
        buildOpponentStack(OPPONENT_CENTERS[seat], count, seat * 97 + 11, seat);
    });
    [0, 1, 2, 3].forEach((seat) => {
        if (skipPlayed.has(seat)) return;
        jobs.push(buildPlayedCards(seat, vm.trickPlays?.[seat]));
    });
    await Promise.all(jobs);
}

function buildTurnRing() {
    turnRing = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.72, 48),
        new THREE.MeshStandardMaterial({ color: 0xffd35a, emissive: 0xffb020, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.88 })
    );
    turnRing.rotation.x = -Math.PI / 2;
    turnRing.visible = false;
    scene.add(turnRing);
}
function updateTurnRing(currentTurn) {
    if (!turnRing) return;
    if (!Number.isInteger(currentTurn) || currentTurn < 0 || currentTurn > 3) { turnRing.visible = false; return; }
    const seat = SEATS[currentTurn];
    turnRing.position.set(seat.x, -0.02, seat.z);
    turnRing.visible = true;
}

/* ═══════════════════════════════════════════════════════════════════════
   Wall-clock-driven deal/sort/play animation, ported verbatim from the
   prototype (same DEALING_MS/SORTING_MS anchors as guandan.html's own
   dealAnimation machinery, so multiple independent clients converge on the
   identical phase). Operates on `vm` (visual-position-indexed), same as
   the static builders above.
   ═══════════════════════════════════════════════════════════════════════ */
const DEALING_MS = 2800;
const SORTING_MS = 980;
const DEAL_CARD_FLIGHT_MS = 260;
const SORT_CARD_MS = 420;
const PLAY_FLIGHT_MS = 520;
const DECK_POS = { x: 0, y: FELT_H + CARD_T * 4, z: 0.4 };

function dealPhaseFor(vm) {
    const startedAt = Number(vm?.dealStartedAt) || 0;
    if (!startedAt || vm?.phase !== 'playing') return { phase: 'done', elapsed: Infinity };
    const elapsed = Math.max(0, Date.now() - startedAt);
    const total = DEALING_MS + SORTING_MS;
    if (elapsed >= total) return { phase: 'done', elapsed };
    if (elapsed < DEALING_MS) return { phase: 'dealing', elapsed };
    return { phase: 'sorting', elapsed };
}

let dealAnim = null;
let activeGame = null, activeMeta = null;

async function buildDealAnimation(vm) {
    const southCardsData = vm.hands?.[0] || [];
    const n = southCardsData.length;

    const deckGroup = new THREE.Group();
    const deckCount = Math.min(14, Math.max(3, Math.round(n / 2)));
    for (let i = 0; i < deckCount; i++) {
        const m = buildCardMesh(ensureCardBackMat());
        m.position.set(DECK_POS.x, DECK_POS.y - i * CARD_T * 0.9, DECK_POS.z);
        m.quaternion.copy(flatYawQuaternion(0));
        deckGroup.add(m);
    }
    cardGroup.add(deckGroup);

    const faceMats = await Promise.all(southCardsData.map(faceMaterialForCard));
    const southCards = faceMats.map((mat, i) => {
        const finalSlot = handSlot(i, n);
        const rawSlot = handSlot(n - 1 - i, n);
        const mesh = buildCardMesh(mat);
        cardGroup.add(mesh);
        const flightStart = n > 1 ? (i / n) * (DEALING_MS - DEAL_CARD_FLIGHT_MS) : 0;
        const sortStart = n > 1 ? (i / n) * (SORTING_MS - SORT_CARD_MS) : 0;
        return { mesh, finalSlot, rawSlot, flightStart, flightEnd: flightStart + DEAL_CARD_FLIGHT_MS, sortStart, sortEnd: sortStart + SORT_CARD_MS };
    });

    const oppCards = { 1: [], 2: [], 3: [] };
    [1, 2, 3].forEach((seat) => {
        const count = (vm.hands?.[seat] || []).length;
        const seed = seat * 97 + 11;
        for (let i = 0; i < count; i++) {
            const finalSlot = stackSlot(OPPONENT_CENTERS[seat], i, seed);
            const mesh = buildCardMesh(ensureCardBackMat());
            cardGroup.add(mesh);
            const flightStart = count > 1 ? (i / count) * (DEALING_MS - DEAL_CARD_FLIGHT_MS) : 0;
            oppCards[seat].push({ mesh, finalSlot, flightStart, flightEnd: flightStart + DEAL_CARD_FLIGHT_MS });
        }
    });

    dealAnim = { southCards, oppCards, deckGroup };
    tickDealAnimation();
}

function tickDealAnimation() {
    if (!dealAnim || !activeGame) return;
    const { phase, elapsed } = dealPhaseFor(activeGame);
    if (phase === 'done') { finalizeAfterDeal(); return; }

    dealAnim.southCards.forEach(({ mesh, rawSlot, finalSlot, flightStart, flightEnd, sortStart, sortEnd }) => {
        if (phase === 'dealing') {
            const t = easeOutCubic(clamp01((elapsed - flightStart) / (flightEnd - flightStart)));
            mesh.position.set(
                THREE.MathUtils.lerp(DECK_POS.x, rawSlot.x, t),
                THREE.MathUtils.lerp(DECK_POS.y, rawSlot.y, t) + Math.sin(t * Math.PI) * 0.45,
                THREE.MathUtils.lerp(DECK_POS.z, rawSlot.z, t)
            );
            mesh.quaternion.copy(cardQuaternion(rawSlot.yaw, THREE.MathUtils.lerp(Math.PI, 0, t)));
        } else {
            const sortElapsed = elapsed - DEALING_MS;
            const t = easeOutCubic(clamp01((sortElapsed - sortStart) / (sortEnd - sortStart)));
            mesh.position.set(
                THREE.MathUtils.lerp(rawSlot.x, finalSlot.x, t),
                THREE.MathUtils.lerp(rawSlot.y, finalSlot.y, t),
                THREE.MathUtils.lerp(rawSlot.z, finalSlot.z, t)
            );
            mesh.quaternion.copy(cardQuaternion(THREE.MathUtils.lerp(rawSlot.yaw, finalSlot.yaw, t), 0));
        }
    });

    [1, 2, 3].forEach((seat) => {
        dealAnim.oppCards[seat].forEach(({ mesh, finalSlot, flightStart, flightEnd }) => {
            if (phase === 'sorting') {
                mesh.position.set(finalSlot.x, finalSlot.y, finalSlot.z);
                mesh.quaternion.copy(flatYawQuaternion(finalSlot.yaw));
                return;
            }
            const t = easeOutCubic(clamp01((elapsed - flightStart) / (flightEnd - flightStart)));
            mesh.position.set(
                THREE.MathUtils.lerp(DECK_POS.x, finalSlot.x, t),
                THREE.MathUtils.lerp(DECK_POS.y, finalSlot.y, t) + Math.sin(t * Math.PI) * 0.35,
                THREE.MathUtils.lerp(DECK_POS.z, finalSlot.z, t)
            );
            mesh.quaternion.copy(flatYawQuaternion(finalSlot.yaw));
        });
    });
}

function finalizeAfterDeal() {
    if (!dealAnim) return;
    cardGroup.remove(dealAnim.deckGroup);
    dealAnim.southCards.forEach(({ mesh }) => cardGroup.remove(mesh));
    [1, 2, 3].forEach((seat) => dealAnim.oppCards[seat].forEach(({ mesh }) => cardGroup.remove(mesh)));
    dealAnim = null;
    if (activeGame) buildStaticTable(activeGame);
}

let lastSeenPlayAt = { 0: 0, 1: 0, 2: 0, 3: 0 };
let activePlayFlights = {};

function detectNewPlays(vm) {
    const skip = new Set();
    [0, 1, 2, 3].forEach((seat) => {
        const entry = vm.trickPlays?.[seat];
        if (!entry || entry.actionType !== 'combo' || !entry.cards?.length) {
            lastSeenPlayAt[seat] = 0;
            return;
        }
        const at = Number(entry.at) || 0;
        if (!at || at === lastSeenPlayAt[seat]) return;
        lastSeenPlayAt[seat] = at;
        if (!REDUCED_MOTION && Date.now() - at < PLAY_FLIGHT_MS) {
            skip.add(seat);
            startPlayFlight(seat, entry, at);
        }
    });
    return skip;
}

async function startPlayFlight(seatIndex, entry, at) {
    const cards = entry.cards;
    const n = cards.length;
    const seat = SEATS[seatIndex];
    const faceMats = await Promise.all(cards.map(faceMaterialForCard));
    const meshes = faceMats.map((mat, i) => {
        const mesh = buildCardMesh(mat);
        mesh.position.set(seat.x, CARD_Y0, seat.z);
        cardGroup.add(mesh);
        return { mesh, toSlot: playedSlot(seatIndex, i, n), needsFlip: seatIndex !== 0 };
    });
    activePlayFlights[seatIndex] = { entry, at, meshes };
}

function tickPlayAnimations() {
    Object.keys(activePlayFlights).forEach((key) => {
        const seat = Number(key);
        const flight = activePlayFlights[seat];
        if (!flight) return;
        const fromSeat = SEATS[seat];
        const t = clamp01((Date.now() - flight.at) / PLAY_FLIGHT_MS);
        const te = easeOutCubic(t);
        flight.meshes.forEach(({ mesh, toSlot, needsFlip }) => {
            mesh.position.set(
                THREE.MathUtils.lerp(fromSeat.x, toSlot.x, te),
                THREE.MathUtils.lerp(CARD_Y0, toSlot.y, te) + Math.sin(te * Math.PI) * 0.3,
                THREE.MathUtils.lerp(fromSeat.z, toSlot.z, te)
            );
            mesh.quaternion.copy(cardQuaternion(toSlot.yaw, needsFlip ? THREE.MathUtils.lerp(Math.PI, 0, te) : 0));
        });
        if (t >= 1) {
            flight.meshes.forEach(({ mesh }) => cardGroup.remove(mesh));
            delete activePlayFlights[seat];
            buildPlayedCards(seat, flight.entry);
        }
    });
}

/* ═══════════════════════════════════════════════════════════════════════
   Bomb celebration + win/lose moment. Same "diff a shared timestamp,
   guard with a last-seen scalar, fire exactly once" idiom as guandan.html's
   own maybeCelebrateBomb()/latestTrickPlayAt().
   ═══════════════════════════════════════════════════════════════════════ */
const activeBursts = [];
function makeCircleSprite(hex) {
    const c = makeCanvas(64, 64);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, hex); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
    return c;
}
function makeRectSprite() {
    const c = makeCanvas(48, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(4, 2, 40, 60);
    return c;
}
let sparkTex = null, confettiTex = null;
function ensureParticleTextures() {
    if (!sparkTex) { sparkTex = new THREE.CanvasTexture(makeCircleSprite('#ffe9b0')); }
    if (!confettiTex) { confettiTex = new THREE.CanvasTexture(makeRectSprite()); }
}
function spawnParticles({ count, texture, size, colors, gravity, lifetime, blending, originFn, velocityFn }) {
    const positions = new Float32Array(count * 3);
    const colorAttr = new Float32Array(count * 3);
    const velocities = [];
    const tmpColor = new THREE.Color();
    for (let i = 0; i < count; i++) {
        const o = originFn(i);
        positions[i * 3] = o.x; positions[i * 3 + 1] = o.y; positions[i * 3 + 2] = o.z;
        velocities.push(velocityFn(i));
        tmpColor.set(colors[i % colors.length]);
        colorAttr[i * 3] = tmpColor.r; colorAttr[i * 3 + 1] = tmpColor.g; colorAttr[i * 3 + 2] = tmpColor.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    const mat = new THREE.PointsMaterial({
        map: texture, size, sizeAttenuation: true, transparent: true, depthWrite: false,
        vertexColors: true, blending: blending || THREE.NormalBlending,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    activeBursts.push({ points, velocities, gravity, lifetime, startTime: performance.now(), lastTick: performance.now() });
}
function tickBursts() {
    const now = performance.now();
    for (let bi = activeBursts.length - 1; bi >= 0; bi--) {
        const b = activeBursts[bi];
        const age = now - b.startTime;
        if (age > b.lifetime) {
            scene.remove(b.points); b.points.geometry.dispose(); b.points.material.dispose();
            activeBursts.splice(bi, 1);
            continue;
        }
        const dt = Math.min(0.05, (now - b.lastTick) / 1000);
        b.lastTick = now;
        const pos = b.points.geometry.attributes.position.array;
        for (let i = 0; i < b.velocities.length; i++) {
            b.velocities[i].y -= b.gravity * dt;
            pos[i * 3] += b.velocities[i].x * dt;
            pos[i * 3 + 1] += b.velocities[i].y * dt;
            pos[i * 3 + 2] += b.velocities[i].z * dt;
        }
        b.points.geometry.attributes.position.needsUpdate = true;
        const lifeFrac = age / b.lifetime;
        b.points.material.opacity = lifeFrac < 0.65 ? 1 : Math.max(0, 1 - (lifeFrac - 0.65) / 0.35);
    }
}

// Banner is a small fixed 2D DOM node this module owns entirely (not part of the
// live 2D game DOM under #root, so it's unaffected by every Firebase-tick rebuild).
let bannerEl = null;
function ensureBanner() {
    if (bannerEl) return bannerEl;
    bannerEl = document.createElement('div');
    bannerEl.style.cssText = 'position:fixed;left:50%;top:14%;transform:translate(-50%,-12px);'
        + 'padding:10px 26px;border-radius:14px;font:900 22px/1.2 Georgia,serif;letter-spacing:.04em;'
        + 'color:#241703;background:linear-gradient(135deg,#f6e3b4,#e8bd63);box-shadow:0 12px 30px rgba(0,0,0,.35);'
        + 'opacity:0;transition:opacity .25s ease, transform .25s ease;z-index:6;pointer-events:none;white-space:nowrap;';
    (containerEl || document.body).appendChild(bannerEl);
    return bannerEl;
}
function showBanner(text, kind) {
    const el = ensureBanner();
    el.textContent = text;
    if (kind === 'lose') { el.style.background = 'linear-gradient(135deg,#8a5f18,#5b3a22)'; el.style.color = '#f1e6cf'; }
    else if (kind === 'win') { el.style.background = 'linear-gradient(135deg,#fff3d0,#f6e3b4)'; el.style.color = '#241703'; }
    else { el.style.background = 'linear-gradient(135deg,#f6e3b4,#e8bd63)'; el.style.color = '#241703'; }
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%,0)';
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-12px)'; }, 1600);
}
function hideBanner() {
    if (!bannerEl) return;
    clearTimeout(showBanner._t);
    bannerEl.style.opacity = '0';
    bannerEl.style.transform = 'translate(-50%,-12px)';
}

function triggerBombCelebration(seatIndex, combo, cardCount) {
    triggerCameraShake(0.22, 480);
    if (!REDUCED_MOTION) {
        ensureParticleTextures();
        const n = Math.max(1, cardCount);
        const centerSlot = playedSlot(seatIndex, (n - 1) / 2, n);
        const origin = new THREE.Vector3(centerSlot.x, CARD_Y0 + 0.08, centerSlot.z);
        spawnParticles({
            count: 28, texture: sparkTex, size: 0.34,
            colors: [0xe8bd63, 0xf6e3b4],
            gravity: 3.2, lifetime: 950, blending: THREE.AdditiveBlending,
            originFn: () => origin,
            velocityFn: (i) => {
                const angle = prand(i * 7.13 + 1) * Math.PI * 2;
                const speedXZ = 0.9 + prand(i * 11.7 + 2) * 1.6;
                const speedY = 1.6 + prand(i * 17.3 + 3) * 2.0;
                return new THREE.Vector3(Math.cos(angle) * speedXZ, speedY, Math.sin(angle) * speedXZ);
            },
        });
    }
    const label = combo.type === 'jokerBomb' ? '天王炸!'
        : combo.bombLen >= 8 ? '八张炸弹!' : combo.bombLen >= 6 ? '六张炸弹!' : 'BOMB!';
    showBanner(label, 'bomb');
}
let lastCelebratedBombAt = 0;
function maybeCelebrateBomb(vm) {
    const trick = Array.isArray(vm.trickPlays) ? vm.trickPlays : [];
    const latestAt = Math.max(0, ...trick.map((e) => Number(e?.at) || 0));
    if (!latestAt || latestAt === lastCelebratedBombAt) return;
    const seatIndex = trick.findIndex((e) => e && Number(e.at) === latestAt);
    const entry = trick[seatIndex];
    lastCelebratedBombAt = latestAt;
    if (!entry || entry.actionType === 'pass' || !entry.combo?.isBomb) return;
    triggerBombCelebration(seatIndex, entry.combo, entry.cards?.length || 1);
}

function ensureWinRings() {
    if (winRings.length) return;
    winRings = [0, 1].map(() => {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.62, 0.82, 48),
            new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xe8bd63, emissiveIntensity: 1.1, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.visible = false;
        scene.add(ring);
        return ring;
    });
}
function hideWinRings() { winRings.forEach((r) => { r.visible = false; }); }
function showWinRingsFor(winningTeamVisual) {
    ensureWinRings();
    const seatsForTeam = [0, 1, 2, 3].filter((s) => s % 2 === winningTeamVisual);
    seatsForTeam.forEach((s, i) => {
        const ring = winRings[i];
        if (!ring) return;
        const seat = SEATS[s];
        ring.position.set(seat.x, -0.02, seat.z);
        ring.visible = true;
    });
}
function triggerRoundEndCelebration(isWin, winningTeamVisual) {
    triggerCameraZoom(0.22, 900);
    showWinRingsFor(winningTeamVisual);
    if (isWin) {
        if (renderer) renderer.domElement.style.filter = '';
        if (!REDUCED_MOTION) {
            ensureParticleTextures();
            spawnParticles({
                count: 28, texture: confettiTex, size: 0.34,
                colors: [0xe8bd63, 0xe8bd63, 0xe8bd63, 0xf6e3b4, 0x6fae9c],
                gravity: 1.6, lifetime: 2400, blending: THREE.NormalBlending,
                originFn: () => new THREE.Vector3((prand(Math.random() * 999) - 0.5) * 5.5, 3.4 + prand(Math.random() * 999) * 1.2, (prand(Math.random() * 999) - 0.5) * 4.2),
                velocityFn: () => new THREE.Vector3((Math.random() - 0.5) * 0.9, -0.2, (Math.random() - 0.5) * 0.6),
            });
        }
        showBanner('YOUR TEAM WINS!', 'win');
    } else {
        if (renderer) renderer.domElement.style.filter = 'saturate(0.35) brightness(0.92)';
        showBanner('ROUND LOST', 'lose');
    }
}
let lastCelebratedRoundEndKey = '';
function maybeCelebrateRoundEnd(vm) {
    if (vm.phase !== 'roundOver' && vm.phase !== 'gameOver') return;
    const at = Number(vm.updatedAt) || 0;
    const key = `${vm.roundNo || 0}:${vm.phase}:${at}`;
    if (key === lastCelebratedRoundEndKey) return;
    lastCelebratedRoundEndKey = key;
    // Winning team here is expressed in REAL team parity (0/1), same as guandan.html's own
    // firstTeam/leaderTeam -- but vm.seats[] is visual-position-indexed, so vm.seats[0] (me)
    // reliably gives "my" team regardless of which real seat I actually occupy.
    const winningRealTeam = Number.isInteger(vm.roundResult?.firstTeam) ? vm.roundResult.firstTeam : vm.leaderTeam;
    const myTeam = vm.seats?.[0]?.team;
    const isWin = Number.isInteger(winningRealTeam) && Number.isInteger(myTeam) && winningRealTeam === myTeam;
    // Convert the real team parity into "which VISUAL seats get a ring": a seat's visual
    // position parity matches its real-seat parity only when mySeat is even, so derive it
    // from vm.seats[] directly instead of assuming parity carries over.
    const winningVisualTeam = [0, 1, 2, 3].find((v) => vm.seats?.[v]?.team === winningRealTeam) != null
        ? ([0, 1, 2, 3].filter((v) => vm.seats?.[v]?.team === winningRealTeam)[0] % 2)
        : winningRealTeam;
    triggerRoundEndCelebration(isWin, winningVisualTeam);
}

/* ═══════════════════════════════════════════════════════════════════════
   Seat-remapping adapter -- NOT present in the standalone prototype at all.
   The prototype was a single-observer snapshot tool that hardcoded "seat 0
   is always mine". The real live game has 4 independent clients, each of
   whom must see themselves at visual position 0 (south/near camera) and
   their partner opposite at position 2, regardless of which real seat
   index they actually occupy in game.seats/hands/trickPlays. This is the
   one seam every other ported function above is written to sit behind:
   they all consume `vm` (visual-position-indexed) and never see a real
   seat index except where the game state legitimately carries a real
   team parity (roundResult.firstTeam/leaderTeam), which maybeCelebrateRoundEnd
   converts explicitly above.
   ═══════════════════════════════════════════════════════════════════════ */
function computeMySeat(game) {
    if (!game || !Array.isArray(game.seats)) return -1;
    let cid = null;
    try { cid = localStorage.getItem('picasso.guandan.client'); } catch (_) { cid = null; }
    if (!cid) return -1;
    return game.seats.findIndex((s) => s && s.clientId === cid);
}
function visualSeatPos(realSeat, mine) {
    return mine >= 0 ? ((realSeat - mine + 4) % 4) : realSeat;
}
function realSeatAtVisual(visualPos, mine) {
    return mine >= 0 ? ((visualPos + mine) % 4) : visualPos;
}
function buildViewModel(game, mySeat) {
    const vm = Object.assign({}, game, { mySeat });
    const hands = [[], [], [], []], trickPlays = [null, null, null, null], seats = [null, null, null, null];
    for (let v = 0; v < 4; v++) {
        const real = realSeatAtVisual(v, mySeat);
        hands[v] = (game.hands && game.hands[real]) || [];
        trickPlays[v] = (game.trickPlays && game.trickPlays[real]) || null;
        seats[v] = (game.seats && game.seats[real]) || null;
    }
    vm.hands = hands;
    vm.trickPlays = trickPlays;
    vm.seats = seats;
    vm.currentTurn = Number.isInteger(game.currentTurn) ? visualSeatPos(game.currentTurn, mySeat) : -1;
    return vm;
}

/* ── sync(game, meta): the single entry point called from guandan.html's render(). Clears
   the table and rebuilds it from a normalized, seat-remapped view of the current game
   snapshot. If a deal is in its wall-clock window, hands off to the animation system above
   instead of drawing the static resting layout. Never throws -- any internal failure here
   must fall back live to 2D per the plan, so the caller wraps this in try/catch, and this
   function additionally guards its own top level so a single bad frame can't wedge the
   render loop into a broken state either. ── */
// The canvas is alpha:true and only paints opaque pixels where actual 3D geometry sits (the
// table/plaques), so a fully transparent frame lets whatever 2D DOM is underneath show through
// fine -- but the felt/rail/seat-plaque geometry itself is built once in init() and otherwise
// always sits there, opaquely covering that same screen region for as long as the module is
// enabled. During the true "no room yet" lobby and the seat-draft screen (game.phase ===
// "lobby") the plan requires that screen to stay real, unobstructed 2D DOM -- so the table must
// not be silently painted behind/over it. setSceneVisible(false) hides the canvas+labels
// entirely (without disposing anything) whenever there's no active game to show, and the render
// loop skips the actual draw call while hidden so it isn't spending GPU time on an invisible
// frame either.
let sceneVisible = true;
function setSceneVisible(v) {
    sceneVisible = v;
    if (renderer) renderer.domElement.style.display = v ? 'block' : 'none';
    if (labelsContainer) labelsContainer.style.display = v ? '' : 'none';
    if (!v) { updateTurnRing(null); hideWinRings(); hideBanner(); }
}

let syncSeq = 0;
async function sync(game, meta) {
    if (!enabled || !initialized) return;
    if (!game || game.phase === 'lobby') {
        // True lobby (no room yet) or the seat-draft screen: nothing to render, and per the
        // plan this stays 2D DOM -- don't let the static table geometry visually cover it.
        setSceneVisible(false);
        return;
    }
    try {
        setSceneVisible(true);
        const token = ++syncSeq;
        const mySeat = computeMySeat(game);
        const vm = buildViewModel(game, mySeat);

        while (cardGroup.children.length) cardGroup.remove(cardGroup.children[cardGroup.children.length - 1]);
        dealAnim = null;
        activePlayFlights = {};
        activeGame = vm; activeMeta = meta;

        updateTurnRing(vm.phase === 'roundOver' || vm.phase === 'gameOver' ? null : vm.currentTurn);
        updateSeatLabels(vm);

        camZoomAnim = null; camZoomFactor = 0; camShakeAnim = null;
        hideWinRings();
        if (renderer) renderer.domElement.style.filter = '';

        const skipPlayed = detectNewPlays(vm);
        const { phase } = REDUCED_MOTION ? { phase: 'done' } : dealPhaseFor(vm);
        if (phase === 'done') {
            await buildStaticTable(vm, { skipPlayedSeats: skipPlayed });
        } else {
            await buildDealAnimation(vm);
        }
        if (token !== syncSeq) return; // a newer sync() already started meanwhile
        maybeCelebrateBomb(vm);
        maybeCelebrateRoundEnd(vm);
        updateSeatLabels(vm); // re-run after the async card-mesh build in case layout/camera shifted
    } catch (err) {
        console.error('[Guandan3D] sync() failed -- falling back to 2D for this client.', err);
        setEnabled(false);
    }
}

window.Guandan3D = { init, sync, destroy, setEnabled };
