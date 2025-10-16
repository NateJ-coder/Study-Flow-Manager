// Centralized runtime config for StudyFlow asset paths
// Exposes window.SF_CONFIG for other scripts to consume.
(function () {
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
      LOGO_768: BASE + '/images/optimized/studyflow-logo-768.webp',
      WELCOME_BG: BASE + '/images/welcome-page.png'
      ,
      AUTUMN_DAY: BASE + '/images/autumn-day-8.png',
      AUTUMN_NIGHT: BASE + '/images/autumn-night-1.png',
      AUTUMN_DAY_1: BASE + '/images/autumn-day-1.png',
      SUMMER_DAY: BASE + '/images/summer-day-1.png',
      SUMMER_NIGHT: BASE + '/images/summer-night-1.png',
      WINTER_DAY: BASE + '/images/winter-day-1.png',
      WINTER_NIGHT: BASE + '/images/winter-night-1.png'
    },
    BACKGROUNDS: {
      AUTUMN_DAY: BASE + '/images/autumn-day-8.png',
      AUTUMN_NIGHT: BASE + '/images/autumn-night-1.png',
      AUTUMN_DAY_1: BASE + '/images/autumn-day-1.png',
      SUMMER_DAY: BASE + '/images/summer-day-1.png',
      SUMMER_NIGHT: BASE + '/images/summer-night-1.png',
      WINTER_DAY: BASE + '/images/winter-day-1.png',
      WINTER_NIGHT: BASE + '/images/winter-night-1.png'
    },
    AUDIO: {
      CLICK: BASE + '/audio/click.mp3',
      DRAWING: BASE + '/audio/drawing.mp3',
      SPLASH: BASE + '/audio/splash.mp3'
    },
    INTEGRATIONS: {
      // Google Apps Script endpoint for calendar bridge
  GAS_CALENDAR_URL: 'https://script.google.com/macros/s/AKfycbzf6m5rF7y_KxdtzBwrqk3aKwWvVo2Nj24c3l-IBbloVDwz2KgEruc6PfqZUPnnNW08pw/exec',
      // Replace with the shared secret used by your Apps Script deployment
      GAS_SHARED_KEY: 'CHANGE_ME_32+CHARS'
    },
    // helper arrays for preloads
    PRELOAD: {
      INTRO: [
        BASE + '/images/optimized/studyflow-logo-768.webp',
        BASE + '/images/welcome-page.png',
        BASE + '/css/welcome.css',
        BASE + '/js/welcome.js',
        BASE + '/pages/welcome.html'
      ]
      ,
      BACKGROUNDS: [
        BASE + '/images/autumn-day-8.png',
        BASE + '/images/autumn-day-1.png',
        BASE + '/images/autumn-night-1.png',
        BASE + '/images/summer-day-1.png',
        BASE + '/images/summer-night-1.png',
        BASE + '/images/winter-day-1.png',
        BASE + '/images/winter-night-1.png'
      ]
    }
    ,
    // Full background lists used across the app
    ALL_BACKGROUND_IMAGES: [
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
      BASE + '/images/winter-day-5.png',
      BASE + '/images/winter-day-6.png',
      BASE + '/images/winter-day-7.png',
      BASE + '/images/winter-night-1.png'
    ],
    BACKGROUND_IMAGES: [
      BASE + '/images/autumn-day-8.png',
      BASE + '/images/autumn-night-1.png',
      BASE + '/images/summer-day-1.png',
      BASE + '/images/summer-night-1.png',
      BASE + '/images/winter-day-1.png',
      BASE + '/images/winter-night-1.png'
    ]
  };

  // expose globally
  window.SF_CONFIG = Object.freeze(SF_CONFIG);
})();
