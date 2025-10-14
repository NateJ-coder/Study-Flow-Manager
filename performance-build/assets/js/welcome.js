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
  updateDebugInfo('Status: Loading critical assets for LCP...');
  
  try {
    // PERFORMANCE OPTIMIZATION: Only preload critical assets for LCP
    console.log('🚀 LCP Optimization: Preloading', CRITICAL_ASSETS.length, 'critical assets...');
    
    await preloadImages(CRITICAL_ASSETS);
    
    console.log('✅ Critical assets loaded! LCP optimized.');
    updateDebugInfo('Status: Critical assets loaded, preparing app...');
    
    // Simulate auth ready (since we removed Firebase for now)
    isAuthReady = true;
    
    // Background system removed - clean slate for new implementation
    
    // Keep loading state for smooth transition (reduced for LCP)
    setTimeout(() => {
      isLoaded = true;
      
      // Hide loading state and show continue button
      const loadingState = document.getElementById('loading-state');
      const continueButton = document.getElementById('continue-button');
      
      if (loadingState) loadingState.classList.add('hidden');
      if (continueButton) continueButton.classList.remove('hidden');
      
      updateDebugInfo('Status: Ready to continue! Background images loading lazily...');
      
      // Start lazy loading additional backgrounds after user interaction is ready
      setTimeout(() => {
        lazyLoadAdditionalBackgrounds();
      }, 2000);
      
    }, 800); // Reduced from 1500ms for faster LCP
    
  } catch (error) {
    console.error('Critical asset preloading failed:', error);
    updateDebugInfo('Status: Load failed, but you can continue');
    
    // Allow continuation even if preload fails
    setTimeout(() => {
      isLoaded = true;
      const loadingState = document.getElementById('loading-state');
      const continueButton = document.getElementById('continue-button');
      
      if (loadingState) loadingState.classList.add('hidden');
      if (continueButton) continueButton.classList.remove('hidden');
      
    }, 1000); // Faster fallback
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