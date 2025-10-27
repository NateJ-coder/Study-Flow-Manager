// StudyFlow Timer Page JavaScript
// Firebase Imports
// Firebase modules will be dynamically imported to prevent blocking

// Global Firebase Variables - HARDCODED CONFIGURATION
// We are hardcoding the values since the environment variables are not available.
const firebaseConfig = {
    apiKey: "AIzaSyDiY_fxXuLNSTgpPIiHTkmvSAlT-Owqkgc",
    authDomain: "studyflowapp-2dfd0.firebaseapp.com",
    projectId: "studyflowapp-2dfd0",
    storageBucket: "studyflowapp-2dfd0.firebasestorage.app",
    messagingSenderId: "292997866503",
    appId: "1:292997866503:web:a999c0ef9d3f06b61136a2",
    measurementId: "G-CEJ384DE17"
};

// We will use the projectId as the appId for Firestore rules compatibility.
const appId = firebaseConfig.projectId;

// Since we are using hardcoded config, we must explicitly set the initial auth token to null
// and rely on signInAnonymously() to handle authentication.
const initialAuthToken = null;

let app;
let db;
let auth;
let userId = null;
let isAuthReady = false;

// Firebase functions - will be set after import
let doc, getDoc, setDoc;

// --- APPLICATION STATE AND CONFIGURATION ---

// Theme and Background Config based on BACKGROUND_SYSTEM_SPEC.md
// Use absolute asset URLs derived from SF_CONFIG.BASE so paths resolve correctly
const ASSET_BASE = (window.SF_CONFIG && window.SF_CONFIG.BASE) || '/Study-Flow-Manager/performance-build/assets';
// Store base filenames (no extension). Runtime will prefer AVIF -> WebP -> PNG
const BACKGROUND_CONFIG = {
  summer: {
    images: {
      day: Array.from({ length: 8 }, (_, i) => `${ASSET_BASE}/images/summer-day-${i + 1}`),
      night: Array.from({ length: 8 }, (_, i) => `${ASSET_BASE}/images/summer-night-${i + 1}`),
    }
  },
  autumn: {
    images: {
      day: Array.from({ length: 8 }, (_, i) => `${ASSET_BASE}/images/autumn-day-${i + 1}`),
      night: Array.from({ length: 8 }, (_, i) => `${ASSET_BASE}/images/autumn-night-${i + 1}`),
    }
  },
  winter: {
    images: {
      day: Array.from({ length: 7 }, (_, i) => `${ASSET_BASE}/images/winter-day-${i + 1}`),
      night: Array.from({ length: 7 }, (_, i) => `${ASSET_BASE}/images/winter-night-${i + 1}`),
    }
  }
};

// Default Settings
let appSettings = {
  theme: 'autumn',
  bgIndex: 0,
  focusDuration: 25, // minutes
  shortBreakDuration: 5, // minutes
  longBreakDuration: 15, // minutes
  sessionsBeforeLongBreak: 4, // number of focus sessions before long break
  slideshowInterval: 30, // seconds (will be validated against minimum)
  sleepTimeout: 300, // seconds (5 minutes default)
  disableTickingGlow: false, // user preference to disable visual ticking glow
};

// Timer State
let timerInterval = null;
let totalSeconds = appSettings.focusDuration * 60;
let isRunning = false;

// Pomodoro State
let currentSession = 1; // Current session number
let sessionType = 'focus'; // 'focus', 'short-break', 'long-break'
let completedSessions = 0; // Completed focus sessions

// Global timer access for sleep mode
window.studyFlowTimer = {
  get timeLeft() { return totalSeconds; },
  get currentSession() { return currentSession; },
  get sessionType() { return sessionType; },
  get totalSessions() { return appSettings.sessionsBeforeLongBreak; },
  get isRunning() { return isRunning; }
};

// Global settings access for sleep mode
window.appSettings = appSettings;

// Session Messages
const sessionMessages = {
  focus: [
    "Time to dive into deep work. Good luck!",
    "Focus mode activated. You've got this!",
    "Deep work time. Eliminate distractions!",
    "Channel your concentration. Make it count!"
  ],
  'short-break': [
    "Take a breather! Stretch, walk, or grab some water.",
    "Short break time. Step away from the screen!",
    "Quick break! Get some fresh air or do light stretches.",
    "Mini-break activated. Recharge for the next session!"
  ],
  'long-break': [
    "Well deserved break! Go for a walk or grab coffee.",
    "Long break time! Treat yourself to something nice.",
    "Extended break! Take a proper rest, you've earned it.",
    "Big break time! Step outside or enjoy a healthy snack."
  ]
};

// Background Slideshow State
let backgroundInterval = null;
let dayNightCheckInterval = null;
let isBackgroundSystemInitialized = false; // Flag to track if background intervals are running


// --- FIREBASE AND AUTHENTICATION ---

async function initializeFirebase() {
    // Function to hide the loading overlay (CRITICAL for fixing the hang)
    const hideLoadingOverlay = () => {
        document.getElementById('loading-overlay').style.opacity = '0';
        // After transition, remove it from flow
        setTimeout(() => document.getElementById('loading-overlay').style.display = 'none', 500);
    };

    // Helper to wait until app is ready to show (ensures first bg image + minimal UI)
    window.showAppWhenReady = async function showAppWhenReady() {
      try {
        const overlay = document.getElementById('loading-overlay');
        const bgImg = document.getElementById('background-image');

        // Wait for background image to load if present
        await new Promise((resolve) => {
          if (!bgImg) return resolve();
          if (bgImg.complete && bgImg.naturalWidth > 0) return resolve();
          const t = setTimeout(() => { clearListeners(); resolve(); }, 3000); // safety
          function clearListeners() { bgImg.removeEventListener('load', onload); bgImg.removeEventListener('error', onerr); clearTimeout(t); }
          function onload() { clearListeners(); resolve(); }
          function onerr() { clearListeners(); resolve(); }
          bgImg.addEventListener('load', onload);
          bgImg.addEventListener('error', onerr);
        });

        // (Optional) ensure minimal UI wiring is present — a short tick
        await new Promise(r => setTimeout(r, 50));

        // Fade out overlay
        if (overlay) {
          overlay.style.transition = 'opacity 250ms ease';
          overlay.style.opacity = '0';
          setTimeout(() => { try { overlay.remove(); } catch(e){} }, 260);
        }
        // Mark the document as ready so CSS can enable post-load effects (blur, etc.)
        try {
          document.body.classList.add('ready');
          // Give the browser a frame to paint the ready state before starting
          // non-critical animations (particles). This prevents jank on first paint.
          requestAnimationFrame(() => {
            try { window.dispatchEvent(new Event('studyflow:readyToAnimate')); } catch (e) {}
          });
        } catch (e) { /* non-blocking */ }
      } catch (e) { console.warn('showAppWhenReady failed', e); }
    };

  // Particle autostart bootstrap — listens for the single ready event and starts
  // particles safely, honoring prefers-reduced-motion and ensuring it only runs once.
  (function initParticleAutostart() {
    let started = false;
    const startParticles = () => {
      if (started) return;
      started = true;

      // Respect reduced motion preference and low-end devices
      try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return; // do not start particles
        }
      } catch (e) { /* ignore */ }

      const isLowEndDevice = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
                           || (navigator.deviceMemory && navigator.deviceMemory <= 4)
                           || /Mobi|Android/i.test(navigator.userAgent);
      if (isLowEndDevice) {
        console.log('⚡ Skipping particle startup on low-end device (initParticleAutostart)');
        return;
      }

      try {
        if (window.ParticleSystem && typeof window.ParticleSystem.start === 'function') {
          window.ParticleSystem.start();
        }
      } catch (e) { /* non-blocking */ }
    };

    // If app already ready, start immediately; otherwise wait for event
    if (window._appReadyShown) {
      startParticles();
    } else {
      window.addEventListener('studyflow:readyToAnimate', startParticles, { once: true });
    }
  })();

    try {
        // Dynamic imports to prevent blocking if Firebase CDN is slow
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
        const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
        const firestoreFunctions = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        
        // Assign to global variables for use outside this function
        doc = firestoreFunctions.doc;
        getDoc = firestoreFunctions.getDoc;
        setDoc = firestoreFunctions.setDoc;
        
        // We assume firebaseConfig is valid since it was just hardcoded.
        app = initializeApp(firebaseConfig);
        db = firestoreFunctions.getFirestore(app);
        auth = getAuth(app);
        
        // Use Anonymous Sign-in for persistent settings storage (user's ID is tied to the browser)
        const userCredential = await signInAnonymously(auth);
        userId = userCredential.user.uid;
        console.log('Firebase initialized. User ID:', userId);

    } catch (error) {
        // If Firebase fails (e.g., network error, auth not enabled)
        console.error("Critical error during Firebase operations. App will run without persistence:", error);
  } finally {
    // --- GUARANTEE UNLOCK ---
    if (!userId) {
      userId = crypto.randomUUID(); 
    }
    isAuthReady = true;
    try {
      // loadSettings may be async; wait for it so appSettings are applied before showing
      await loadSettings();
    } catch (e) { console.warn('loadSettings failed in finally:', e); }

    // Wait until first background image is ready (or timeout) before revealing UI
    try {
      if (typeof showAppWhenReady === 'function') {
        await showAppWhenReady();
      }
    } catch (e) { console.warn('showAppWhenReady failed in finally:', e); }

    // Signal that it's safe to start non-critical animations (particles, etc.)
    try { window.dispatchEvent(new Event('studyflow:readyToAnimate')); } catch (e) {}
  }
}

// Lazy gate for Firebase initialization: call only when idle or on user interaction
function lazyInitFirebase() {
  if (window._sf_firebase_init) return;
  window._sf_firebase_init = true;
  // Kick off initializeFirebase without awaiting here — callers can await if needed.
  try {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => { initializeFirebase().catch(e => console.warn('lazy init fb failed', e)); });
    } else {
      // Fallback: initialize after load
      window.addEventListener('load', () => { initializeFirebase().catch(e => console.warn('lazy init fb failed', e)); }, { once: true });
    }
  } catch (e) {
    console.warn('lazyInitFirebase failed to schedule', e);
    initializeFirebase().catch(e => console.warn('lazy init fb failed', e));
  }
}


// --- SETTINGS PERSISTENCE (Firestore) ---

function getSettingsDocRef() {
  if (!db || !userId || !doc) return null;
  // Using private data path: /artifacts/{appId}/users/{userId}/settings/{documentId}
  return doc(db, 'artifacts', appId, 'users', userId, 'settings', 'user-prefs');
}

async function saveSettings() {
  if (!isAuthReady || !userId) {
    console.warn("Auth not ready, cannot save settings.");
    return;
  }
  const docRef = getSettingsDocRef();
  if (docRef) {
    try {
      await setDoc(docRef, appSettings, { merge: true });
      console.log('Settings saved to Firestore successfully.');
      // Persist theme locally to help with head preloads and quick LCP guesses
      try { localStorage.setItem('sf_theme', appSettings.theme); } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error saving settings to Firestore:', error);
    }
  }
}

async function loadSettings() {
  if (!isAuthReady || !userId) {
    // If auth isn't ready, this is called by onAuthStateChanged later.
    return;
  }
  const docRef = getSettingsDocRef();
  if (docRef) {
    try {
      const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
        const loadedSettings = docSnap.data();
        // Preserve object identity so window.appSettings references remain valid
        Object.assign(appSettings, loadedSettings);
        console.log('Settings loaded from Firestore:', appSettings);
      } else {
        console.log('No existing settings found in Firestore. Using defaults.');
      }
    } catch (error) {
      console.error('Error loading settings from Firestore:', error);
    }
  }
  
  // Apply loaded or default settings
  applySettings();
}

function applySettings() {
  // 1. Apply Theme
  document.body.className = `${appSettings.theme}-theme`;
  document.getElementById('theme-select').value = appSettings.theme;

  // 2. Apply Background (Force update to use loaded index)
  initializeBackgroundSystem(true); 

  // 3. Apply Pomodoro Settings
  totalSeconds = appSettings.focusDuration * 60;
  document.getElementById('focus-duration').value = appSettings.focusDuration;
  document.getElementById('short-break-duration').value = appSettings.shortBreakDuration;
  document.getElementById('long-break-duration').value = appSettings.longBreakDuration;
  document.getElementById('sessions-before-long-break').value = appSettings.sessionsBeforeLongBreak;
  document.getElementById('sleep-timeout').value = appSettings.sleepTimeout;
  // Apply ticking glow preference
  try {
    const chk = document.getElementById('disable-ticking-glow');
    if (chk) chk.checked = !!appSettings.disableTickingGlow;
    document.body.classList.toggle('no-ticking-glow', !!appSettings.disableTickingGlow);
    try { localStorage.setItem('sf_disable_ticking_glow', appSettings.disableTickingGlow ? '1' : '0'); } catch(e){}
  } catch (e) { /* non-blocking */ }
  
  // 4. Apply Slideshow Interval - update options based on preload performance
  updateSlideshowIntervalOptions();
  
  // 5. Initialize Pomodoro UI
  updateSessionUI();
  updateDisplay();

  // Defer particle startup until after the app is shown to avoid extra paints during first-second
  try {
    const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowEndDevice = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
                         || (navigator.deviceMemory && navigator.deviceMemory <= 4)
                         || /Mobi|Android/i.test(navigator.userAgent);

    const startParticles = () => {
      try {
        if (prefersReduce || isLowEndDevice) return; // respect user/system preferences and low-end devices
        if (window.ParticleSystem && typeof window.ParticleSystem.start === 'function') {
          window.ParticleSystem.start();
        }
      } catch (e) {}
    };
    // Start immediately if the ready event already fired, otherwise wait for it
    if (window._appReadyShown) startParticles();
    else window.addEventListener('studyflow:readyToAnimate', startParticles, { once: true });
  } catch (e) { /* non-blocking */ }

  // Notify sleep manager (if available) so it can pick up the new sleepTimeout value
  try {
    if (window.sleepManager && typeof window.sleepManager.updateSleepTimeout === 'function') {
      window.sleepManager.updateSleepTimeout();
      console.log('💤 sleepManager updated with new settings');
    }
  } catch (e) {
    console.warn('Failed to notify sleepManager of settings change', e);
  }

  // Emit a short-lived event so subsystems (like SleepModeManager) can start
  // only after settings are applied. This avoids race conditions where those
  // systems start with fallback defaults before the user's preferences arrive.
  try {
    window.dispatchEvent(new Event('studyflow:settingsApplied'));
    console.log('📣 studyflow:settingsApplied dispatched');
  } catch (e) { /* non-blocking */ }
}

// --- SETTINGS DIALOG HANDLER ---
function handleSettingsSave() {
  // 1. Read values from the dialog back into appSettings
  // NOTE: Values read from <select> elements are strings, so parseInt is necessary

  // Update Pomodoro Durations
  appSettings.focusDuration = parseInt(document.getElementById('focus-duration').value);
  appSettings.shortBreakDuration = parseInt(document.getElementById('short-break-duration').value);
  appSettings.longBreakDuration = parseInt(document.getElementById('long-break-duration').value);
  appSettings.sessionsBeforeLongBreak = parseInt(document.getElementById('sessions-before-long-break').value);
    
  // Update Background/Theme settings
  appSettings.theme = document.getElementById('theme-select').value;
  appSettings.slideshowInterval = parseInt(document.getElementById('slideshow-interval').value);
    
  // ⭐ FIX: Update the sleepTimeout property from the dialog input
  appSettings.sleepTimeout = parseInt(document.getElementById('sleep-timeout').value);

  // 2. Save to persistence (Firestore)
  saveSettings(); 

  // 3. Apply to running system
  // The applySettings function will call window.sleepManager.updateSleepTimeout() 
  // with the newly updated appSettings.sleepTimeout value.
  applySettings();
    
  // Close the settings dialog (assuming it uses the 'active' class to show/hide)
  const settingsDialog = document.querySelector('.settings-card');
  if (settingsDialog) {
    settingsDialog.classList.remove('active');
  }
}

// --- EVENT LISTENERS FOR SETTINGS DIALOG ---
document.addEventListener('DOMContentLoaded', () => {
  // Attach handler to the Save button
  const saveBtn = document.getElementById('settingsSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSettingsSave);
  }
    
  // Attach handler to the Close button(s)
  const closeBtns = document.querySelectorAll('.settings-close-btn');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const settingsDialog = document.querySelector('.settings-card');
      if (settingsDialog) {
        settingsDialog.classList.remove('active');
      }
    });
  });
});


// --- BACKGROUND SYSTEM LOGIC ---

const backgroundImageElement = document.getElementById('background-image');
let isNight = false;

function isNightTime() {
  const now = new Date();
  const hour = now.getHours();
  // Day is 06:00 (6) to 17:59 (17). Night is 18:00 (18) to 05:59 (5).
  return hour >= 18 || hour < 6;
}

function getCurrentImageAssets() {
  // Ensure theme key is valid and lowercase per spec
  const themeKey = (appSettings.theme || 'autumn').toLowerCase();
  const themeConfig = BACKGROUND_CONFIG[themeKey] || BACKGROUND_CONFIG['autumn'];
  const timeOfDay = isNight ? 'night' : 'day';
  return themeConfig.images[timeOfDay] || [];
}

// Particle config now handled by particle.js

// Track preload times for dynamic minimum interval calculation
let preloadTimes = [];
const MAX_PRELOAD_SAMPLES = 10; // Keep last 10 measurements

function preloadImage(url) {
  // `url` is now a base path without extension. We'll attempt avif -> webp -> png
  const base = url;
  const startTime = performance.now();

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const loadTime = performance.now() - startTime;
      preloadTimes.push(loadTime);
      if (preloadTimes.length > MAX_PRELOAD_SAMPLES) preloadTimes.shift();
      console.log(`📊 Image preloaded in ${Math.round(loadTime)}ms`);
      resolve(img.src);
    };

    img.onerror = () => {
      if (!img._triedWebp) {
        img._triedWebp = true;
        img.src = `${base}-1080.webp`;
        return;
      }
      if (!img._triedPng) {
        img._triedPng = true;
        img.src = `${base}-1080.png`;
        return;
      }
      // Final fallback: try the original PNG filename without size suffix (e.g., autumn-day-1.png)
      if (!img._triedBasePng) {
        img._triedBasePng = true;
        img.src = `${base}.png`;
        return;
      }
      console.warn('Failed to preload any format for', base);
      resolve(null);
    };

    img.src = `${base}-1080.avif`;
  });
}

// Preload the next image in the sequence (nice to have for seamless transitions)
function preloadNextImage() {
  try {
    const assets = getCurrentImageAssets();
    if (!assets || assets.length === 0) return Promise.resolve(null);
    const nextIndex = (appSettings.bgIndex + 1) % assets.length;
    const nextBase = assets[nextIndex];
    return preloadImage(nextBase).catch(err => {
      console.warn('Preload next image failed:', err && err.message ? err.message : err);
      return null;
    });
  } catch (err) {
    console.warn('preloadNextImage error:', err);
    return Promise.resolve(null);
  }
}

// Calculate minimum safe slideshow interval based on average preload time + buffer
function getMinimumSlideshowInterval() {
  if (preloadTimes.length === 0) {
    return 15; // Default minimum if no preload data yet (15 seconds)
  }
  
  const averagePreloadMs = preloadTimes.reduce((a, b) => a + b, 0) / preloadTimes.length;
  const averagePreloadSeconds = Math.ceil(averagePreloadMs / 1000);
  const minimumInterval = averagePreloadSeconds + 5; // Add 5 second safety buffer
  
  // Ensure minimum is at least 10 seconds regardless
  return Math.max(minimumInterval, 10);
}

// Update slideshow interval dropdown with valid options based on minimum
function updateSlideshowIntervalOptions() {
  const minInterval = getMinimumSlideshowInterval();
  const select = document.getElementById('slideshow-interval');
  
  // Define all possible options
  const allOptions = [
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
    { value: 1800, label: '30 minutes' }
  ];
  
  // Clear existing options
  select.innerHTML = '';
  
  // Add valid options (only those >= minimum interval)
  const validOptions = allOptions.filter(option => option.value >= minInterval);
  
  validOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    
    // Add minimum indicator for the first valid option
    if (option.value === validOptions[0].value && minInterval > 10) {
      optionElement.textContent += ` (minimum: ${minInterval}s)`;
    }
    
    select.appendChild(optionElement);
  });
  
  // Ensure current setting is valid, upgrade if necessary
  if (appSettings.slideshowInterval < minInterval) {
    const newInterval = validOptions[0].value;
    console.log(`⚠️ Upgrading slideshow interval from ${appSettings.slideshowInterval}s to ${newInterval}s (minimum required)`);
    appSettings.slideshowInterval = newInterval;
    saveSettings();
  }
  
  // Set the current value
  select.value = appSettings.slideshowInterval;
  
  console.log(`📊 Minimum slideshow interval: ${minInterval}s (based on ${preloadTimes.length} preload samples)`);
}

async function updateBackground(forceUpdate = false) {
  isNight = isNightTime();
  const assets = getCurrentImageAssets();
  const oldIndex = appSettings.bgIndex;
  
  if (!forceUpdate) {
    // Cycle to the next image
    appSettings.bgIndex = (appSettings.bgIndex + 1) % assets.length;
  } else if (appSettings.bgIndex >= assets.length) {
     // Reset index if the theme changed and the old index is out of bounds
     appSettings.bgIndex = 0;
  }

  const nextImage = assets[appSettings.bgIndex];

  // Find DOM targets at call time (ensure DOM is ready)
  const bgImgEl = document.getElementById('background-image');
  // HTML uses id="bg-container"; ensure we query the correct element
  const bgContainer = document.getElementById('bg-container');

  // Avoid stale/global variable reference — use live DOM lookup for current src
  if (bgImgEl && bgImgEl.src && bgImgEl.src.includes(nextImage) && !forceUpdate) {
    // Image hasn't changed (day/night boundary crossed or first run with correct image)
    console.log(`🖼️ Background skipped. Current: ${nextImage.split('/').pop()}`);
    return;
  }

  console.log(`🖼️ Loading background: ${nextImage.split('/').pop()} (Index: ${appSettings.bgIndex})`);

  try {
  // Preload the next image before setting it (with a safety race to avoid stalls)
  const preloadPromise = preloadImage(nextImage);
  const safety = new Promise(r => setTimeout(r, 3000));
  const preloaded = await Promise.race([preloadPromise, safety]);
    
    // Start particle wipe transition
    if (window.ParticleSystem) {
      window.ParticleSystem.transition();
    }

    // Enhanced smooth transition coordinated with particle effect
    if (bgImgEl) {
      bgImgEl.style.transition = 'opacity 1s ease';
      bgImgEl.style.opacity = '0.2';

      // Phase 1: prepare and swap the image after a short particle build-up
      setTimeout(() => {
        bgImgEl.style.opacity = '0.05';
        // If the page uses a <picture> with sources, populate their srcsets so the browser
        // can pick the best image format/size. Fallback to a WebP single src for <img>.
        const sAvif = document.getElementById('bg-source-avif');
        const sWebp = document.getElementById('bg-source-webp');
        const fav = document.getElementById('background-image');
        if (sAvif) sAvif.srcset = `${nextImage}-768.avif 768w, ${nextImage}-1080.avif 1080w, ${nextImage}-1440.avif 1440w, ${nextImage}-1920.avif 1920w`;
        if (sWebp) sWebp.srcset = `${nextImage}-768.webp 768w, ${nextImage}-1080.webp 1080w, ${nextImage}-1440.webp 1440w, ${nextImage}-1920.webp 1920w`;
  // If preload didn't return a successful URL, fall back to PNG (most deployments still have PNGs)
  // If preload didn't return a successful URL, fall back to the original PNG filename (no size suffix)
  fav.src = preloaded || `${nextImage}.png`;
        // Ensure the app overlay is hidden only after the first background image has loaded
        if (!window._appReadyShown) {
          bgImgEl.addEventListener('load', function _onFirstBg() {
            bgImgEl.removeEventListener('load', _onFirstBg);
            try { if (typeof showAppWhenReady === 'function') showAppWhenReady(); } catch(e){}
            window._appReadyShown = true;
          });
        }
      }, 600);

      // Phase 2: fade image in
      setTimeout(() => {
        bgImgEl.style.opacity = '0.95';
      }, 1000);
    } else if (bgContainer) {
      // Fallback: set background-image on container if img element not present
      bgContainer.style.transition = 'background-image 1s ease, opacity 1s ease';
      bgContainer.style.opacity = '0.2';
      setTimeout(() => {
  // Fall back to PNG (original filename) if modern formats aren't present on disk
  bgContainer.style.backgroundImage = `url('${nextImage}.png')`;
      }, 600);
      setTimeout(() => { bgContainer.style.opacity = '0.95'; }, 1000);
    } else {
      // Last resort: try to set document body background
  document.body.style.backgroundImage = `url('${nextImage}.png')`;
    }
    
    // Save the new index/theme
    if (oldIndex !== appSettings.bgIndex || forceUpdate) {
      saveSettings();
    }
    
    // Update slideshow options if we have enough preload samples
    if (preloadTimes.length >= 3) {
      updateSlideshowIntervalOptions();
    }

    // Preload the subsequent image in background (non-blocking)
    preloadNextImage();

  } catch (error) {
    console.error(error.message);
  }
}

// Function to run when the theme changes (called by settings modal)
function changeTheme(newTheme) {
    if (appSettings.theme !== newTheme) {
        appSettings.theme = newTheme;
        appSettings.bgIndex = 0; // Reset index on theme change
        document.body.className = `${newTheme}-theme`;
        
        // Reinitialize with force update and new particles for current time of day
        initializeBackgroundSystem(true); 
    }
}

// Helper function for checking day/night boundary transitions
function checkDayNightBoundary() {
  if (isNight !== isNightTime()) {
    // Day/Night transition detected, force an immediate update and reset index
    console.log(`🌓 Day/Night transition detected. Switching image set and particles.`);
    appSettings.bgIndex = 0;
    updateBackground(true);
    // Also reinitialize particles for the new time of day
    if (window.ParticleSystem) {
      window.ParticleSystem.start();
    }
  }
}

// Main initialisation function for the background system
function initializeBackgroundSystem(force = false) {
    // 🛠️ New logic: Check the dedicated background flag instead of timerInterval
    if (isBackgroundSystemInitialized && !force) {
        // If already initialized and not forcing a re-initialization (like a theme change)
        return;
    }

    // Clear existing intervals before setting new ones (important for theme changes)
    if (backgroundInterval) {
        clearInterval(backgroundInterval);
    }
    if (dayNightCheckInterval) {
        clearInterval(dayNightCheckInterval);
    }

    // Update background immediately
    updateBackground(true);

    // Set the intervals
    // 1. Background image cycling using user-configurable interval
    const intervalMs = appSettings.slideshowInterval * 1000; // Convert seconds to milliseconds
    backgroundInterval = setInterval(() => updateBackground(false), intervalMs);
    console.log(`🖼️ Slideshow interval set to ${appSettings.slideshowInterval} seconds`);

    // 2. Day/Night boundary check every 1 minute
    dayNightCheckInterval = setInterval(checkDayNightBoundary, 1000 * 60); // 1 min

    // Update the flag
    isBackgroundSystemInitialized = true;
    console.log("🖼️ Background Slideshow System Initialized.");

    // Initialize Particles based on current theme and time of day
    if (window.ParticleSystem) {
      // Set up particle system dependencies
      window.ParticleSystem.setThemeProvider(() => appSettings.theme);
      window.ParticleSystem.setTimeProvider(() => isNight);
      window.ParticleSystem.initialize();
      window.ParticleSystem.start();
    }
}


// --- PARTICLE SYSTEM INTEGRATION ---
// Particle system is now handled by particle.js

// Slideshow system sleep mode control
window.slideshowSystem = {
  originalInterval: null,
  setSleepMode: function(sleepMode) {
    if (sleepMode) {
      // Store original interval and slow down slideshow
      this.originalInterval = appSettings.slideshowInterval;
      const sleepInterval = Math.max(this.originalInterval * 3, 90); // 3x slower, minimum 90s
      
      if (backgroundInterval) {
        clearInterval(backgroundInterval);
        backgroundInterval = setInterval(() => updateBackground(false), sleepInterval * 1000);
        console.log(`🖼️ Slideshow entering sleep mode: ${sleepInterval}s intervals`);
      }
    } else {
      // Restore original interval
      if (this.originalInterval && backgroundInterval) {
        clearInterval(backgroundInterval);
        backgroundInterval = setInterval(() => updateBackground(false), this.originalInterval * 1000);
        console.log(`🖼️ Slideshow exiting sleep mode: ${this.originalInterval}s intervals`);
      }
    }
  }
};

// Handle canvas resize
window.addEventListener('resize', () => {
    // Re-initialize particles to fit the new size
    if (window.ParticleSystem) {
        window.ParticleSystem.start();
    }
});


// --- PERPETUAL CLOCK ---
function updatePerpetualClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const clockEl = document.getElementById('perpetual-clock');
  if (clockEl) {
    clockEl.textContent = `${h}:${m}:${s}`;
    // minute tick shimmer when seconds flip to 00
    if (s === '00') {
      try {
        clockEl.classList.add('is-ticking');
        requestAnimationFrame(() => clockEl.classList.remove('is-ticking'));
      } catch (e) { /* ignore */ }
    }
  }
}

// Update the clock every second
setInterval(updatePerpetualClock, 1000);
updatePerpetualClock();


// --- TIMER LOGIC (Placeholder) ---

// Audio Management
function playCompletionSound() {
  try {
    const audio = new Audio('assets/audio/splash.mp3');
    audio.volume = 0.7;
    audio.play().catch(e => console.log('Audio play failed:', e));
  } catch (e) {
    console.log('Audio loading failed:', e);
  }
}

// Confetti burst (12 particles) - lightweight, respects reduced-motion
function burst() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('div'); c.className = 'confetti';
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('i');
      p.style.left = (50 + (Math.random() * 20 - 10)) + 'vw';
      p.style.top = '10vh';
      p.style.background = `hsl(${Math.floor(Math.random() * 360)} 90% 60%)`;
      p.style.animationDelay = (Math.random() * 120) + 'ms';
      c.appendChild(p);
    }
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1400);
  } catch (e) { /* ignore */ }
}

// Update UI elements for current session
function updateSessionUI() {
  const sessionCounter = document.getElementById('session-counter');
  const sessionInfo = document.getElementById('session-info');
  const timerMode = document.getElementById('timer-mode');
  
  // Update session counter
  if (sessionType === 'focus') {
    sessionCounter.textContent = `Session ${currentSession} of ${appSettings.sessionsBeforeLongBreak}`;
  } else if (sessionType === 'short-break') {
    sessionCounter.textContent = `Short Break after Session ${completedSessions}`;
  } else {
    sessionCounter.textContent = `Long Break after ${completedSessions} sessions`;
  }
  
  // Update timer mode title
  const modeTitle = {
    'focus': 'Focus Session',
    'short-break': 'Short Break',
    'long-break': 'Long Break'
  };
  timerMode.textContent = modeTitle[sessionType];
  
  // Update session info with random message
  const messages = sessionMessages[sessionType];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  sessionInfo.textContent = randomMessage;
}

// Start next session in the Pomodoro cycle
function startNextSession() {
  if (sessionType === 'focus') {
    completedSessions++;
    
    if (completedSessions % appSettings.sessionsBeforeLongBreak === 0) {
      // Start long break
      sessionType = 'long-break';
      totalSeconds = appSettings.longBreakDuration * 60;
    } else {
      // Start short break  
      sessionType = 'short-break';
      totalSeconds = appSettings.shortBreakDuration * 60;
    }
  } else {
    // Break finished, start next focus session
    sessionType = 'focus';
    currentSession = (completedSessions % appSettings.sessionsBeforeLongBreak) + 1;
    totalSeconds = appSettings.focusDuration * 60;
  }
  
  updateSessionUI();
  updateDisplay();
  
  // Auto-start breaks, but not focus sessions
  if (sessionType !== 'focus') {
    startTimer();
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function updateDisplay() {
  document.getElementById('timer-display').textContent = formatTime(totalSeconds);

  // Update CSS-driven progress ring (0..1)
  try {
    const ring = document.querySelector('.timer-ring');
    if (ring) {
      const totalForCurrent = (sessionType === 'focus' ? appSettings.focusDuration : (sessionType === 'short-break' ? appSettings.shortBreakDuration : appSettings.longBreakDuration)) * 60;
      const progressRatio = Math.max(0, Math.min(1, totalSeconds / (totalForCurrent || 1)));
      ring.style.setProperty('--p', String(progressRatio));
    }
  } catch (e) { /* non-blocking */ }
}

function startTimer() {
  if (isRunning) {
    // Pause timer
    clearInterval(timerInterval);
    isRunning = false;
    updateStartButton('Resume');
    // Remove ticking visual when paused
    try { setTickingClass(false); } catch(e){}
  } else {
    // Start/Resume timer
    isRunning = true;
    updateStartButton('Pause');
    document.getElementById('resetButton').disabled = false;

    // Apply ticking visual when running
    try { setTickingClass(true); } catch(e){}

    timerInterval = setInterval(() => {
      totalSeconds--;
      updateDisplay();

      if (totalSeconds <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        
  // Play completion sound
  playCompletionSound();
  // Lightweight celebration
  try { burst(); } catch (e) { /* ignore */ }
        
        console.log(`${sessionType} session completed!`);
        
        // Auto-transition to next session
        setTimeout(() => {
          startNextSession();
          updateStartButton(sessionType === 'focus' ? 'Start' : 'Pause');
          if (sessionType === 'focus') {
            document.getElementById('resetButton').disabled = true;
          }
        }, 1000); // 1 second delay to hear the sound
      }
    }, 1000);
  }
}

function updateStartButton(text) {
  const button = document.getElementById('startButton');
  const textElement = button.querySelector('text');
  if (textElement) {
    textElement.textContent = text;
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  updateStartButton('Start');
  document.getElementById('resetButton').disabled = true;
  
  // Reset to focus session
  sessionType = 'focus';
  currentSession = 1;
  completedSessions = 0;
  totalSeconds = appSettings.focusDuration * 60;
  
  updateSessionUI();
  updateDisplay();
}

// Small helper to toggle visual ticking state on the main card
function setTickingClass(enabled) {
  try {
    const card = document.querySelector('.timer-card');
    if (!card) return;
    card.classList.toggle('is-ticking', !!enabled);
  } catch (e) { /* non-blocking */ }
}


// --- EVENT LISTENERS AND MODALS ---

function toggleSettingsModal(show) {
  const modal = document.getElementById('settingsModal');
  modal.classList.toggle('show', show);
}

function showCalendarModal() {
  // Navigate to the Calendar page. Use configured page path when available and
  // fallback to the repo-absolute path so GitHub Pages under /Study-Flow-Manager/ works.
  const cfg = window.SF_CONFIG || {};
  const page = (cfg.PAGES && cfg.PAGES.CALENDAR) || '/Study-Flow-Manager/performance-build/assets/pages/calendar.html';
  // Use location.assign so history/back behaves naturally
  try {
    window.location.assign(page);
  } catch (e) {
    // Last-resort fallback
    window.location.href = page;
  }
}

// Hook up button handlers
document.getElementById('startButton').addEventListener('click', startTimer);
document.getElementById('resetButton').addEventListener('click', resetTimer);
document.getElementById('settingsButton').addEventListener('click', () => toggleSettingsModal(true));

// Settings modal close button handler
document.querySelector('.settings-close-btn').addEventListener('click', () => toggleSettingsModal(false));

// Close modal when clicking outside of it
document.getElementById('settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') {
    toggleSettingsModal(false);
  }
});

// Settings change handlers
document.getElementById('theme-select').addEventListener('change', (e) => {
    changeTheme(e.target.value);
});

// Expose showCalendarModal for inline onclick handlers and attach robust listener
try {
  window.showCalendarModal = showCalendarModal;
} catch (e) { /* ignore */ }

document.addEventListener('DOMContentLoaded', () => {
  const calIcon = document.querySelector('.calendar-icon');
  if (calIcon) {
    calIcon.addEventListener('click', (e) => {
      // Defensive: ensure we navigate using the config path
      const page = (window.SF_CONFIG && window.SF_CONFIG.PAGES && window.SF_CONFIG.PAGES.CALENDAR) || '/Study-Flow-Manager/performance-build/assets/pages/calendar.html';
      try { window.location.assign(page); } catch (err) { window.location.href = page; }
    });
  }
});

// Background parallax (lightweight) — register once app is ready
(function registerParallax(){
  let raf = 0; const bg = document.getElementById('background-image');
  function onMove(e){
    if (!bg) return;
    const { innerWidth: w, innerHeight: h } = window;
    const x = (e.clientX - w/2) / w, y = (e.clientY - h/2) / h;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=> bg.style.transform = `translate(${x*6}px, ${y*6}px) scale(1.03)`);
  }
  function register(){
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        window.addEventListener('mousemove', onMove);
      }
    } catch (e) {}
  }
  if (document.body.classList.contains('ready')) register();
  else window.addEventListener('studyflow:readyToAnimate', register, { once: true });
})();

// Pending settings buffer — changes are staged here until the user clicks Save
let pendingSettings = {};

document.getElementById('focus-duration').addEventListener('change', (e) => {
    appSettings.focusDuration = parseInt(e.target.value);
    saveSettings();
    // Reset timer to new duration if not running
    if (!isRunning) {
        resetTimer();
    }
});

document.getElementById('slideshow-interval').addEventListener('change', (e) => {
    const requestedInterval = parseInt(e.target.value);
    const minInterval = getMinimumSlideshowInterval();
    
    if (requestedInterval < minInterval) {
        console.warn(`⚠️ Requested interval ${requestedInterval}s is below minimum ${minInterval}s. Using minimum.`);
        appSettings.slideshowInterval = minInterval;
        e.target.value = minInterval; // Update UI to show actual value
    } else {
        appSettings.slideshowInterval = requestedInterval;
    }
    
    saveSettings();
    // Reinitialize background system with new interval
    initializeBackgroundSystem(true);
    console.log(`🖼️ Slideshow interval updated to ${appSettings.slideshowInterval} seconds`);
});

// Pomodoro Settings Event Listeners
document.getElementById('short-break-duration').addEventListener('change', (e) => {
    appSettings.shortBreakDuration = parseInt(e.target.value);
    saveSettings();
});

document.getElementById('long-break-duration').addEventListener('change', (e) => {
    appSettings.longBreakDuration = parseInt(e.target.value);
    saveSettings();
});

document.getElementById('sessions-before-long-break').addEventListener('change', (e) => {
    appSettings.sessionsBeforeLongBreak = parseInt(e.target.value);
    saveSettings();
    // Update current session UI to reflect new total
    updateSessionUI();
});

document.getElementById('sleep-timeout').addEventListener('change', (e) => {
  // Stage new value for persistence
  const seconds = parseInt(e.target.value);
  pendingSettings.sleepTimeout = seconds;
  console.log('⚙️ Pending sleep timeout set to', pendingSettings.sleepTimeout, 'seconds');

  // Apply immediately so SleepModeManager sees the new timeout without Save
  try {
    appSettings.sleepTimeout = seconds;
    if (window.sleepManager && typeof window.sleepManager.updateSleepTimeout === 'function') {
      window.sleepManager.updateSleepTimeout();
      console.log('💤 Sleep timeout applied immediately:', seconds, 'seconds');
    }
  } catch (e) {
    console.warn('Failed to apply sleep timeout immediately', e);
  }
});

// Toggle for disabling ticking glow (staged until Save)
const disableTickChk = document.getElementById('disable-ticking-glow');
if (disableTickChk) {
  disableTickChk.addEventListener('change', (e) => {
    pendingSettings.disableTickingGlow = !!e.target.checked;
    // Allow preview: toggle body class immediately so the user sees effect before saving
    document.body.classList.toggle('no-ticking-glow', !!e.target.checked);
    console.log('⚙️ Pending disableTickingGlow set to', pendingSettings.disableTickingGlow);
  });
}

// Settings Save button applies all pending changes and notifies subsystems
const settingsSaveBtn = document.getElementById('settingsSaveBtn');
if (settingsSaveBtn) {
  settingsSaveBtn.addEventListener('click', () => {
    // Merge pending settings into appSettings
    Object.assign(appSettings, pendingSettings);

    // Apply to UI/subsystems
    try {
      applySettings();
    } catch (e) {
      console.warn('applySettings failed during Save:', e);
    }

    // Persist settings
    saveSettings();

    // Clear pending buffer
    pendingSettings = {};

    const timeoutText = appSettings.sleepTimeout === 0 ? 'disabled' : `${appSettings.sleepTimeout} seconds`;
    console.log(`💤 Settings saved. Sleep mode timeout is now: ${timeoutText}`);
  });
}


// --- INITIALIZATION ---
// Initialize Firebase with timeout protection
window.onload = async () => {
    console.log('🚀 Timer page loading...');
    
    // NOTE: This function is also defined inside initializeFirebase for successful loads.
    const hideLoadingOverlay = () => {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }
    };
    
    // Set up Firebase timeout
    let firebaseCompleted = false;
    
    // Timeout fallback
    const timeoutId = setTimeout(() => {
        if (!firebaseCompleted) {
            console.log('⚠️ Firebase initialization timeout - proceeding without it');
            hideLoadingOverlay();
            
            if (!isAuthReady) {
                userId = crypto.randomUUID();
                isAuthReady = true;
                if (typeof loadSettings === 'function') {
                    loadSettings();
                }
            }
        }
    }, 3000); // 3 second timeout
    
  try {
    // Defer Firebase initialization until the browser is idle or the user interacts with Settings.
    lazyInitFirebase();
    // Do not await here — allow the timeout fallback to proceed if Firebase is slow.
  } catch (error) {
    console.error('Failed to schedule lazy Firebase init:', error);
    hideLoadingOverlay();
    if (typeof updateBackground === 'function') {
      setTimeout(() => updateBackground(true), 100);
    }
  }
    
    // Fallback: Always ensure background loads after 2 seconds
    setTimeout(() => {
        if (typeof updateBackground === 'function') {
            updateBackground(true);
        }
    }, 2000);
};

// Also initialize Firebase when the user opens Settings (so persistence is ready sooner)
document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settingsButton');
  if (settingsBtn) settingsBtn.addEventListener('click', lazyInitFirebase, { once: true });
});