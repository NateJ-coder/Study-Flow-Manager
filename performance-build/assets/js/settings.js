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

    // Use the preloaded LCP image first (already in HTML)
    const lcpImage = 'assets/images/autumn-day-8.png';
    const firstImage = themeImages.includes(lcpImage) ? lcpImage : themeImages[0];
    
    // Set background immediately if it's the LCP image (already preloaded)
    if (firstImage === lcpImage) {
      this.setBackground(firstImage);
      this.loadedImages.set(firstImage, true); // Mark as loaded
      console.log('🚀 LCP Optimized: Using preloaded background');
      
      // Start preloading next images after LCP
      setTimeout(() => {
        this.preloadNextImages(themeImages);
      }, 1000);
    } else {
      // Fallback for non-autumn themes
      this.preloadImage(firstImage, 'high').then(() => {
        this.setBackground(firstImage);
        console.log('🚀 LCP Optimized: First background loaded');
        
        setTimeout(() => {
          this.preloadNextImages(themeImages);
        }, 2000);
      });
    }
  }

  /**
   * Preload next 2-3 images for smooth transitions
   */
  preloadNextImages(themeImages) {
    if (themeImages.length <= 1) return;
    
    // Preload next 2 images for smoother transitions
    const preloadCount = Math.min(3, themeImages.length);
    for (let i = 1; i < preloadCount; i++) {
      if (i < themeImages.length) {
        setTimeout(() => {
          this.preloadImage(themeImages[i], 'low');
        }, i * 500); // Stagger preloading every 500ms
      }
    }
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
      console.log(`🖼️ Setting background to: ${imageUrl}`);
      
      // Fade out
      bgContainer.style.opacity = '0.3';
      
      setTimeout(() => {
        bgContainer.style.backgroundImage = `url('${imageUrl}')`;
        
        // Fade back in
        setTimeout(() => {
          bgContainer.style.opacity = '1';
        }, 100);
      }, 300);
    } else {
      console.warn('❌ Background container not found');
    }
  }

  /**
   * Start automatic background rotation with intelligent preloading
   */
  startBackgroundRotation() {
    const interval = SETTINGS_CONFIG.themes.backgroundRotation.interval;
    const preloadBuffer = Math.max(5000, SETTINGS_CONFIG.performance.imagePreloadBuffer * 1000); // Minimum 5s buffer
    
    this.rotationTimer = setInterval(() => {
      console.log('🔄 Timer triggered - rotating background');
      this.rotateBackground();
    }, interval);

    // Schedule preloading at least 5 seconds before each rotation
    this.preloadTimer = setInterval(() => {
      this.preloadNextBackground();
    }, interval - preloadBuffer);

    console.log(`🔄 Background rotation started (${interval/1000}s interval) with ${preloadBuffer/1000}s preload buffer for ${this.getThemeImages().length} images`);
  }

  /**
   * Rotate to next background
   */
  rotateBackground() {
    const images = this.getThemeImages();
    console.log(`🔄 Attempting rotation - ${images.length} images available`);
    
    if (images.length <= 1) {
      console.log('❌ Not enough images for rotation');
      return;
    }

    this.currentIndex = (this.currentIndex + 1) % images.length;
    const nextImage = images[this.currentIndex];
    
    console.log(`🔄 Next image: ${nextImage} (index: ${this.currentIndex})`);
    
    if (this.loadedImages.has(nextImage)) {
      this.setBackground(nextImage);
      console.log(`✅ Rotated to: ${nextImage.split('/').pop()}`);
    } else {
      console.log(`❌ Image not preloaded: ${nextImage}`);
      // Try to load it now
      this.preloadImage(nextImage, 'high').then(() => {
        this.setBackground(nextImage);
        console.log(`✅ Loaded and rotated to: ${nextImage.split('/').pop()}`);
      });
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
    }
    if (this.preloadTimer) {
      clearInterval(this.preloadTimer);
      this.preloadTimer = null;
    }
    console.log('⏹️ Background rotation stopped');
  }

  /**
   * Update slideshow timing with minimum constraint
   */
  updateSlideshowTiming(newInterval) {
    // Enforce minimum 20-second interval (20000ms) for proper preloading
    const MIN_INTERVAL = 20000;
    const safeInterval = Math.max(newInterval, MIN_INTERVAL);
    
    if (newInterval < MIN_INTERVAL) {
      console.warn(`⚠️ Slideshow interval ${newInterval/1000}s below minimum. Using ${MIN_INTERVAL/1000}s instead.`);
    }
    
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    
    SETTINGS_CONFIG.themes.backgroundRotation.interval = safeInterval;
    
    if (SETTINGS_CONFIG.themes.backgroundRotation.enabled) {
      this.startBackgroundRotation();
    }
    
    console.log(`🔄 Slideshow timing updated to ${safeInterval/1000}s`);
    return safeInterval;
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