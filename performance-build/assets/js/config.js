// Centralized runtime config for StudyFlow asset paths
// Exposes window.SF_CONFIG for other scripts to consume.
(function () {
  // Runtime verification for cache-busted deploys
  try {
    console.log('[SF config] v=2025-10-16-3',
      (typeof SF_CONFIG !== 'undefined') ? SF_CONFIG.INTEGRATIONS?.GAS_CALENDAR_URL : '(not set)');
  } catch (e) { /* ignore */ }

  const BASE = '/Study-Flow-Manager/performance-build/assets';

  const SF_CONFIG = {
    BASE,
    PAGES: {
      WELCOME: BASE + '/pages/welcome.html',
      TIMER: BASE + '/pages/timer.html',
      CALENDAR: BASE + '/pages/calendar.html',
    },
    CSS: {
      WELCOME: BASE + '/css/welcome.css',
      TIMER: BASE + '/css/timer.css',
      PARTICLES: BASE + '/css/particles.css'
    },
    JS: {
      WELCOME: BASE + '/js/welcome.js',
      TIMER: BASE + '/js/timer.js',
      PARTICLE: BASE + '/js/particle.js',
      SLEEP: BASE + '/js/sleep.js',
      QUOTES: BASE + '/js/quotes.js'
    },
    IMAGES: {
      LOGO_768: BASE + '/images/optimized/studyflow-logo-768.webp'
    },
    BACKGROUNDS: [
      BASE + '/images/autumn-day-1.png',
      BASE + '/images/autumn-day-2.png',
      BASE + '/images/autumn-day-3.png',
      BASE + '/images/autumn-day-4.png',
      BASE + '/images/autumn-day-5.png',
      BASE + '/images/autumn-day-6.png',
      BASE + '/images/autumn-day-7.png',
      BASE + '/images/autumn-day-8.png',
      BASE + '/images/autumn-night-1.png',
      BASE + '/images/autumn-night-2.png',
      BASE + '/images/autumn-night-3.png',
      BASE + '/images/summer-day-1.png',
      BASE + '/images/summer-day-2.png',
      BASE + '/images/summer-day-3.png',
      BASE + '/images/summer-day-4.png',
      BASE + '/images/summer-day-5.png',
      BASE + '/images/summer-day-6.png',
      BASE + '/images/summer-day-7.png',
      BASE + '/images/summer-day-8.png',
      BASE + '/images/summer-night-1.png',
      BASE + '/images/winter-day-1.png',
      BASE + '/images/winter-day-2.png',
      BASE + '/images/winter-day-3.png',
      BASE + '/images/winter-day-4.png',
      BASE + '/images/winter-day-5.png'
    ],
    INTEGRATIONS: {
      GAS_CALENDAR_URL: 'https://script.google.com/macros/s/AKfycbwWMAjA6YoMLp2-uQcbg4TQJItQtdpzCTtPle7Itg4cA4DhXSxdfO5ORFcBE1dgch_cIg/exec',
      GAS_SHARED_KEY:  '8bd4cad053faee35a6e87af44d78622122fd8bce954c91c20e7412f56947558c1d0d2de4e2f6f83e883194db9012b2c1'
    }
  };

  // --- allow gas-endpoint.js to override these values ---
  if (window.SF_GAS?.CALENDAR_URL) {
    SF_CONFIG.INTEGRATIONS.GAS_CALENDAR_URL = window.SF_GAS.CALENDAR_URL;
  }
  if (window.SF_GAS?.SHARED_KEY) {
    SF_CONFIG.INTEGRATIONS.GAS_SHARED_KEY = window.SF_GAS.SHARED_KEY;
  }

  // Publish to window
  window.SF_CONFIG = SF_CONFIG;
})();
