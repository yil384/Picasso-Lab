// Guandan AI / 提示 worker. Answers {id, kind: "aiMove" | "hint", args} with {id, ok, result | error},
// running the same engine code the page falls back to on the main thread.
import { runEngineTask } from "https://yil384.github.io/Picasso-Lab/events/static/guandan-engine.js";

self.addEventListener("message", (event) => {
    const { id, kind, args } = event.data || {};
    try {
        self.postMessage({ id, ok: true, result: runEngineTask(kind, args) });
    } catch (err) {
        self.postMessage({ id, ok: false, error: String(err && err.stack || err) });
    }
});

self.postMessage({ ready: true });
