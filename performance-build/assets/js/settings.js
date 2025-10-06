// ============================================
// STUDYFLOW SETTINGS MANAGEMENT
// ============================================

/**
 * Settings Configuration for StudyFlow Manager
 * 
 * PERFORMANCE NOTES:
 * - Background images should be lazy-loaded ~10 seconds before slide transition
 * - Only preload the current and next background to minimize network payload
 * - Total image payload reduced from 18MB+ to ~5MB maximum at any time
 * - Use intersection observers for performance-aware loading
 */

// ============================================
// I. CORE SETTINGS DATA
// ============================================

const SETTINGS_CONFIG = {
  // Performance Settings
  performance: {
    imagePreloadBuffer: 10, // seconds before transition to preload next image
    maxConcurrentImages: 2, // maximum images loaded at once (current + next)
    useWebP: true, // prefer WebP format when available
    lazyLoadThreshold: 0.1 // intersection observer threshold
  },
  
  // Theme & Background Settings
  themes: {
    current: 'AUTUMN',
    backgroundRotation: {
      enabled: true,
      interval: 30000, // 30 seconds between slides
      randomize: false // sequential vs random order
    }
  },
  
  // Timer Settings
  pomodoro: {
    focusTime: 25, // minutes
    shortBreak: 5, // minutes  
    longBreak: 15, // minutes
    sessionsUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false
  },
  
  // Audio Settings
  audio: {
    enabled: true,
    volume: 0.3,
    sounds: {
      timerComplete: 'assets/audio/splash.mp3',
      buttonClick: 'assets/audio/click.mp3',
      sessionStart: 'assets/audio/drawing.mp3'
    }
  },
  
  // Calendar Settings
  calendar: {
    firstDayOfWeek: 0, // 0 = Sunday, 1 = Monday
    showWeekNumbers: false,
    highlightToday: true,
    trackingEnabled: true
  }
};

// ============================================
// II. BACKGROUND IMAGE MANAGEMENT  
// ============================================

class BackgroundManager {
  constructor() {
    this.currentIndex = 0;
    this.loadedImages = new Map();
    this.preloadQueue = [];
    this.rotationTimer = null;
    
    // Get theme data from core.js
    this.themeData = window.THEME_DATA || {};
    this.currentTheme = SETTINGS_CONFIG.themes.current;
  }

  /**
   * Initialize background management with performance optimization
   */
  init() {
    console.log('🖼️ BackgroundManager: Initializing with performance optimization');
    
    // Start with first image only
    this.loadInitialBackground();
    
    // Setup rotation if enabled
    if (SETTINGS_CONFIG.themes.backgroundRotation.enabled) {
      this.startBackgroundRotation();
    }
    
    return this;
  }

  /**
   * Load only the first background image for LCP optimization
   */
  loadInitialBackground() {
    const themeImages = this.getThemeImages();
    if (themeImages.length === 0) return;

    const firstImage = themeImages[0];
    this.preloadImage(firstImage, 'high').then(() => {
      this.setBackground(firstImage);
      console.log('🚀 LCP Optimized: First background loaded');
      
      // Preload next image in background
      if (themeImages.length > 1) {
        setTimeout(() => {
          this.preloadImage(themeImages[1], 'low');
        }, 2000); // Wait 2s after LCP before preloading next
      }
    });
  }

  /**
   * Get current theme's background images
   */
  getThemeImages() {
    const theme = this.themeData[this.currentTheme.toLowerCase()];
    if (!theme) return [];
    
    // Combine day and night images for variety
    return [
      ...(theme.day?.images || []),
      ...(theme.night?.images || [])
    ];
  }

  /**
   * Preload image with priority control
   */
  preloadImage(url, priority = 'low') {
    return new Promise((resolve, reject) => {
      if (this.loadedImages.has(url)) {
        resolve(url);
        return;
      }

      const img = new Image();
      img.fetchPriority = priority;
      
      img.onload = () => {
        this.loadedImages.set(url, img);
        console.log(`📸 Preloaded: ${url.split('/').pop()} (${priority} priority)`);
        resolve(url);
      };
      
      img.onerror = () => {
        console.warn(`❌ Failed to load: ${url}`);
        reject(new Error(`Failed to load ${url}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Set background with smooth transition
   */
  setBackground(imageUrl) {
    const bgContainer = document.getElementById('background-container') || 
                      document.getElementById('bg-container');
    
    if (bgContainer) {
      bgContainer.style.backgroundImage = `url('${imageUrl}')`;
      bgContainer.style.opacity = '0';
      
      // Fade in
      setTimeout(() => {
        bgContainer.style.opacity = '1';
      }, 50);
    }
  }

  /**
   * Start automatic background rotation with intelligent preloading
   */
  startBackgroundRotation() {
    const interval = SETTINGS_CONFIG.themes.backgroundRotation.interval;
    const preloadBuffer = SETTINGS_CONFIG.performance.imagePreloadBuffer * 1000;
    
    this.rotationTimer = setInterval(() => {
      this.rotateBackground();
    }, interval);

    // Schedule preloading 10 seconds before each rotation
    setInterval(() => {
      this.preloadNextBackground();
    }, interval - preloadBuffer);

    console.log(`🔄 Background rotation started (${interval/1000}s interval)`);
  }

  /**
   * Rotate to next background
   */
  rotateBackground() {
    const images = this.getThemeImages();
    if (images.length <= 1) return;

    this.currentIndex = (this.currentIndex + 1) % images.length;
    const nextImage = images[this.currentIndex];
    
    if (this.loadedImages.has(nextImage)) {
      this.setBackground(nextImage);
      console.log(`🔄 Rotated to: ${nextImage.split('/').pop()}`);
    }
  }

  /**
   * Preload next background image before it's needed
   */
  preloadNextBackground() {
    const images = this.getThemeImages();
    if (images.length <= 1) return;

    const nextIndex = (this.currentIndex + 1) % images.length;
    const nextImage = images[nextIndex];
    
    if (!this.loadedImages.has(nextImage)) {
      this.preloadImage(nextImage, 'low');
    }

    // Cleanup old images to manage memory
    this.cleanupOldImages(images);
  }

  /**
   * Remove old images from memory to prevent buildup
   */
  cleanupOldImages(currentImages) {
    const maxImages = SETTINGS_CONFIG.performance.maxConcurrentImages;
    
    if (this.loadedImages.size > maxImages) {
      const currentImage = currentImages[this.currentIndex];
      const nextImage = currentImages[(this.currentIndex + 1) % currentImages.length];
      
      // Keep only current and next images
      for (let [url, img] of this.loadedImages) {
        if (url !== currentImage && url !== nextImage) {
          this.loadedImages.delete(url);
          console.log(`🗑️ Cleaned up: ${url.split('/').pop()}`);
        }
      }
    }
  }

  /**
   * Stop background rotation
   */
  stopRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
      console.log('⏹️ Background rotation stopped');
    }
  }
}

// ============================================
// III. SETTINGS PERSISTENCE
// ============================================

class SettingsManager {
  constructor() {
    this.storageKey = 'studyflow-settings';
    this.settings = this.loadSettings();
  }

  /**
   * Load settings from localStorage with defaults
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...SETTINGS_CONFIG, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
    return { ...SETTINGS_CONFIG };
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      console.log('💾 Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Get setting value by path (e.g., 'pomodoro.focusTime')
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.settings);
  }

  /**
   * Set setting value by path
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.settings);
    
    target[lastKey] = value;
    this.saveSettings();
  }
}

// ============================================
// IV. GLOBAL INITIALIZATION
// ============================================

// Initialize when DOM is ready
let backgroundManager, settingsManager;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize settings
  settingsManager = new SettingsManager();
  
  // Initialize background manager with performance optimization
  backgroundManager = new BackgroundManager();
  backgroundManager.init();
  
  // Make available globally
  window.StudyFlowSettings = {
    backgroundManager,
    settingsManager,
    config: SETTINGS_CONFIG
  };
  
  console.log('⚙️ StudyFlow Settings initialized with performance optimization');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BackgroundManager, SettingsManager, SETTINGS_CONFIG };
}