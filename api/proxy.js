// api/proxy.js — Vercel Node Serverless (CJS/ESM safe)
export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL;
  const TOKEN   = process.env.SHARED_TOKEN;

  const setCORS = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  };
  const send = (code, bodyObj) => {
    setCORS();
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(bodyObj));
  };
  const sendText = (code, text) => {
    setCORS();
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(text);
  };

  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCORS();
    res.statusCode = 204;
    return res.end();
  }

  if (!GAS_URL) return send(500, { ok:false, message:'GAS_URL env var is missing' });
  if (!TOKEN)   return send(500, { ok:false, message:'SHARED_TOKEN env var is missing' });

  try {
    if (req.method === 'GET') {
      const { date = '', type = 'ALL' } = req.query || {};
      const u = new URL(GAS_URL);
      u.searchParams.set('date', String(date));
      u.searchParams.set('type', String(type));
      u.searchParams.set('token', TOKEN);

      const r = await fetch(u, { redirect: 'follow' });
      const text = await r.text();        // GAS may not set JSON header correctly
      return sendText(r.status || 200, text);
    }

    if (req.method === 'POST') {
      const ct = req.headers['content-type'] || '';
      let uid = '', action = '';
      if (ct.includes('application/json')) {
        const body = req.body || {};
        uid = body.uid || '';
        action = body.action || '';
      } else {
        const params = new URLSearchParams(req.body || '');
        uid = params.get('uid') || '';
        action = params.get('action') || '';
      }

      const bodyOut = new URLSearchParams({ token: TOKEN, uid, action });
      const r = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyOut,
        redirect: 'follow'
      });
      const text = await r.text();
      return sendText(r.status || 200, text);
    }

    return send(405, { ok:false, message:'Method not allowed' });
  } catch (e) {
    console.error('Proxy error:', e);
    return send(500, { ok:false, message: String(e) });
  }
}
