// Single source of truth for your GAS endpoint.
// Load this BEFORE config.js on any page that talks to Apps Script.
(function () {
  // UPDATE THESE TWO VALUES ONLY when you redeploy Apps Script:
  const CALENDAR_URL = 'https://script.google.com/macros/s/AKfycbwpNDjEejgORzPQ9AzCl3xkqOB5Ane5wwvRvnN5Gj2gxsdU9RRUYdwNsY8dDPm6sjaUwg/exec';
  const SHARED_KEY   = '8bd4cad053faee35a6e87af44d78622122fd8bce954c91c20e7412f56947558c1d0d2de4e2f6f83e883194db9012b2c1';

  // Publish globally so config.js (or any script) can read it.
  window.SF_GAS = {
    CALENDAR_URL,
    SHARED_KEY,
    version: '2025-10-16-5' // bump when you change the URL/key
  };

  // Helpful console breadcrumb
  try {
    console.log('[SF gas-endpoint]', window.SF_GAS.version, window.SF_GAS.CALENDAR_URL);
  } catch {}
})();
