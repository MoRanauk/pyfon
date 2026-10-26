export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ping(env));
  },
  async fetch() {
    return new Response('pyfon-timer', { status: 404 });
  },
};

async function ping(env) {
  const started = Date.now();
  const ctrl = new AbortController();
  const stop = setTimeout(() => ctrl.abort(), 70000);
  try {
    const res = await fetch(env.TARGET, { signal: ctrl.signal });
    console.log('ping', res.status, Date.now() - started, 'ms');
  } catch (e) {
    console.log('ping failed', String(e), Date.now() - started, 'ms');
  } finally {
    clearTimeout(stop);
  }
}
