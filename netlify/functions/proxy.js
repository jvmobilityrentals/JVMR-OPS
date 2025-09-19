// netlify/functions/proxy.js
export async function handler(event, context) {
  const GAS_URL = process.env.GAS_URL;
  const TOKEN   = process.env.SHARED_TOKEN;

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      const url = new URL(event.rawUrl);
      const date = url.searchParams.get('date') || '';
      const type = url.searchParams.get('type') || 'ALL';

      const gasUrl = new URL(GAS_URL);
      gasUrl.searchParams.set('date', date);
      gasUrl.searchParams.set('type', type);
      gasUrl.searchParams.set('token', TOKEN);

      const res = await fetch(gasUrl, { redirect: 'follow' });
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: text
      };
    }

    if (event.httpMethod === 'POST') {
      const ct = event.headers['content-type'] || '';
      let uid = '', action = '';

      if (ct.includes('application/json')) {
        const body = JSON.parse(event.body || '{}');
        uid = body.uid || '';
        action = body.action || '';
      } else {
        const formParams = new URLSearchParams(event.body || '');
        uid = formParams.get('uid') || '';
        action = formParams.get('action') || '';
      }

      const bodyOut = new URLSearchParams({ token: TOKEN, uid, action });
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyOut,
        redirect: 'follow'
      });
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: text
      };
    }

    return { statusCode: 405, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok:false, message:'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok:false, message:String(err) }) };
  }
}
