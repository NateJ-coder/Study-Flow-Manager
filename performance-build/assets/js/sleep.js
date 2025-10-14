// ============================================
// STUDYFLOW SLEEP MODE SYSTEM
// ============================================
// Performance-optimized sleep state for inactive periods

class SleepModeManager {
  constructor() {
    this.isInSleepMode = false;
    this.inactivityTimer = null;
    this.inactivityDelay = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.lastActivity = Date.now();
    
    // Elements to manage
    this.timerCard = null;
    this.sleepTimer = null;
    this.sleepSessionInfo = null;
    
    // Performance optimization tracking
    this.cachedImages = new Map();
    this.unusedAssets = [];
    
    this.init();
  }
  
  init() {
    this.setupActivityListeners();
    this.startInactivityTracking();
    console.log('💤 Sleep Mode Manager initialized');
  }
  
  // Setup activity detection listeners
  setupActivityListeners() {
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'touchmove', 'click', 'focus'
    ];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.recordActivity();
      }, { passive: true });
    });
  }
  
  // Record user activity and exit sleep mode if needed
  recordActivity() {
    this.lastActivity = Date.now();
    
    if (this.isInSleepMode) {
      this.exitSleepMode();
    }
    
    // Reset inactivity timer
    this.resetInactivityTimer();
  }
  
  // Start tracking inactivity
  startInactivityTracking() {
    this.resetInactivityTimer();
  }
  
  // Reset the inactivity timer
  resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    this.inactivityTimer = setTimeout(() => {
      this.enterSleepMode();
    }, this.inactivityDelay);
  }
  
  // Enter sleep mode
  enterSleepMode() {
    if (this.isInSleepMode) return;
    
    console.log('💤 Entering Sleep Mode...');
    this.isInSleepMode = true;
    
    // Performance optimizations
    this.optimizePerformance();
    
    // UI transformations
    this.hideTimerCard();
    this.createSleepTimer();
    this.startQuotesSystem();
    
    // Dispatch sleep mode event
    window.dispatchEvent(new CustomEvent('sleepModeEntered'));
  }
  
  // Exit sleep mode
  exitSleepMode() {
    if (!this.isInSleepMode) return;
    
    console.log('☀️ Exiting Sleep Mode...');
    this.isInSleepMode = false;
    
    // Restore performance
    this.restorePerformance();
    
    // UI restorations
    this.showTimerCard();
    this.removeSleepTimer();
    this.stopQuotesSystem();
    
    // Dispatch wake mode event
    window.dispatchEvent(new CustomEvent('sleepModeExited'));
  }
  
  // Hide the main timer card
  hideTimerCard() {
    this.timerCard = document.querySelector('.timer-card');
    if (this.timerCard) {
      this.timerCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      this.timerCard.style.opacity = '0';
      this.timerCard.style.transform = 'scale(0.8)';
      
      setTimeout(() => {
        this.timerCard.style.display = 'none';
      }, 500);
    }
  }
  
  // Show the main timer card
  showTimerCard() {
    if (this.timerCard) {
      this.timerCard.style.display = 'block';
      
      // Force reflow
      this.timerCard.offsetHeight;
      
      this.timerCard.style.opacity = '1';
      this.timerCard.style.transform = 'scale(1)';
    }
  }
  
  // Create minimal sleep timer at bottom center
  createSleepTimer() {
    this.sleepTimer = document.createElement('div');
    this.sleepTimer.id = 'sleep-timer';
    this.sleepTimer.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 20px 30px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 1000;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      opacity: 0;
      transition: opacity 0.5s ease;
    `;
    
    // Timer display
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'sleep-timer-display';
    timerDisplay.style.cssText = `
      font-size: 2.5rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 5px;
      letter-spacing: 0.1rem;
    `;
    
    // Session info
    this.sleepSessionInfo = document.createElement('div');
    this.sleepSessionInfo.id = 'sleep-session-info';
    this.sleepSessionInfo.style.cssText = `
      font-size: 0.9rem;
      color: #bbbbbb;
      font-weight: 500;
    `;
    
    this.sleepTimer.appendChild(timerDisplay);
    this.sleepTimer.appendChild(this.sleepSessionInfo);
    document.body.appendChild(this.sleepTimer);
    
    // Fade in
    setTimeout(() => {
      this.sleepTimer.style.opacity = '1';
    }, 100);
    
    // Update timer display and session info
    this.updateSleepTimer();
    
    // Start updating timer every second
    this.sleepTimerInterval = setInterval(() => {
      this.updateSleepTimer();
    }, 1000);
  }
  
  // Update sleep timer display
  updateSleepTimer() {
    const timerDisplay = document.getElementById('sleep-timer-display');
    const sessionInfo = document.getElementById('sleep-session-info');
    
    if (timerDisplay && window.pomodoroTimer) {
      // Get current time from main timer
      const timeLeft = window.pomodoroTimer.timeLeft;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Update session info
      if (sessionInfo && window.pomodoroTimer.settings) {
        const currentSession = window.pomodoroTimer.currentSession;
        const totalSessions = window.pomodoroTimer.settings.sessionsBeforeLongBreak;
        sessionInfo.textContent = `Session ${currentSession} of ${totalSessions}`;
      }
    }
  }
  
  // Remove sleep timer
  removeSleepTimer() {
    if (this.sleepTimerInterval) {
      clearInterval(this.sleepTimerInterval);
    }
    
    if (this.sleepTimer) {
      this.sleepTimer.style.opacity = '0';
      setTimeout(() => {
        if (this.sleepTimer && this.sleepTimer.parentNode) {
          this.sleepTimer.parentNode.removeChild(this.sleepTimer);
        }
        this.sleepTimer = null;
      }, 500);
    }
  }
  
  // Start quotes system
  startQuotesSystem() {
    if (window.QuotesSystem) {
      window.QuotesSystem.start();
    }
  }
  
  // Stop quotes system
  stopQuotesSystem() {
    if (window.QuotesSystem) {
      window.QuotesSystem.stop();
    }
  }
  
  // Performance optimizations during sleep
  optimizePerformance() {
    console.log('🔧 Optimizing performance for sleep mode...');
    
    // Reduce particle system performance if active
    if (window.particleSystem) {
      window.particleSystem.setSleepMode(true);
    }
    
    // Clear unused image caches
    this.clearUnusedAssets();
    
    // Reduce animation frame rates
    this.throttleAnimations();
    
    // Garbage collection hint (if available)
    if (window.gc) {
      window.gc();
    }
  }
  
  // Restore performance optimizations
  restorePerformance() {
    console.log('🚀 Restoring full performance...');
    
    // Restore particle system performance
    if (window.particleSystem) {
      window.particleSystem.setSleepMode(false);
    }
    
    // Restore animation frame rates
    this.restoreAnimations();
  }
  
  // Clear unused assets to free memory
  clearUnusedAssets() {
    try {
      // Clear unused preloaded images (keep current theme images)
      const currentTheme = window.currentTheme || 'AUTUMN';
      const currentImages = this.getCurrentThemeImages(currentTheme);
      
      // Identify unused images
      const allPreloadedImages = document.querySelectorAll('img[src*="performance-build/assets/images"]');
      allPreloadedImages.forEach(img => {
        if (!currentImages.includes(img.src)) {
          // Remove from cache
          img.src = '';
          img.remove();
        }
      });
      
      // Clear browser caches where possible
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('background-images')) {
              caches.delete(cacheName);
            }
          });
        });
      }
      
      console.log('🗑️ Cleared unused assets');
    } catch (error) {
      console.warn('Asset cleanup had issues:', error);
    }
  }
  
  // Get current theme images that should be preserved
  getCurrentThemeImages(theme) {
    const themeMap = {
      'AUTUMN': ['autumn-day-8.png', 'autumn-night-1.png'],
      'SUMMER': ['summer-day-1.png', 'summer-night-1.png'],
      'WINTER': ['winter-day-1.png', 'winter-night-1.png']
    };
    
    return themeMap[theme] || themeMap['AUTUMN'];
  }
  
  // Throttle animations during sleep
  throttleAnimations() {
    // Reduce slideshow update frequency
    if (window.slideshowSystem) {
      window.slideshowSystem.setSleepMode(true);
    }
  }
  
  // Restore normal animation rates
  restoreAnimations() {
    // Restore slideshow update frequency
    if (window.slideshowSystem) {
      window.slideshowSystem.setSleepMode(false);
    }
  }
  
  // Get current sleep mode status
  isAsleep() {
    return this.isInSleepMode;
  }
  
  // Force sleep mode (for testing)
  forceSleep() {
    this.enterSleepMode();
  }
  
  // Force wake (for testing)
  forceWake() {
    this.exitSleepMode();
  }
}

// Initialize sleep mode manager when DOM is ready
let sleepManager = null;

function initializeSleepMode() {
  if (!sleepManager) {
    sleepManager = new SleepModeManager();
    
    // Make available globally for debugging
    window.sleepManager = sleepManager;
    
    console.log('💤 Sleep Mode System Ready');
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSleepMode);
} else {
  initializeSleepMode();
}

// Export for external use
window.SleepModeManager = SleepModeManager;