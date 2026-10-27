// Local harness: static files + the real worker on an in-memory D1 shim
const http = require('http'), fs = require('fs'), path = require('path');
const { makeDB } = require('./d1shim');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
async function start(port, extraEnv = {}) {
  const W = (await import('../worker/worker.js')).default;
  const root = path.join(__dirname, '..');
  const env = {
    DB: makeDB(), ADMIN_PASS: 'secret', ...extraEnv,
    ASSETS: { fetch: async req => {
      let p = new URL(req.url).pathname; if (p === '/') p = '/index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root) || /\/(worker|migrations|test)\//.test(p) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return new Response('nf', { status: 404 });
      return new Response(fs.readFileSync(f), { headers: { 'content-type': types[path.extname(f)] || 'application/octet-stream' } });
    } },
  };
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await W.fetch(new Request('http://localhost:' + port + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise(r => server.listen(port, r));
  return { env, server, close: () => server.close(), W };
}
module.exports = { start };
