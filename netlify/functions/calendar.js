// Simple Netlify function placeholder for calendar proxy
// This avoids Netlify build errors when functions directory is expected.
// Replace with your real function implementation when ready.

exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, message: "Calendar function placeholder" })
  };
};
