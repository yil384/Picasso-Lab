// In-memory Firebase RTDB stub for offline screenshots (never touches production).
// window.__fbDelay (ms, default 0) delays every set/get/remove/transaction like a slow phone connection.
const store = (window.__fbStore = window.__fbStore || {});
const listeners = (window.__fbListeners = window.__fbListeners || {});
const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
const lag = () => new Promise((r) => setTimeout(r, Number(window.__fbDelay) || 0));
function getPath(p) { return store[p] === undefined ? null : clone(store[p]); }
function notify(p) { (listeners[p] || []).forEach((cb) => setTimeout(() => cb(snap(p)), 0)); }
function snap(p) { const v = getPath(p); return { val: () => clone(v), exists: () => v != null }; }
export function getDatabase() { return {}; }
export function ref(db, path) { return { path }; }
export async function set(r, v) { await lag(); store[r.path] = clone(v); notify(r.path); }
export async function get(r) { await lag(); return snap(r.path); }
export async function remove(r) { await lag(); delete store[r.path]; notify(r.path); }
export function onValue(r, cb) { (listeners[r.path] = listeners[r.path] || []).push(cb); setTimeout(() => cb(snap(r.path)), 0); return () => { listeners[r.path] = listeners[r.path].filter((x) => x !== cb); }; }
export async function runTransaction(r, fn) {
  await lag();
  const cur = getPath(r.path);
  const next = fn(cur);
  if (next === undefined) return { committed: false, snapshot: snap(r.path) };
  store[r.path] = clone(next); notify(r.path);
  return { committed: true, snapshot: snap(r.path) };
}
window.__fbSet = (path, v) => { store[path] = clone(v); notify(path); };
window.__fbGet = (path) => getPath(path);
