// ============================================
// STUDYFLOW WELCOME PAGE APPLICATION
// ============================================

// Page States
const PAGE_STATE = {
  WELCOME: 'welcome',
  TIMER: 'timer',
  CALENDAR: 'calendar'
};

// Theme Configuration (matches your existing structure)
const THEME_DATA = (window.SF_CONFIG && window.SF_CONFIG.THEME_DATA) || {
  AUTUMN: {
    name: 'Autumn Flow',
    bg_day: (window.SF_CONFIG && window.SF_CONFIG.IMAGES && window.SF_CONFIG.IMAGES.AUTUMN_DAY) || '/Study-Flow-Manager/performance-build/assets/images/autumn-day-8.png',
    bg_night: (window.SF_CONFIG && window.SF_CONFIG.IMAGES && window.SF_CONFIG.IMAGES.AUTUMN_NIGHT) || '/Study-Flow-Manager/performance-build/assets/images/autumn-night-1.png',
    primary_color: 'text-amber-300',
    secondary_color: 'text-amber-500',
    button_bg: 'bg-amber-600/70',
    button_hover: 'hover:bg-amber-500/80'
  }
};

// Application State
let currentPage = PAGE_STATE.WELCOME;
let currentTheme = 'AUTUMN';
let isLoaded = false;
let isAuthReady = false;

// Loading state used by the welcome flow (critical vs non-critical)
const loadingState = {
  criticalAssets: false,
  firebaseReady: false,
  userSettings: false,
  timerReady: false
};

// Comprehensive Preloading System
let preloadState = {
  timerCSS: false,
  timerJS: false,
  particleCSS: false,
  particleJS: false,
  seasonalBackgrounds: false,
  firebaseReady: false,
  totalProgress: 0
};

// Timer page critical resources for preloading
const TIMER_RESOURCES = (window.SF_CONFIG && window.SF_CONFIG.TIMER_RESOURCES) || {
  css: [
    (window.SF_CONFIG && window.SF_CONFIG.CSS && window.SF_CONFIG.CSS.TIMER) || '/Study-Flow-Manager/performance-build/assets/css/timer.css',
    (window.SF_CONFIG && window.SF_CONFIG.CSS && window.SF_CONFIG.CSS.PARTICLES) || '/Study-Flow-Manager/performance-build/assets/css/particles.css'
  ],
  js: [
    (window.SF_CONFIG && window.SF_CONFIG.JS && window.SF_CONFIG.JS.TIMER) || '/Study-Flow-Manager/performance-build/assets/js/timer.js',
    (window.SF_CONFIG && window.SF_CONFIG.JS && window.SF_CONFIG.JS.PARTICLE) || '/Study-Flow-Manager/performance-build/assets/js/particle.js'
  ],
  backgrounds: (window.SF_CONFIG && window.SF_CONFIG.BACKGROUND_IMAGES) || [
    '/Study-Flow-Manager/performance-build/assets/images/autumn-day-1.png',
    '/Study-Flow-Manager/performance-build/assets/images/autumn-night-1.png',
    '/Study-Flow-Manager/performance-build/assets/images/summer-day-1.png', 
    '/Study-Flow-Manager/performance-build/assets/images/summer-night-1.png',
    '/Study-Flow-Manager/performance-build/assets/images/winter-day-1.png',
    '/Study-Flow-Manager/performance-build/assets/images/winter-night-1.png'
  ]
};

// Performance optimization: Load only essential images first
const CRITICAL_IMAGES = (window.SF_CONFIG && window.SF_CONFIG.CRITICAL_IMAGES) || (
  (window.SF_CONFIG && window.SF_CONFIG.IMAGES && window.SF_CONFIG.IMAGES.AUTUMN_DAY) && (window.SF_CONFIG && window.SF_CONFIG.IMAGES && window.SF_CONFIG.IMAGES.AUTUMN_NIGHT) ?
    [window.SF_CONFIG.IMAGES.AUTUMN_DAY, window.SF_CONFIG.IMAGES.AUTUMN_NIGHT] :
    ['/Study-Flow-Manager/performance-build/assets/images/autumn-day-8.png','/Study-Flow-Manager/performance-build/assets/images/autumn-night-1.png']
);

// Load additional images in background after timer is accessible
const BACKGROUND_IMAGES_BATCH_SIZE = 8;

// All background images are centralized in config
const ALL_BACKGROUND_IMAGES = (window.SF_CONFIG && window.SF_CONFIG.ALL_BACKGROUND_IMAGES) || [];

// PERFORMANCE OPTIMIZED: Only preload critical assets for LCP
const CRITICAL_ASSETS = (window.SF_CONFIG && window.SF_CONFIG.CRITICAL_ASSETS) || [];

// Background images for lazy loading (loaded by settings.js as needed)
const BACKGROUND_IMAGES = (window.SF_CONFIG && window.SF_CONFIG.BACKGROUND_IMAGES) || ALL_BACKGROUND_IMAGES;

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Preload images for performance
function preloadImages(urls) {
  // Respect the provided list only — batches should only preload what they're given
  const list = Array.from(new Set(urls || []));
  return Promise.all(list.map(url => {
    if (/\.(webp|png|jpg|jpeg|gif|avif|svg)$/i.test(url)) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => {
          console.warn(`Failed to load: ${url}`);
          resolve(url);
        };
        img.src = url;
      });
    } else if (/\.(css)$/i.test(url)) {
      return fetch(url, {cache: 'force-cache'}).then(r => r.ok ? url : Promise.resolve(url));
    } else if (/\.(js)$/i.test(url)) {
      return fetch(url, {cache: 'force-cache'}).then(r => r.ok ? url : Promise.resolve(url));
    } else if (/\.(mp3|wav|ogg)$/i.test(url)) {
      return fetch(url, {cache: 'force-cache'}).then(r => r.ok ? url : Promise.resolve(url));
    } else {
      return Promise.resolve(url);
    }
  }));
}

// Optional helper to preload the full configured set (use sparingly)
function preloadAllAssets() {
  const configCritical = (window.SF_CONFIG && window.SF_CONFIG.CRITICAL_ASSETS) || [];
  const configAll = (window.SF_CONFIG && window.SF_CONFIG.ALL_BACKGROUND_IMAGES) || [];
  const allAssets = Array.from(new Set([...configCritical, ...configAll]));
  return preloadImages(allAssets);
}

// Update debug info
function updateDebugInfo(message) {
  const debugElement = document.getElementById('debug-info');
  if (debugElement) {
    debugElement.textContent = message;
  }
}

// Background loading of remaining assets (non-blocking)
async function preloadRemainingAssets() {
  try {
    console.log('🎨 Background loading: Additional images...');
    
    // Load background images in batches to avoid overwhelming the browser
    for (let i = 0; i < ALL_BACKGROUND_IMAGES.length; i += BACKGROUND_IMAGES_BATCH_SIZE) {
      const batch = ALL_BACKGROUND_IMAGES.slice(i, i + BACKGROUND_IMAGES_BATCH_SIZE);
      await preloadImages(batch);
      console.log(`📦 Loaded batch ${Math.floor(i / BACKGROUND_IMAGES_BATCH_SIZE) + 1}`);
    }
    
    console.log('🎉 Background loading complete!');
  } catch (error) {
    console.warn('Background loading had some issues:', error);
  }
}

// ============================================
// PAGE NAVIGATION FUNCTIONS
// ============================================

function showPage(pageId) {
  // Hide all pages
  ['welcome-screen', 'timer-screen', 'calendar-screen'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.add('hidden');
    }
  });

  // Show target page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.remove('hidden');
  }

  // Update current page state
  currentPage = pageId.replace('-screen', '');
}

// Check if all loading is complete
function checkLoadingComplete() {
  // Debug current state
  console.log('🔍 Loading state check:', {
    criticalAssets: loadingState.criticalAssets,
    firebaseReady: loadingState.firebaseReady,
    userSettings: loadingState.userSettings,
    timerReady: loadingState.timerReady,
    isLoaded: isLoaded
  });
  
  // Fast track: Enable timer when critical assets are ready (Firebase is optional)
  const criticalReady = loadingState.criticalAssets && loadingState.timerReady;
  
  if (criticalReady && !isLoaded) {
    isLoaded = true;
    enableContinueButton();
    console.log('✅ Critical systems ready! Timer accessible now.');
    console.log('🔥 Firebase status:', loadingState.firebaseReady ? 'Ready' : 'Still loading...');
    updateDebugInfo('Status: Timer ready for use! Background loading continues...');
    return;
  }
  
  updateLoadingProgress();
}

// Update loading progress display
function updateLoadingProgress() {
  // Don't update if already loaded to prevent overwriting the checkmark
  if (isLoaded) return;
  
  const completed = Object.values(loadingState).filter(state => state === true).length;
  const total = Object.keys(loadingState).length;
  const percentage = Math.round((completed / total) * 100);
  
  // Update the continue button text to show progress (minimal text)
  const continueBtn = document.getElementById('continue-button');
  if (continueBtn && !isLoaded) {
    continueBtn.innerHTML = `
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" aria-hidden="true"></div>
        Loading... ${percentage}%
      </div>
    `;
  }
}

// Enable the continue button when everything is ready
function enableContinueButton() {
  const continueBtn = document.getElementById('continue-button');
  if (!continueBtn) return;
  // Set clean final text (icon provided by CSS pseudo-element)
  continueBtn.innerHTML = `
    <div class="flex items-center justify-center">
      Continue to Focus
    </div>
  `;
  continueBtn.disabled = false;
  continueBtn.classList.remove('opacity-75', 'cursor-not-allowed');
  continueBtn.classList.add('hover-bg-amber-500', 'active-scale-98', 'hover-scale-102', 'cursor-pointer');
  // Announce readiness to assistive tech
  try { continueBtn.setAttribute('aria-busy', 'false'); } catch (e) { /* ignore */ }

  // Add a subtle slow pulse and a CSS-provided checkmark using a pseudo-element
  setTimeout(() => {
    continueBtn.classList.add('animate-pulse-slow');
    continueBtn.classList.add('ready-with-check');
  }, 200);
}

// Initialize Firebase connection
async function initializeFirebaseConnection() {
  try {
    // Import Firebase modules
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
    const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
    const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
    
    // Firebase config
    const firebaseConfig = {
      apiKey: "AIzaSyDiY_fxXuLNSTgpPIiHTkmvSAlT-Owqkgc",
      authDomain: "studyflowapp-2dfd0.firebaseapp.com",
      projectId: "studyflowapp-2dfd0",
      storageBucket: "studyflowapp-2dfd0.firebasestorage.app",
      messagingSenderId: "292997866503",
      appId: "1:292997866503:web:a999c0ef9d3f06b61136a2",
      measurementId: "G-CEJ384DE17"
    };
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    // Sign in anonymously
    const userCredential = await signInAnonymously(auth);
    console.log('🔥 Firebase initialized and user authenticated');
    
    preloadState.firebaseReady = true;
    updatePreloadProgress();
    
    // Load user settings
    await loadUserSettings(db, userCredential.user.uid);
    
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    loadingState.firebaseReady = true; // Continue without Firebase
    loadingState.userSettings = true;
    checkLoadingComplete();
  }
}

// Load user settings from Firestore
async function loadUserSettings(db, userId) {
  try {
    const settingsRef = doc(db, 'artifacts', 'studyflowapp-2dfd0', 'users', userId, 'settings', 'general');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      console.log('👤 User settings loaded from Firestore');
    } else {
      console.log('👤 No existing user settings found, will use defaults');
    }
    
    loadingState.userSettings = true;
    
    // FIX: Add the missing 'timerReady' flag to complete the loading sequence (4/4 tasks)
    loadingState.timerReady = true;
    
    console.log('✅ User settings and timer initialization complete');
    checkLoadingComplete();
    
  } catch (error) {
    console.error('Error loading user settings:', error);
    loadingState.userSettings = true; // Continue with defaults
    
    // FIX: Also set timerReady flag in error case
    loadingState.timerReady = true;
    
    checkLoadingComplete();
  }
}

async function continueToApp() {
  if (window.__navigating) return;
  window.__navigating = true;
  playSound('click');

  // 1) Cross-fade overlay
  const veil = document.createElement('div');
  Object.assign(veil.style, {
    position: 'fixed', inset: '0', background: '#000', opacity: '0', transition: 'opacity 300ms ease', zIndex: '9999'
  });
  document.body.appendChild(veil);
  // Fade in using rAF to avoid forcing layout/reflow
  requestAnimationFrame(() => { veil.style.opacity = '1'; });

  // 2) Warm the timer (race preloader vs cap)
  const CAP_MS = 1200;
  const MIN_MS = 300;
  const cap = new Promise(r => setTimeout(r, CAP_MS));
  const min = new Promise(r => setTimeout(r, MIN_MS));

  try { await Promise.race([preloadTimerResources(), cap]); } catch (e) { /* non-blocking */ }
  await min;

  // 3) Navigate (use config path if present)
  const url = (window.SF_CONFIG && window.SF_CONFIG.PAGES && window.SF_CONFIG.PAGES.TIMER) || '/Study-Flow-Manager/performance-build/assets/pages/timer.html';
  try { window.location.assign(url); } catch (e) { window.location.href = url; }
}

function goToTimer() {
  playSound('click');
    window.location.href = (window.SF_CONFIG && window.SF_CONFIG.PAGES && window.SF_CONFIG.PAGES.TIMER) || '/Study-Flow-Manager/performance-build/assets/pages/timer.html';
}

function goToCalendar() {
  playSound('click');
    window.location.href = (window.SF_CONFIG && window.SF_CONFIG.PAGES && window.SF_CONFIG.PAGES.CALENDAR) || '/Study-Flow-Manager/performance-build/assets/pages/calendar.html';
}

function goToWelcome() {
  showPage('welcome-screen');
  playSound('click');
  updateDebugInfo('Status: Welcome page');
}

// ============================================
// AUDIO FUNCTIONS
// ============================================

function playSound(soundName) {
  try {
    const soundMap = {
  'click': (window.SF_CONFIG && window.SF_CONFIG.AUDIO && window.SF_CONFIG.AUDIO.CLICK) || '/Study-Flow-Manager/performance-build/assets/audio/click.mp3',
  'splash': (window.SF_CONFIG && window.SF_CONFIG.AUDIO && window.SF_CONFIG.AUDIO.SPLASH) || '/Study-Flow-Manager/performance-build/assets/audio/splash.mp3'
    };
    
    if (soundMap[soundName]) {
      const audio = new Audio(soundMap[soundName]);
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (autoplay restrictions)
      });
    }
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
}

// ============================================
// PRELOADING SYSTEM
// ============================================

// Preload CSS files
async function preloadCSS(urls) {
  const promises = urls.map(url => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = url;
      link.onload = () => resolve(url);
      link.onerror = () => reject(new Error(`Failed to preload CSS: ${url}`));
      document.head.appendChild(link);
    });
  });
  
  return Promise.all(promises);
}

// Preload JS files  
async function preloadJS(urls) {
  const promises = urls.map(url => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = url;
      link.onload = () => resolve(url);
      link.onerror = () => reject(new Error(`Failed to preload JS: ${url}`));
      document.head.appendChild(link);
    });
  });
  
  return Promise.all(promises);
}

// Preload background images
async function preloadBackgrounds(urls) {
  const promises = urls.map(url => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
      img.src = url;
    });
  });
  
  return Promise.all(promises);
}

// Update loading progress and button state
function updatePreloadProgress() {
  const totalSteps = Object.keys(preloadState).length - 1; // -1 for totalProgress
  const completedSteps = Object.entries(preloadState)
    .filter(([key, value]) => key !== 'totalProgress' && value === true)
    .length;
  
  preloadState.totalProgress = Math.round((completedSteps / totalSteps) * 100);
  
  const buttonText = document.getElementById('button-text');
  const continueButton = document.getElementById('continue-button');
  
  if (buttonText) {
    if (preloadState.totalProgress < 100) {
      buttonText.textContent = `Loading timer... ${preloadState.totalProgress}%`;
    } else {
      buttonText.textContent = 'Continue to Focus';
      continueButton.classList.remove('opacity-75', 'cursor-not-allowed');
      continueButton.classList.add('hover:bg-amber-500', 'hover:border-amber-700');
      continueButton.disabled = false;
      // Make sure the progress metric reflects that the UI is ready
      preloadState.totalProgress = 100;
    }
  }
  
  console.log(`📊 Preload Progress: ${preloadState.totalProgress}% (${completedSteps}/${totalSteps} steps)`);
}

// Comprehensive preloading of timer page resources
async function preloadTimerResources() {
  console.log('🎯 Starting comprehensive timer resource preloading...');
  
  try {
    // Step 1: CSS files
    console.log('🎨 Preloading timer CSS files...');
    await preloadCSS(TIMER_RESOURCES.css);
    preloadState.timerCSS = true;
    preloadState.particleCSS = true;
    updatePreloadProgress();
    
    // Step 2: JavaScript files  
    console.log('⚙️ Preloading timer JS files...');
    await preloadJS(TIMER_RESOURCES.js);
    preloadState.timerJS = true;
    preloadState.particleJS = true;
    updatePreloadProgress();
    
    // Step 3: Critical background images (one per season/time)
    console.log('🖼️ Preloading seasonal backgrounds...');
    await preloadBackgrounds(TIMER_RESOURCES.backgrounds);
    preloadState.seasonalBackgrounds = true;
    updatePreloadProgress();
    
    console.log('✅ Timer resources preloaded successfully!');
  // Mark critical assets ready for welcome flow if someone relies on loadingState
  if (typeof loadingState !== 'undefined') loadingState.criticalAssets = true;
    return true;
    
  } catch (error) {
    console.error('❌ Timer preloading failed:', error);
    // Continue anyway to avoid blocking the user
    Object.keys(preloadState).forEach(key => {
      if (key !== 'totalProgress') preloadState[key] = true;
    });
    updatePreloadProgress();
    return false;
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Welcome: preloading only critical welcome assets...');
  try {
    // Preload only the welcome critical imagery so hero is crisp and button enables quickly
    await preloadImages(CRITICAL_IMAGES);
  } catch (e) {
    console.warn('Non-blocking: welcome critical image preload failed', e);
  }

  // Mark welcome as loaded and enable continue button quickly
  isLoaded = true;
  loadingState.criticalAssets = true;
  enableContinueButton();
  // Ensure the button is wired even if inline handlers can't see local scope
  try { wireButtonOnce(); } catch (e) { /* non-blocking */ }
  updateDebugInfo('Status: Welcome ready. Timer preloads deferred until navigation.');
});

// ============================================
// LAZY LOADING FOR NON-CRITICAL BACKGROUNDS
// ============================================

function lazyLoadAdditionalBackgrounds() {
  console.log('🖼️ Starting lazy load of additional backgrounds...');
  
  // Load one background every 3 seconds to avoid network congestion
  let index = 0;
  const loadNext = () => {
    if (index < BACKGROUND_IMAGES.length) {
      const img = BACKGROUND_IMAGES[index];
      if (img !== 'performance-build/assets/images/autumn-day-8.png') { // Skip already loaded
        preloadImages([img]).then(() => {
          console.log(`📸 Lazy loaded: ${img.split('/').pop()}`);
        }).catch(() => {
          console.warn(`❌ Failed to lazy load: ${img}`);
        });
      }
      index++;
      setTimeout(loadNext, 3000); // 3 second delay between loads
    } else {
      console.log('✅ All background images loaded via lazy loading');
      updateDebugInfo('Status: All assets ready! Enjoy StudyFlow.');
    }
  };
  
  // Start lazy loading after a short delay
  setTimeout(loadNext, 1000);
}

// Add keyboard navigation
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && isLoaded && currentPage === 'welcome') {
    continueToApp();
  }
});

console.log('StudyFlow Welcome Page initialized successfully!');

// Make inline onclick handlers work in all setups (CSP, bundlers, etc.)
window.continueToApp = continueToApp;
window.goToTimer     = goToTimer;
window.goToCalendar  = goToCalendar;
window.goToWelcome   = goToWelcome;

// Wire the continue button with a safe listener so clicks work even when
// the inline attribute isn't resolved to a global function (some bundlers/CSPs).
function wireButtonOnce() {
  const btn = document.getElementById('continue-button');
  if (!btn) return;
  btn.removeAttribute('disabled');
  // Ensure the listener exists; using passive=false to allow default prevention later if needed
  btn.addEventListener('click', continueToApp, { passive: true });
}