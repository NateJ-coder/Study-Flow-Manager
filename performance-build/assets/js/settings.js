// ============================================
// STUDYFLOW SETTINGS MANAGEMENT
// ============================================

/**
 * Settings Configuration for StudyFlow Manager
 * Background image management has been completely removed.
 * Clean slate for new background system implementation.
 */

// ============================================
// I. CORE SETTINGS DATA
// ============================================

const SETTINGS_CONFIG = {
  // Performance Settings
  performance: {
    imagePreloadBuffer: 5, // minimum 5 seconds before transition to preload next image
    minSlideshowInterval: 20000, // minimum 20 seconds between slides - cannot be bypassed
    maxConcurrentImages: 2, // maximum images loaded at once (current + next)
    useWebP: true, // prefer WebP format when available
    lazyLoadThreshold: 0.1 // intersection observer threshold
  },
  
  // Theme & Background Settings
  themes: {
    current: 'autumn',
    backgroundRotation: {
      enabled: true,
      interval: 20000, // 20 seconds minimum - enforced by validation
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
// II. SETTINGS PERSISTENCE
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
        const parsed = JSON.parse(stored);
        return {...SETTINGS_CONFIG, ...parsed};
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    return {...SETTINGS_CONFIG};
  }

  /**
   * Save current settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      console.log('✅ Settings saved to localStorage');
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
    }
  }

  /**
   * Get a setting value by path (e.g., 'themes.current')
   */
  get(path) {
    const keys = path.split('.');
    return keys.reduce((obj, key) => obj && obj[key], this.settings);
  }

  /**
   * Set a setting value by path and save
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
// III. GLOBAL INITIALIZATION
// ============================================

// Initialize when DOM is ready
let settingsManager;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize settings
  settingsManager = new SettingsManager();
  
  // Make available globally
  window.StudyFlowSettings = {
    settingsManager,
    config: SETTINGS_CONFIG
  };
  
  console.log('⚙️ StudyFlow Settings initialized (Background system removed)');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsManager, SETTINGS_CONFIG };
}