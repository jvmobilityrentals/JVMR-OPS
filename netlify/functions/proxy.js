// netlify/functions/proxy.js
export default async (request, context) => {
  const GAS_URL = process.env.GAS_URL;         // e.g. https://script.google.com/macros/s/AKfyc.../exec
  const TOKEN   = process.env.SHARED_TOKEN;    // your secret token

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const date = url.searchParams.get('date') || '';
      const type = url.searchParams.get('type') || 'ALL';

      // Forward to GAS with token
      const gasUrl = new URL(GAS_URL);
      gasUrl.searchParams.set('date', date);
      gasUrl.searchParams.set('type', type);
      gasUrl.searchParams.set('token', TOKEN);

      const res = await fetch(gasUrl, { redirect: 'follow' });
      const text = await res.text(); // sometimes GAS content-type isn't perfect
      return new Response(text, {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (request.method === 'POST') {
      const ct = request.headers.get('content-type') || '';
      let uid = '', action = '';
      if (ct.includes('application/json')) {
        const body = await request.json();
        uid = body.uid || '';
        action = body.action || '';
      } else {
        const form = await request.formData();
        uid = form.get('uid') || '';
        action = form.get('action') || '';
      }
      const form = new URLSearchParams({ token: TOKEN, uid, action });

      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
        redirect: 'follow'
      });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ ok:false, message:'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok:false, message:String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
