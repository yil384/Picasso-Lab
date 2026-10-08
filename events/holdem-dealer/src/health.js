// `node src/health.js`: asks the running service how it is (GET /v1/health on 127.0.0.1:$PORT) and prints one word:
// ok (exit 0), persist_failing (exit 1: it plays on but cannot write its data; never restart it, its memory holds
// the only copy) or no_answer (exit 1: no reply within 10 s). The image's HEALTHCHECK and ops/watchdog.sh use it.
const port = process.env.PORT || 8787;
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), 10_000);
try {
  const r = await fetch(`http://127.0.0.1:${port}/v1/health`, { signal: ctrl.signal });
  const body = await r.json().catch(() => ({}));
  if (r.ok) {
    console.log('ok');
    process.exit(0);
  }
  console.log(body.error === 'persist_failing' ? `persist_failing unsaved ${body.unsavedFor}s` : `http_${r.status}`);
  process.exit(1);
} catch (_) {
  console.log('no_answer');
  process.exit(1);
} finally {
  clearTimeout(timer);
}
