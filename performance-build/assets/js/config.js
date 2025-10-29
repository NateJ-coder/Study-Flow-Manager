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
    AUDIO: {
      CLICK: BASE + '/audio/click.mp3',
      SPLASH: BASE + '/audio/splash.mp3',
      RAIN: BASE + '/audio/rain.mp3',
      DRAWING: BASE + '/audio/drawing.mp3'
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
    // Integrations: keep empty on the client. Sensitive endpoints/keys must live on server-side.
    INTEGRATIONS: { }
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
  // Expose a minimal, public Firebase config object if the app ships one.
  // This should contain only non-secret fields (apiKey, authDomain, projectId, messagingSenderId, appId)
  // If you prefer to set this elsewhere, override window.SF_PUBLIC_FIREBASE before loading modules.
  try {
    window.SF_PUBLIC_FIREBASE = {
      apiKey: 'AIzaSyDiY_fxXuLNSTgpPIiHTkmvSAlT-Owqkgc',
      authDomain: 'studyflowapp-2dfd0.firebaseapp.com',
      projectId: 'studyflowapp-2dfd0',
      messagingSenderId: '292997866503',
      appId: '1:292997866503:web:a999c0ef9d3f06b61136a2'
    };
  } catch (e) { /* non-blocking */ }
})();
