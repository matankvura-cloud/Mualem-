// שרת-דמה של מורנינג לבדיקות: OAuth, /plugins, /payments/form, ועמוד תשלום
// שמדמה הצלחה: שולח את ההודעה-חזרה ל-notifyUrl ומפנה ל-successUrl.
import http from 'node:http';

export function startMockMorning(port = 4545) {
  const forms = new Map();
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const body = await new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
    const json = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    calls.push({ method: req.method, path: url.pathname, auth: req.headers.authorization || '' });

    if (url.pathname === '/idp/v1/oauth/token') {
      const j = JSON.parse(body || '{}');
      if (j.grant_type !== 'client_credentials' || j.client_id !== 'test-id' || j.client_secret !== 'test-secret') return json({ error: 'invalid_client' }, 401);
      return json({ accessToken: 'mock-token', expiresIn: 3600 });
    }
    if (req.headers.authorization !== 'Bearer mock-token' && url.pathname.startsWith('/api/v1/')) return json({ errorCode: 1001 }, 401);
    if (url.pathname === '/api/v1/plugins') return json([{ id: 'plg-1', active: true, payments: true, name: 'מסוף' }]);
    if (url.pathname === '/api/v1/payments/form') {
      const j = JSON.parse(body || '{}');
      if (!j.pluginId || !j.custom || !(j.amount > 0)) return json({ errorCode: 1000, errorMessage: 'bad form' }, 400);
      forms.set(j.custom, j);
      return json({ url: `http://localhost:${port}/pay/${j.custom}`, errorCode: 0 });
    }
    const m = url.pathname.match(/^\/pay\/([^/]+)(\/approve|\/fail)?$/);
    if (m) {
      const f = forms.get(m[1]);
      if (!f) { res.writeHead(404); return res.end('no form'); }
      if (!m[2]) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(`<!doctype html><html lang="he" dir="rtl"><body><h1>מורנינג (דמה)</h1><p id="desc">${f.description}</p><p id="amt">${f.amount}</p>
          <form method="post" action="/pay/${m[1]}/approve"><button id="approve">שלם</button></form>
          <form method="post" action="/pay/${m[1]}/fail"><button id="fail">בטל</button></form></body></html>`);
      }
      const ok = m[2] === '/approve';
      const payload = ok
        ? { custom: m[1], status: 'paid', id: 'tx-' + m[1].slice(0, 6), amount: f.amount, documentNumber: '10001', documentUrl: 'https://example.invalid/doc.pdf' }
        : { custom: m[1], status: 'cancelled', errorCode: 0 };
      const r = await fetch(f.notifyUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      calls.push({ method: 'NOTIFY', path: f.notifyUrl, status: r.status, body: await r.text() });
      res.writeHead(302, { location: ok ? f.successUrl : f.failureUrl });
      return res.end();
    }
    res.writeHead(404); res.end('not found');
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, forms, calls, close: () => server.close() })));
}
