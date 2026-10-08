// src/live-view-fx.js - runs in the browser, in the live-view pages (/eyes/<id>/ and /watch/<id>/), after
// prismarine-viewer's own client (src/web.js serves the page with this script added, as muse-fx.js). Two things the
// viewer does not do:
// - a first-person camera that turns instead of snapping: the viewer sets the camera to the bot's look on every update,
//   and mineflayer turns the bot's head at once (only the packets to the server are eased), so every dig, every step
//   of a path and every placed block whipped the picture around. Here the look the viewer asks for becomes the target
//   of a critically damped spring held under MAX_TURN; the turns take a fraction of a second and the bot is not slowed
//   at all (it is the picture that turns, not the bot).
// - the crack on a block being broken: the page listens to muse-fx/events (server-sent events from src/web.js, from the
//   body's 'dig' event) and draws the game's own destroy_stage_0..9 textures over that block, darkening it as in the
//   game, stage by stage over the dig's time.
// It also hides the magenta boxes the viewer draws for what it has no model for (dropped items, arrows, orbs).
// It needs only window.THREE (the viewer's bundle sets it) and touches nothing else: hooks on THREE's prototypes find
// the camera and the scene when the viewer first draws them. Without THREE it does nothing and the page is the stock
// viewer. Loaded before the client (a page script injected first), it waits for the document to be parsed.
// Settings (window.__museFx, set in front of it): textures (the folder of destroy_stage_N.png), events (the URL of the
// event stream, false: none), smooth (false: leave the camera alone, e.g. where the page eases it already),
// smoothMs, maxTurnDeg, hideUnknown (false: keep the magenta boxes).

(() => {
  if (window.__museFxState) return; // loaded twice

  function init() {
    const THREE = window.THREE;
    if (!THREE || !THREE.Euler || !THREE.Camera || !THREE.Scene || !THREE.Object3D) return;
    const cfg = window.__museFx || {};
    const SMOOTH_MS = cfg.smoothMs ?? 100; // how softly a turn settles: 90 % of a 30 degree turn in 0.2 s
    const MAX_TURN = ((cfg.maxTurnDeg ?? 360) * Math.PI) / 180; // per second: half a turn in about 0.5 s
    const TAU = Math.PI * 2;

    let camera = null; // the viewer's camera and scene, found when first drawn
    let scene = null;
    let want = null; // {yaw, pitch} the viewer asked for
    let cur = null; // the eased look: {yaw, pitch, vy, vp}
    let last = 0;
    let inner = false;

    const near = (a, b) => b - TAU * Math.round((b - a) / TAU); // angle b moved to within half a turn of a
    // critically damped spring (Game Programming Gems 4, "SmoothDamp"), then a cap on the turn rate
    function turn(x, v, target, dt) {
      const omega = 2 / (SMOOTH_MS / 1000);
      const k = omega * dt;
      const e = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k);
      const change = x - target;
      const temp = (v + omega * change) * dt;
      let nx = target + (change + temp) * e;
      let nv = (v - omega * temp) * e;
      const step = MAX_TURN * dt;
      if (Math.abs(nx - x) > step) {
        nx = x + Math.sign(nx - x) * step;
        nv = Math.sign(nv) * Math.min(Math.abs(nv), MAX_TURN);
      }
      return [nx, nv];
    }

    // the viewer's first-person camera is the only place that sets an Euler in 'ZYX' order (setFirstPersonCamera)
    const eulerSet = THREE.Euler.prototype.set;
    if (cfg.smooth !== false) {
      THREE.Euler.prototype.set = function set(x, y, z, order) {
        const mine = !inner && order === 'ZYX' && camera && this === camera.rotation;
        if (mine && Number.isFinite(x) && Number.isFinite(y)) {
          want = { pitch: x, yaw: y };
          return this;
        }
        return eulerSet.call(this, x, y, z, order);
      };
    }

    function ease(now) {
      const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 0; // since the last frame drawn
      last = now;
      if (!want) return;
      if (!cur) cur = { yaw: camera.rotation.y, pitch: camera.rotation.x, vy: 0, vp: 0 };
      if (dt <= 0) return;
      [cur.yaw, cur.vy] = turn(cur.yaw, cur.vy, near(cur.yaw, want.yaw), dt);
      [cur.pitch, cur.vp] = turn(cur.pitch, cur.vp, want.pitch, dt);
      if (Math.abs(cur.yaw) > 1e4) cur.yaw = near(0, cur.yaw);
      inner = true;
      try { camera.rotation.set(cur.pitch, cur.yaw, 0, 'ZYX'); } finally { inner = false; }
    }

    // ---- the crack on the block being broken ---------------------------------------------------------------------
    const crack = { mesh: null, textures: [], stage: -1, at: 0, ms: 0, on: false };
    function crackMesh() {
      if (crack.mesh || !scene) return crack.mesh;
      const loader = new THREE.TextureLoader();
      const base = cfg.textures || 'textures/1.21.4/blocks/';
      for (let i = 0; i < 10; i++) {
        const t = loader.load(`${base}destroy_stage_${i}.png`);
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        crack.textures.push(t);
      }
      // white where the texture is empty: multiplying leaves the block as it is there, and darkens it along the cracks
      const material = new THREE.MeshBasicMaterial({
        map: crack.textures[0], transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: false,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
      });
      const Box = THREE.BoxGeometry || THREE.BoxBufferGeometry;
      crack.mesh = new THREE.Mesh(new Box(1.002, 1.002, 1.002), material);
      crack.mesh.visible = false;
      crack.mesh.renderOrder = 10;
      crack.mesh.name = 'muse-crack';
      scene.add(crack.mesh);
      return crack.mesh;
    }
    function drawCrack(now) {
      const mesh = crackMesh();
      if (!mesh) return;
      if (!crack.on) { mesh.visible = false; return; }
      const f = crack.ms > 0 ? (now - crack.at) / crack.ms : 1;
      const stage = Math.max(0, Math.min(9, Math.floor(f * 10)));
      if (stage !== crack.stage) {
        crack.stage = stage;
        mesh.material.map = crack.textures[stage];
        mesh.material.needsUpdate = true;
      }
      mesh.visible = true;
    }
    function onDig(d) {
      if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.y) || !Number.isFinite(d.z)) { crack.on = false; return; }
      crackMesh();
      crack.on = true;
      crack.ms = Number(d.ms) || 0;
      crack.at = performance.now() - (Number(d.elapsed) || 0);
      crack.stage = -1;
      if (crack.mesh) crack.mesh.position.set(d.x + 0.5, d.y + 0.5, d.z + 0.5);
      else crack.pending = d;
    }
    let source = null;
    let received = 0;
    if (typeof window.EventSource === 'function' && cfg.events !== false) {
      source = new window.EventSource(cfg.events || 'muse-fx/events');
      source.onmessage = (ev) => {
        received += 1;
        let d = null;
        try { d = JSON.parse(ev.data); } catch { return; }
        onDig(d);
      };
    }

    // ---- what the viewer has no model for (dropped items, arrows, orbs): magenta boxes, hidden ---------------------
    let frames = 0;
    function hideMagenta() {
      for (const m of scene.children) {
        const color = m.visible && m.material && m.material.color;
        if (color && color.getHex && color.getHex() === 0xff00ff) m.visible = false;
      }
    }

    // ---- per frame: the renderer updates the scene, then the camera, just before it draws them -------------------
    const sceneUpdate = THREE.Object3D.prototype.updateMatrixWorld;
    THREE.Scene.prototype.updateMatrixWorld = function updateMatrixWorld(force) {
      if (!scene) {
        scene = this;
        if (crack.pending) { const d = crack.pending; crack.pending = null; onDig(d); }
      }
      if (this === scene) {
        drawCrack(performance.now());
        if (cfg.hideUnknown !== false && (frames += 1) % 10 === 0) hideMagenta();
      }
      return sceneUpdate.call(this, force);
    };
    const cameraUpdate = THREE.Camera.prototype.updateMatrixWorld;
    THREE.Camera.prototype.updateMatrixWorld = function updateMatrixWorld(force) {
      if (!camera && this.isPerspectiveCamera) camera = this;
      if (this === camera && cfg.smooth !== false) ease(performance.now());
      return cameraUpdate.call(this, force);
    };

    window.__museFxState = () => ({
      camera: Boolean(camera), scene: Boolean(scene), want, cur, crack: { on: crack.on, stage: crack.stage },
      events: { state: source ? source.readyState : null, received },
    });
  }

  if (window.THREE) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
