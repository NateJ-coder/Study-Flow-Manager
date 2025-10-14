/**
 * StudyFlow Background Manager - Season & Time Aware Image Rotation
 * 
 * FEATURES:
 * - Season-specific image rotation (summer, autumn, winter)
 * - Time-aware day/night switching based on user timezone
 * - Smart shuffling within appropriate image categories
 * - Timezone selection and local time calculation
 * - Performance-optimized preloading and memory management
 */

// ============================================
// BACKGROUND MANAGER CLASS
// ============================================

class SmartBackgroundManager {
  constructor() {
    console.log('🌟 SmartBackgroundManager initializing...');
    
    // Core state
    this.currentSeason = 'summer';
    this.currentTimeOfDay = 'day'; // 'day' or 'night'
    this.currentImageIndex = 0;
    this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Default to system timezone
    
    // Image management
    this.loadedImages = new Map();
    this.currentImageSet = [];
    this.shuffledIndices = [];
    
    // Timers
    this.rotationTimer = null;
    this.timeCheckTimer = null;
    this.preloadTimer = null;
    
    // Settings
    this.settings = {
      rotationEnabled: true,
      rotationInterval: 20000, // 20 seconds minimum
      dayStartHour: 6,   // 6 AM
      nightStartHour: 18, // 6 PM
      preloadBuffer: 5000 // 5 seconds before transition
    };
    
    // Get theme data
    this.themeData = window.THEME_DATA || {};
    
    this.init();
  }
  
  /**
   * Initialize the background manager
   */
  init() {
    console.log('🚀 SmartBackgroundManager initialization started');
    console.log('📊 Available themes:', Object.keys(this.themeData));
    console.log('🌍 User timezone:', this.userTimezone);
    
    // Determine current time of day
    this.updateTimeOfDay();
    
    // Get current season's images
    this.updateImageSet();
    
    // Start initial background
    this.loadInitialBackground();
    
    // Start time checking (check every minute for day/night changes)
    this.startTimeChecking();
    
    // Start rotation if enabled
    if (this.settings.rotationEnabled) {
      this.startRotation();
    }
    
    // Log current status for debugging
    console.log(`✅ SmartBackgroundManager ready`);
    console.log(`🎯 Current state: ${this.currentSeason} ${this.currentTimeOfDay}`);
    console.log(`📸 Image count: ${this.currentImageSet.length}`);
    
    // Force a time update to ensure proper day/night detection
    setTimeout(() => {
      console.log('🔄 Performing initial time verification...');
      this.updateTimeOfDay();
    }, 1000);
  }
  
  /**
   * Update current time of day based on user's timezone
   */
  updateTimeOfDay() {
    try {
      const now = new Date();
      const userTime = new Date(now.toLocaleString("en-US", {timeZone: this.userTimezone}));
      const currentHour = userTime.getHours();
      
      const previousTimeOfDay = this.currentTimeOfDay;
      
      // Determine if it's day or night
      if (currentHour >= this.settings.dayStartHour && currentHour < this.settings.nightStartHour) {
        this.currentTimeOfDay = 'day';
      } else {
        this.currentTimeOfDay = 'night';
      }
      
      console.log(`🕐 Time check: ${currentHour}:${userTime.getMinutes().toString().padStart(2, '0')} (${this.userTimezone})`);
      console.log(`🌅 Time of day: ${this.currentTimeOfDay} (day: ${this.settings.dayStartHour}-${this.settings.nightStartHour})`);
      
      // If time of day changed, update image set
      if (previousTimeOfDay !== this.currentTimeOfDay) {
        console.log(`🔄 Time of day changed from ${previousTimeOfDay} to ${this.currentTimeOfDay}`);
        // Clear any cached images from wrong time period
        this.loadedImages.clear();
        this.updateImageSet();
        this.loadInitialBackground(); // Load new time-appropriate image
      }
      
    } catch (error) {
      console.warn('❌ Timezone calculation failed, using default day/night logic');
      const hour = new Date().getHours();
      this.currentTimeOfDay = (hour >= 6 && hour < 18) ? 'day' : 'night';
    }
  }
  
  /**
   * Update the current image set based on season and time of day
   */
  updateImageSet() {
    const seasonData = this.themeData[this.currentSeason.toLowerCase()];
    
    if (!seasonData) {
      console.error(`❌ No data found for season: ${this.currentSeason}`);
      return;
    }
    
    const timeData = seasonData[this.currentTimeOfDay];
    if (!timeData || !timeData.images) {
      console.error(`❌ No ${this.currentTimeOfDay} images found for ${this.currentSeason}`);
      return;
    }
    
    this.currentImageSet = [...timeData.images]; // Create a copy
    this.shuffleImageSet();
    
    console.log(`🎨 Updated image set: ${this.currentSeason} ${this.currentTimeOfDay}`);
    console.log(`📸 Available images: ${this.currentImageSet.length}`);
    console.log(`�️ Image list:`, this.currentImageSet.map(img => img.split('/').pop()));
    console.log(`�🔀 Shuffled order:`, this.shuffledIndices);
  }
  
  /**
   * Shuffle the image indices for random order within the season/time category
   */
  shuffleImageSet() {
    // Create array of indices
    this.shuffledIndices = Array.from({length: this.currentImageSet.length}, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
    
    // Reset current index
    this.currentImageIndex = 0;
    
    console.log(`🔀 Shuffled ${this.currentImageSet.length} images for ${this.currentSeason} ${this.currentTimeOfDay}`);
  }
  
  /**
   * Get the current image URL
   */
  getCurrentImage() {
    if (this.shuffledIndices.length === 0) return null;
    
    const actualIndex = this.shuffledIndices[this.currentImageIndex];
    return this.currentImageSet[actualIndex];
  }
  
  /**
   * Get the next image URL
   */
  getNextImage() {
    if (this.shuffledIndices.length === 0) return null;
    
    const nextIndex = (this.currentImageIndex + 1) % this.shuffledIndices.length;
    const actualIndex = this.shuffledIndices[nextIndex];
    return this.currentImageSet[actualIndex];
  }
  
  /**
   * Load initial background image
   */
  loadInitialBackground() {
    const currentImage = this.getCurrentImage();
    if (!currentImage) {
      console.error('❌ No current image available');
      return;
    }
    
    console.log(`🖼️ Loading initial background: ${currentImage}`);
    
    // Preload and set the current image
    this.preloadImage(currentImage, 'high').then(() => {
      this.setBackground(currentImage);
      
      // Start preloading next image
      setTimeout(() => {
        const nextImage = this.getNextImage();
        if (nextImage && nextImage !== currentImage) {
          this.preloadImage(nextImage, 'low');
        }
      }, 1000);
    });
  }
  
  /**
   * Preload an image with priority
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
        console.warn(`❌ Failed to preload: ${url}`);
        reject(new Error(`Failed to load ${url}`));
      };
      
      img.src = url;
    });
  }
  
  /**
   * Set background with smooth transition
   */
  setBackground(imageUrl) {
    const bgContainer = document.getElementById('bg-container') || 
                       document.getElementById('background-container');
    
    if (!bgContainer) {
      console.error('❌ Background container not found');
      return;
    }
    
    console.log(`🖼️ Setting background: ${imageUrl.split('/').pop()}`);
    
    // Smooth transition
    bgContainer.style.opacity = '0.3';
    
    setTimeout(() => {
      bgContainer.style.backgroundImage = `url('${imageUrl}')`;
      
      setTimeout(() => {
        bgContainer.style.opacity = '1';
        console.log(`✅ Background transition complete`);
      }, 100);
    }, 300);
  }
  
  /**
   * Rotate to next image in the shuffled sequence
   */
  rotateToNext() {
    if (this.shuffledIndices.length === 0) {
      console.warn('❌ No images available to rotate');
      return;
    }
    
    // Move to next image in shuffled sequence
    this.currentImageIndex = (this.currentImageIndex + 1) % this.shuffledIndices.length;
    
    // If we've completed a full cycle, reshuffle
    if (this.currentImageIndex === 0) {
      console.log('🔄 Completed full cycle, reshuffling...');
      this.shuffleImageSet();
    }
    
    const nextImage = this.getCurrentImage();
    const imageName = nextImage.split('/').pop();
    console.log(`🔄 Rotating to: ${imageName} (${this.currentImageIndex + 1}/${this.shuffledIndices.length})`);
    
    // Verify the image matches current time of day
    const isCorrectTimeOfDay = imageName.includes(`-${this.currentTimeOfDay}-`);
    if (!isCorrectTimeOfDay) {
      console.warn(`⚠️ INCORRECT TIME IMAGE: ${imageName} doesn't match ${this.currentTimeOfDay} time!`);
      console.warn(`🔍 Current image set:`, this.currentImageSet.map(img => img.split('/').pop()));
      // Force refresh the image set
      this.forceRefresh();
      return;
    }
    
    // Set the background
    if (this.loadedImages.has(nextImage)) {
      this.setBackground(nextImage);
    } else {
      // Load it now if not preloaded
      this.preloadImage(nextImage, 'high').then(() => {
        this.setBackground(nextImage);
      });
    }
    
    // Preload the next image for smooth transitions
    const upcomingImage = this.getNextImage();
    if (upcomingImage && !this.loadedImages.has(upcomingImage)) {
      this.preloadImage(upcomingImage, 'low');
    }
    
    // Clean up old images to manage memory
    this.cleanupOldImages();
  }
  
  /**
   * Clean up old images from memory
   */
  cleanupOldImages() {
    const maxImages = 3; // Keep current, next, and previous
    
    if (this.loadedImages.size > maxImages) {
      const currentImage = this.getCurrentImage();
      const nextImage = this.getNextImage();
      
      for (let [url, img] of this.loadedImages) {
        if (url !== currentImage && url !== nextImage) {
          this.loadedImages.delete(url);
          console.log(`🗑️ Cleaned up: ${url.split('/').pop()}`);
          break; // Only clean one at a time
        }
      }
    }
  }
  
  /**
   * Start automatic background rotation
   */
  startRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    
    // Ensure minimum interval
    const interval = Math.max(this.settings.rotationInterval, 20000);
    const preloadBuffer = this.settings.preloadBuffer;
    
    this.rotationTimer = setInterval(() => {
      this.rotateToNext();
    }, interval);
    
    // Start preloading timer (preload 5 seconds before rotation)  
    if (this.preloadTimer) {
      clearInterval(this.preloadTimer);
    }
    
    this.preloadTimer = setInterval(() => {
      const nextImage = this.getNextImage();
      if (nextImage && !this.loadedImages.has(nextImage)) {
        this.preloadImage(nextImage, 'low');
      }
    }, interval - preloadBuffer);
    
    console.log(`🔄 Background rotation started: ${interval/1000}s interval`);
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
   * Start checking time for day/night changes
   */
  startTimeChecking() {
    if (this.timeCheckTimer) {
      clearInterval(this.timeCheckTimer);
    }
    
    // Check time every minute
    this.timeCheckTimer = setInterval(() => {
      this.updateTimeOfDay();
    }, 60000);
    
    console.log('⏰ Time checking started (checks every minute)');
  }
  
  /**
   * Stop time checking
   */
  stopTimeChecking() {
    if (this.timeCheckTimer) {
      clearInterval(this.timeCheckTimer);
      this.timeCheckTimer = null;
    }
    console.log('⏰ Time checking stopped');
  }
  
  /**
   * Change season and update images
   */
  setSeason(season) {
    const previousSeason = this.currentSeason;
    this.currentSeason = season.toLowerCase();
    
    console.log(`🌿 Season changed: ${previousSeason} → ${this.currentSeason}`);
    
    // Clear cache and reset index when changing seasons
    this.loadedImages.clear();
    this.currentImageIndex = 0;
    
    // Update image set and start fresh
    this.updateImageSet();
    this.loadInitialBackground();
  }
  
  /**
   * Set user timezone
   */
  setTimezone(timezone) {
    console.log(`🌍 Timezone changed: ${this.userTimezone} → ${timezone}`);
    this.userTimezone = timezone;
    // Clear cache and force refresh when timezone changes
    this.loadedImages.clear();
    this.updateTimeOfDay(); // This will trigger image set update if needed
  }
  
  /**
   * Debug function to force refresh the background system
   */
  forceRefresh() {
    console.log('🔄 Force refreshing background system...');
    this.loadedImages.clear();
    this.updateTimeOfDay();
    this.updateImageSet();
    this.loadInitialBackground();
  }
  
  /**
   * Update rotation interval
   */
  setRotationInterval(intervalMs) {
    const safeInterval = Math.max(intervalMs, 20000); // 20 second minimum
    this.settings.rotationInterval = safeInterval;
    
    if (this.settings.rotationEnabled) {
      this.startRotation(); // Restart with new interval
    }
    
    console.log(`⏱️ Rotation interval set to ${safeInterval/1000}s`);
  }
  
  /**
   * Get available timezones for settings
   */
  static getAvailableTimezones() {
    return [
      'America/New_York',
      'America/Chicago', 
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Africa/Johannesburg',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
      'Pacific/Auckland'
    ];
  }
  
  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      season: this.currentSeason,
      timeOfDay: this.currentTimeOfDay,
      timezone: this.userTimezone,
      currentImage: this.getCurrentImage()?.split('/').pop(),
      imageSetSize: this.currentImageSet.length,
      loadedImages: this.loadedImages.size,
      rotationActive: !!this.rotationTimer
    };
  }
}

// ============================================
// GLOBAL INITIALIZATION & EXPORTS
// ============================================

// Make available globally
window.SmartBackgroundManager = SmartBackgroundManager;

// Initialize when DOM is ready
let smartBackgroundManager = null;

document.addEventListener('DOMContentLoaded', function() {
  if (typeof THEME_DATA !== 'undefined') {
    smartBackgroundManager = new SmartBackgroundManager();
    window.backgroundManager = smartBackgroundManager; // Backwards compatibility
    
    console.log('✅ SmartBackgroundManager initialized and available globally');
  } else {
    console.error('❌ THEME_DATA not available - SmartBackgroundManager cannot initialize');
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SmartBackgroundManager };
}