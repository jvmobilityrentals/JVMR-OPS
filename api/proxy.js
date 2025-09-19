// Vercel Serverless Function - forwards to Google Apps Script
export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL;       // e.g. https://script.google.com/.../exec
  const TOKEN   = process.env.SHARED_TOKEN;  // your secret token

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    if (req.method === 'GET') {
      const { date = '', type = 'ALL' } = req.query || {};
      const u = new URL(GAS_URL);
      u.searchParams.set('date', String(date));
      u.searchParams.set('type', String(type));
      u.searchParams.set('token', TOKEN);

      const r = await fetch(u, { redirect: 'follow' });
      const text = await r.text(); // GAS sometimes mislabels content-type
      return res.status(r.status).set(cors).send(text);
    }

    if (req.method === 'POST') {
      const ct = req.headers['content-type'] || '';
      let uid = '', action = '';
      if (ct.includes('application/json')) {
        const body = req.body || {};
        uid = body.uid || '';
        action = body.action || '';
      } else {
        // x-www-form-urlencoded
        const params = new URLSearchParams(req.body || '');
        uid = params.get('uid') || '';
        action = params.get('action') || '';
      }

      const form = new URLSearchParams({ token: TOKEN, uid, action });
      const r = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
        redirect: 'follow'
      });
      const text = await r.text();
      return res.status(r.status).set(cors).send(text);
    }

    return res.status(405).set(cors).send(JSON.stringify({ ok:false, message:'Method not allowed' }));
  } catch (e) {
    return res.status(500).set(cors).send(JSON.stringify({ ok:false, message:String(e) }));
  }
}
