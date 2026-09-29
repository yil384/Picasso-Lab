// q_view.js - projection helpers shared by the ink / faces layers: face frames in a head's tangent plane (so the
// 2D face turns and foreshortens with the 3D body), occlusion by ray casting, px-per-unit sizing.
import * as THREE from 'three';

const _ray = new THREE.Raycaster();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function makeView(ctx, camera, occluders) {
  const camPos = camera.position.clone();
  const q = camera.quaternion;
  const camRight = V(1, 0, 0).applyQuaternion(q), camUp = V(0, 1, 0).applyQuaternion(q), camFwd = V(0, 0, -1).applyQuaternion(q);
  const P = (v) => ctx.project(v, camera);
  const ahead = (v, m = 0.6) => v.clone().sub(camPos).dot(camFwd) > m;
  const pxu = (v) => {
    const d = camPos.distanceTo(v);
    return (ctx.DH / 2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * d);
  };
  /** true when nothing in `occluders` (except `own`) sits between the camera and `anchor` */
  const clear = (anchor, own = []) => {
    const dir = anchor.clone().sub(camPos); const d = dir.length(); dir.normalize();
    _ray.set(camPos, dir); _ray.far = d - 0.03;
    const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    for (const h of _ray.intersectObjects(occluders, false)) { if (own.includes(h.object) || !shown(h.object)) continue; return false; }
    return true;
  };
  /**
   * Face frame on a sphere-ish head: centre c (Vector3), radius R, turn [x,y] (look offset, -1..1), own meshes.
   * Returns { a, b, c, vis, rs, top } in design px (a = face centre, b = +right radius, c = +up radius).
   */
  const sphereFace = (center, R, turn = [0, 0], own = [], sc = [1, 1]) => {
    if (!ahead(center, 1.0)) return null;
    const toCam = camPos.clone().sub(center).normalize();
    const n = toCam.clone().addScaledVector(camRight, turn[0] * 1.2).addScaledVector(camUp, -turn[1] * 1.2).normalize();
    const anchor = center.clone().addScaledVector(n, R * 0.98);
    const right = V(0, 1, 0).cross(n).normalize(), up = n.clone().cross(right).normalize();
    const a = P(anchor);
    if (a.x < -300 || a.x > 2220 || a.y < -300 || a.y > 1380) return null;
    const vis = clear(anchor, own) ? 1 : 0;
    return { a, b: P(anchor.clone().addScaledVector(right, R * sc[0])), c: P(anchor.clone().addScaledVector(up, R * sc[1])), vis, rs: pxu(center) * R, cen: P(center) };
  };
  /** Face on a flat disc (watch dial): centre, normal (world), radius; fades when seen edge-on */
  const discFace = (center, normal, R, own = []) => {
    if (!ahead(center, 1.0)) return null;
    const nz = normal.clone().normalize();
    const anchor = center.clone().addScaledVector(nz, 0.01);
    const right = V(0, 1, 0).cross(nz).normalize(), up = nz.clone().cross(right).normalize();
    const facing = camPos.clone().sub(anchor).normalize().dot(nz);
    const vis = Math.max(0, Math.min(1, (facing - 0.08) / 0.25)) * (clear(anchor, own) ? 1 : 0);
    return { a: P(anchor), b: P(anchor.clone().addScaledVector(right, R)), c: P(anchor.clone().addScaledVector(up, R)), vis, rs: pxu(center) * R, cen: P(center) };
  };
  return { camPos, camRight, camUp, camFwd, P, ahead, pxu, clear, sphereFace, discFace };
}
