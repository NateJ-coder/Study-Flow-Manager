// Netlify function: calendar proxy
// Forwards actions to an upstream calendar endpoint using a server-side secret.
// Environment variables used:
//  - CALENDAR_ENDPOINT : upstream URL (required)
//  - CALENDAR_SHARED_KEY: shared secret to send as x-shared-key (required)
//  - ALLOWED_ORIGIN: comma-separated list of allowed origins for CORS (optional)

const parseJson = (s) => {
  try { return JSON.parse(s || '{}'); } catch (e) { return {}; }
};

const allowedOrigins = () => {
  const a = process.env.ALLOWED_ORIGIN || '';
  return a.split(',').map(s => s.trim()).filter(Boolean);
};

const isOriginAllowed = (origin) => {
  if (!origin) return false;
  const list = allowedOrigins();
  if (list.length === 0) return false;
  return list.includes(origin) || list.includes('*');
};

exports.handler = async function(event, context) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    const allow = isOriginAllowed(origin) ? origin : '';
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': allow || '',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-requested-with',
        'Access-Control-Max-Age': '600'
      },
      body: ''
    };
  }

  const endpoint = process.env.CALENDAR_ENDPOINT;
  const sharedKey = process.env.CALENDAR_SHARED_KEY;
  if (!endpoint || !sharedKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': isOriginAllowed(origin) ? origin : '' },
      body: JSON.stringify({ ok: false, error: 'Upstream endpoint or shared key not configured' })
    };
  }

  // Only accept POST for action calls
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': isOriginAllowed(origin) ? origin : '' },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  const payload = parseJson(event.body);
  const action = payload && payload.action;
  if (!action) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': isOriginAllowed(origin) ? origin : '' },
      body: JSON.stringify({ ok: false, error: 'Missing action' })
    };
  }

  try {
    // Forward to upstream using server-side secret in header (safer than query param)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-key': sharedKey
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }

    const allow = isOriginAllowed(origin) ? origin : '';
    return {
      statusCode: res.status >= 200 && res.status < 400 ? 200 : 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allow },
      body: JSON.stringify({ ok: true, upstreamStatus: res.status, data: json })
    };
  } catch (err) {
    const allow = isOriginAllowed(origin) ? origin : '';
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allow },
      body: JSON.stringify({ ok: false, error: String(err) })
    };
  }
};
