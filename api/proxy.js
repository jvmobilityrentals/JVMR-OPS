// api/proxy.js — Diagnostic-friendly version
export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL;
  const TOKEN   = process.env.SHARED_TOKEN;

  const setCORS = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  };
  const sendJSON = (code, obj) => {
    setCORS();
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  const sendText = (code, text) => {
    setCORS();
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(text);
  };

  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCORS(); res.statusCode = 204; return res.end();
  }

  // --- DIAGNOSTIC MODE -------------------------------------------------------
  // Hit /api/proxy?health=1 to see what's happening without crashing.
  const urlQ = req.query || {};
  if (urlQ.health === '1') {
    const diag = {
      ok: true,
      mode: 'health',
      hasGasUrl: !!GAS_URL,
      hasToken: !!TOKEN,
      gasUrlSample: GAS_URL ? GAS_URL.slice(0, 60) + '…' : null,
    };
    if (!GAS_URL || !TOKEN) return sendJSON(200, diag);

    try {
      const u = new URL(GAS_URL);
      u.searchParams.set('date', '2025-09-18');
      u.searchParams.set('type', 'ALL');
      u.searchParams.set('token', TOKEN);
      const r = await fetch(u, { redirect: 'follow' });
      const text = await r.text();
      diag.fetchStatus = r.status;
      diag.fetchOk = r.ok;
      diag.responsePreview = text.slice(0, 120) + (text.length > 120 ? '…' : '');
      return sendJSON(200, diag);
    } catch (e) {
      diag.fetchError = String(e);
      return sendJSON(200, diag);
    }
  }
  // ---------------------------------------------------------------------------

  if (!GAS_URL) return sendJSON(500, { ok:false, message:'GAS_URL env var is missing' });
  if (!TOKEN)   return sendJSON(500, { ok:false, message:'SHARED_TOKEN env var is missing' });

  try {
    if (req.method === 'GET') {
      const { date = '', type = 'ALL' } = req.query || {};
      const u = new URL(GAS_URL);
      u.searchParams.set('date', String(date));
      u.searchParams.set('type', String(type));
      u.searchParams.set('token', TOKEN);
      const r = await fetch(u, { redirect: 'follow' });
      const text = await r.text();
      return sendText(r.status || 200, text);
    }

    if (req.method === 'POST') {
      const ct = req.headers['content-type'] || '';
      let uid = '', action = '';
      if (ct.includes('application/json')) {
        const body = req.body || {};
        uid = body.uid || ''; action = body.action || '';
      } else {
        const params = new URLSearchParams(req.body || '');
        uid = params.get('uid') || ''; action = params.get('action') || '';
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

    return sendJSON(405, { ok:false, message:'Method not allowed' });
  } catch (e) {
    console.error('Proxy error:', e);
    return sendJSON(500, { ok:false, message: String(e) });
  }
}
