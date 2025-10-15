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
const THEME_DATA = {
  AUTUMN: {
    name: 'Autumn Flow',
    bg_day: 'performance-build/assets/images/autumn-day-8.png',
    bg_night: 'performance-build/assets/images/autumn-night-1.png',
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

// Optimized Loading State - Priority-based loading
let loadingState = {
  criticalAssets: false,
  firebaseReady: false,
  userSettings: false,
  timerReady: false
};

// Performance optimization: Load only essential images first
const CRITICAL_IMAGES = [
  'performance-build/assets/images/autumn-day-8.png',
  'performance-build/assets/images/autumn-night-1.png'
];

// Load additional images in background after timer is accessible
const BACKGROUND_IMAGES_BATCH_SIZE = 8;

// All background images for complete preloading
const ALL_BACKGROUND_IMAGES = [
  // Autumn images
  'performance-build/assets/images/autumn-day-1.png',
  'performance-build/assets/images/autumn-day-2.png', 
  'performance-build/assets/images/autumn-day-3.png',
  'performance-build/assets/images/autumn-day-4.png',
  'performance-build/assets/images/autumn-day-5.png',
  'performance-build/assets/images/autumn-day-6.png',
  'performance-build/assets/images/autumn-day-7.png',
  'performance-build/assets/images/autumn-day-8.png',
  'performance-build/assets/images/autumn-night-1.png',
  'performance-build/assets/images/autumn-night-2.png',
  'performance-build/assets/images/autumn-night-3.png',
  'performance-build/assets/images/autumn-night-4.png',
  'performance-build/assets/images/autumn-night-5.png',
  'performance-build/assets/images/autumn-night-6.png',
  'performance-build/assets/images/autumn-night-7.png',
  'performance-build/assets/images/autumn-night-8.png',
  // Summer images
  'performance-build/assets/images/summer-day-1.png',
  'performance-build/assets/images/summer-day-2.png',
  'performance-build/assets/images/summer-day-3.png',
  'performance-build/assets/images/summer-day-4.png',
  'performance-build/assets/images/summer-day-5.png',
  'performance-build/assets/images/summer-day-6.png',
  'performance-build/assets/images/summer-day-7.png',
  'performance-build/assets/images/summer-day-8.png',
  'performance-build/assets/images/summer-night-1.png',
  'performance-build/assets/images/summer-night-2.png',
  'performance-build/assets/images/summer-night-3.png',
  'performance-build/assets/images/summer-night-4.png',
  'performance-build/assets/images/summer-night-5.png',
  'performance-build/assets/images/summer-night-6.png',
  'performance-build/assets/images/summer-night-7.png',
  'performance-build/assets/images/summer-night-8.png',
  // Winter images  
  'performance-build/assets/images/winter-day-1.png',
  'performance-build/assets/images/winter-day-2.png',
  'performance-build/assets/images/winter-day-3.png',
  'performance-build/assets/images/winter-day-4.png',
  'performance-build/assets/images/winter-day-5.png',
  'performance-build/assets/images/winter-day-6.png',
  'performance-build/assets/images/winter-day-7.png',
  'performance-build/assets/images/winter-night-1.png',
  'performance-build/assets/images/winter-night-2.png',
  'performance-build/assets/images/winter-night-3.png',
  'performance-build/assets/images/winter-night-4.png',
  'performance-build/assets/images/winter-night-5.png',
  'performance-build/assets/images/winter-night-6.png',
  'performance-build/assets/images/winter-night-7.png'
];

// PERFORMANCE OPTIMIZED: Only preload critical assets for LCP
const CRITICAL_ASSETS = [
  'performance-build/assets/images/welcome-page.png', // Dedicated welcome background
  'performance-build/assets/audio/click.mp3',
  'performance-build/assets/audio/splash.mp3'
];

// Background images for lazy loading (loaded by settings.js as needed)
const BACKGROUND_IMAGES = [
  'performance-build/assets/images/autumn-day-1.png',
  'performance-build/assets/images/autumn-day-2.png',
  'performance-build/assets/images/autumn-day-3.png',
  'performance-build/assets/images/autumn-day-4.png',
  'performance-build/assets/images/autumn-day-5.png',
  'performance-build/assets/images/autumn-day-6.png',
  'performance-build/assets/images/autumn-day-7.png',
  'performance-build/assets/images/autumn-day-8.png',
  'performance-build/assets/images/autumn-night-1.png',
  'performance-build/assets/images/autumn-night-2.png',
  'performance-build/assets/images/autumn-night-3.png',
  'performance-build/assets/images/summer-day-1.png',
  'performance-build/assets/images/winter-day-1.png'
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Preload images for performance
function preloadImages(urls) {
  return Promise.all(urls.map(url => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => {
        console.warn(`Failed to load: ${url}`);
        resolve(url); // Continue even if some images fail
      };
      img.src = url;
    });
  }));
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
  // Fast track: Enable timer when critical assets + Firebase are ready
  const criticalReady = loadingState.criticalAssets && loadingState.firebaseReady && loadingState.timerReady;
  
  if (criticalReady && !isLoaded) {
    isLoaded = true;
    enableContinueButton();
    console.log('✅ Critical systems ready! Timer accessible now.');
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
  
  // Update the continue button text to show progress
  const continueBtn = document.getElementById('continue-button');
  if (continueBtn && !isLoaded) {
    continueBtn.innerHTML = `
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
        Loading Critical Assets... ${percentage}%
      </div>
    `;
  }
}

// Enable the continue button when everything is ready
function enableContinueButton() {
  const continueBtn = document.getElementById('continue-button');
  if (continueBtn) {
    continueBtn.innerHTML = `
      <div class="flex items-center justify-center">
        <span class="mr-2">✅</span>
        Continue to Focus
      </div>
    `;
    continueBtn.disabled = false;
    continueBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    continueBtn.classList.add('hover-bg-amber-500', 'active-scale-98', 'hover-scale-102', 'cursor-pointer');
    
    // Remove any spinning animation and add a subtle ready pulse
    setTimeout(() => {
      continueBtn.classList.add('animate-pulse');
    }, 200);
  }
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
    
    loadingState.firebaseReady = true;
    checkLoadingComplete();
    
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
    checkLoadingComplete();
    
  } catch (error) {
    console.error('Error loading user settings:', error);
    loadingState.userSettings = true; // Continue with defaults
    checkLoadingComplete();
  }
}

function continueToApp() {
  if (isLoaded) {
    playSound('click');
    window.location.href = 'performance-build/timer.html';
  }
}

function goToTimer() {
  playSound('click');
  window.location.href = 'performance-build/timer.html';
}

function goToCalendar() {
  playSound('click');
  window.location.href = 'performance-build/calendar.html';
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
      'click': 'performance-build/assets/audio/click.mp3',
      'splash': 'performance-build/assets/audio/splash.mp3'
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
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 StudyFlow: Starting comprehensive preloading system...');
  updateDebugInfo('Status: Initializing comprehensive loading system...');
  
  // Show loading progress
  updateLoadingProgress();
  
  try {
    // Phase 1: Critical assets only (for fast LCP)
    console.log('🌟 Phase 1: Loading critical assets...');
    await preloadImages(CRITICAL_IMAGES);
    loadingState.criticalAssets = true;
    
    // Phase 2: Firebase initialization (parallel)
    console.log('🔥 Phase 2: Initializing Firebase...');
    initializeFirebaseConnection(); // Runs async
    
    // Phase 3: Enable timer immediately (fast access)
    console.log('⏱️ Phase 3: Timer ready for use...');
    loadingState.timerReady = true;
    checkLoadingComplete();
    
    // Phase 4: Background loading of remaining assets (non-blocking)
    console.log('🖼️ Phase 4: Background loading remaining assets...');
    setTimeout(() => {
      preloadRemainingAssets();
    }, 100); // Load after timer is accessible
    
    console.log('✅ Critical loading complete! Timer accessible...');
    updateDebugInfo('Status: Critical loading complete, timer accessible...');
    
  } catch (error) {
    console.error('Preloading error:', error);
    updateDebugInfo('Status: Some loading failed, but continuing...');
    
    // Mark all as ready if there's an error
    Object.keys(loadingState).forEach(key => {
      if (!loadingState[key]) loadingState[key] = true;
    });
    checkLoadingComplete();
  }
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