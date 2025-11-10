// Trigger new build: 2025-11-10
const { google } = require('googleapis');

// Environment variables used:
// - CALENDAR_ENDPOINT: upstream URL (forwards actions)
// - CALENDAR_SHARED_KEY: shared secret for the upstream endpoint
// - GOOGLE_CLIENT_ID: Google OAuth2 Client ID
// - GOOGLE_CLIENT_SECRET: Google OAuth2 Client Secret
// - GOOGLE_REDIRECT_URI: Google OAuth2 Redirect URI
// - ALLOWED_ORIGIN: comma-separated list of allowed origins for CORS

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const parseJson = (s) => {
  try { return JSON.parse(s || '{}'); } catch (e) { return {}; }
};

const allowedOrigins = () => {
  const a = process.env.ALLOWED_ORIGIN;
  if (!a || !a.trim()) return ['*'];
  return a.split(',').map(s => s.trim()).filter(Boolean);
};

const allowForOrigin = (origin) => {
  const list = allowedOrigins();
  if (list.includes('*')) return '*';
  return (origin && list.includes(origin)) ? origin : '';
};

exports.handler = async function(event, context) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const allow = allowForOrigin(origin) || '*';

  const corsHeaders = {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-requested-with',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '600' },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  const payload = parseJson(event.body);
  const { action } = payload;

  if (!action) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ ok: false, error: 'Missing action' })
    };
  }

  // Handle Google Calendar connection
  if (action === 'connect') {
    const scopes = ['https://www.googleapis.com/auth/calendar.events.readonly'];
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      // A 'state' parameter can be used for security purposes
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ ok: true, url })
    };
  }

  // The rest of this function acts as a proxy to another endpoint.
  const endpoint = process.env.CALENDAR_ENDPOINT;
  const sharedKey = process.env.CALENDAR_SHARED_KEY;
  if (!endpoint || !sharedKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ ok: false, error: 'Upstream endpoint or shared key not configured' })
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-shared-key': sharedKey },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }

    return {
      statusCode: res.status >= 200 && res.status < 400 ? 200 : 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ ok: true, upstreamStatus: res.status, data: json })
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ ok: false, error: String(err) })
    };
  }
};
