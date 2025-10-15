// StudyFlow Timer Page JavaScript
// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// --- APPLICATION STATE AND CONFIGURATION ---

// Theme and Background Config based on BACKGROUND_SYSTEM_SPEC.md
const BACKGROUND_CONFIG = {
  summer: {
    images: {
      day: Array.from({ length: 8 }, (_, i) => `assets/images/summer-day-${i + 1}.png`),
      night: Array.from({ length: 8 }, (_, i) => `assets/images/summer-night-${i + 1}.png`),
    },
    particles: {
      day: { count: 50, size: 8, speed: 1.2, type: 'green-leaf' }, // Green leaves for summer days
      night: { count: 60, size: 4, speed: 0.8, type: 'glow' } // More visible fireflies for summer nights
    }
  },
  autumn: {
    images: {
      day: Array.from({ length: 8 }, (_, i) => `assets/images/autumn-day-${i + 1}.png`),
      night: Array.from({ length: 8 }, (_, i) => `assets/images/autumn-night-${i + 1}.png`),
    },
    particles: {
      day: { count: 60, size: 6, speed: 1.5, type: 'leaf' }, // Autumn leaves for days
      night: { count: 45, size: 3, speed: 0.5, type: 'glow' } // More visible fireflies at night
    }
  },
  winter: {
    images: {
      day: Array.from({ length: 7 }, (_, i) => `assets/images/winter-day-${i + 1}.png`),
      night: Array.from({ length: 7 }, (_, i) => `assets/images/winter-night-${i + 1}.png`),
    },
    particles: {
      day: { count: 70, size: 4, speed: 1, type: 'snow' }, // Snowflakes for days
      night: { count: 45, size: 3, speed: 0.5, type: 'glow' } // More visible fireflies at night
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

    try {
        // We assume firebaseConfig is valid since it was just hardcoded.
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
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
        // If authentication failed, use a temporary ID so the app still runs.
        if (!userId) {
            userId = crypto.randomUUID(); 
        }
        isAuthReady = true;
        loadSettings(); // This runs and applies settings (defaults if no persistence)
        hideLoadingOverlay(); // Ensure the UI is unlocked!
    }
}


// --- SETTINGS PERSISTENCE (Firestore) ---

function getSettingsDocRef() {
  if (!db || !userId) return null;
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
        appSettings = { ...appSettings, ...loadedSettings };
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
  
  // 4. Apply Slideshow Interval - update options based on preload performance
  updateSlideshowIntervalOptions();
  
  // 5. Initialize Pomodoro UI
  updateSessionUI();
  updateDisplay();
}


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
  const themeConfig = BACKGROUND_CONFIG[appSettings.theme];
  const timeOfDay = isNight ? 'night' : 'day';
  return themeConfig.images[timeOfDay];
}

function getCurrentParticleConfig() {
  const themeConfig = BACKGROUND_CONFIG[appSettings.theme];
  const timeOfDay = isNight ? 'night' : 'day';
  return themeConfig.particles[timeOfDay];
}

// Track preload times for dynamic minimum interval calculation
let preloadTimes = [];
const MAX_PRELOAD_SAMPLES = 10; // Keep last 10 measurements

function preloadImage(url) {
  const startTime = performance.now();
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      
      // Track preload time for minimum interval calculation
      preloadTimes.push(loadTime);
      if (preloadTimes.length > MAX_PRELOAD_SAMPLES) {
        preloadTimes.shift(); // Keep only recent samples
      }
      
      console.log(`📊 Image preloaded in ${Math.round(loadTime)}ms`);
      resolve(url);
    };
    
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
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

  if (backgroundImageElement.src.includes(nextImage) && !forceUpdate) {
      // Image hasn't changed (day/night boundary crossed or first run with correct image)
      console.log(`🖼️ Background skipped. Current: ${nextImage.split('/').pop()}`);
      return;
  }

  console.log(`🖼️ Loading background: ${nextImage.split('/').pop()} (Index: ${appSettings.bgIndex})`);

  try {
    // Preload the next image before setting it
    await preloadImage(nextImage);
    
    // Start firefly transition
    startFireflyTransition();
    
    // Enhanced smooth transition coordinated with particle effect
    backgroundImageElement.style.opacity = '0.2';
    
    // Phase 1: Particles build up (600ms)
    setTimeout(() => {
      backgroundImageElement.style.opacity = '0.05';
      backgroundImageElement.src = nextImage;
    }, 600);
    
    // Phase 2: Image emerges through particles (400ms later)
    setTimeout(() => {
      backgroundImageElement.style.opacity = '0.9';
    }, 1000); // Total transition time: 1000ms coordinated with particle fade
    
    // Save the new index/theme
    if (oldIndex !== appSettings.bgIndex || forceUpdate) {
      saveSettings();
    }
    
    // Update slideshow options if we have enough preload samples
    if (preloadTimes.length >= 3) {
      updateSlideshowIntervalOptions();
    }

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
    initializeParticles(getCurrentParticleConfig());
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
    initializeParticles(getCurrentParticleConfig());
}


// --- FIREFLY PARTICLE SYSTEM ---
const particleContainer = document.getElementById('particle-container');
let fireflyElements = [];
let isSleepMode = false;

function initializeParticles(config) {
    // Clear existing fireflies
    clearFireflies();
    
    // Only create fireflies for glow type (night scenes)
    if (config.type === 'glow') {
        createFireflies(config.count);
    }
}

function clearFireflies() {
    fireflyElements.forEach(firefly => {
        if (firefly.parentNode) {
            firefly.parentNode.removeChild(firefly);
        }
    });
    fireflyElements = [];
}

function createFireflies(fireflyCount = 50) {
    console.log(`✨ Creating ${fireflyCount} fireflies for magical night ambiance`);
    
    for (let i = 0; i < fireflyCount; i++) {
        const firefly = document.createElement('div');
        firefly.className = 'firefly';

        // Random size for firefly body (smaller than glow, for realism)
        const size = Math.random() * 3 + 2; // 2px to 5px
        firefly.style.width = `${size}px`;
        firefly.style.height = `${size}px`;
        
        // Firefly body color (subtle, less important than the glow)
        firefly.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';

        // Random start position anywhere on the screen
        firefly.style.left = `${Math.random() * 100}vw`;
        firefly.style.top = `${Math.random() * 100}vh`;

        // Random duration for glow animation (2s to 5s)
        const glowDuration = Math.random() * 3 + 2;
        // Random duration for float animation (10s to 20s)
        const floatDuration = Math.random() * 10 + 10;
        // Random duration for sway animation (8s to 15s)
        const swayDuration = Math.random() * 7 + 8;

        firefly.style.animationDuration = 
            `${glowDuration}s, ${floatDuration}s, ${swayDuration}s`;

        // Random delays to stagger all animations
        firefly.style.animationDelay = 
            `-${Math.random() * glowDuration}s, -${Math.random() * floatDuration}s, -${Math.random() * swayDuration}s`;
        
        // Set initial opacity to be varied, so they don't all start glowing at once
        firefly.style.opacity = Math.random() * 0.5 + 0.4; // 0.4 to 0.9

        particleContainer.appendChild(firefly);
        fireflyElements.push(firefly);
    }
}

// Firefly transition effect for theme changes
function startFireflyTransition() {
    if (particleContainer) {
        // Add temporary extra fireflies during transition
        createFireflies(20); // Extra 20 fireflies for transition effect
        
        // Remove extra fireflies after transition
        setTimeout(() => {
            const extraFireflies = fireflyElements.slice(-20);
            extraFireflies.forEach(firefly => {
                firefly.style.opacity = '0';
                setTimeout(() => {
                    if (firefly.parentNode) {
                        firefly.parentNode.removeChild(firefly);
                    }
                }, 1000);
            });
            fireflyElements = fireflyElements.slice(0, -20);
        }, 2000);
    }
}

// Create firefly transition effect
function startFireflyTransition() {
  console.log('🎭 Starting firefly transition');
  const container = document.getElementById('particle-container');
  if (!container) return;
  
  // Add more fireflies during transition
  const currentFireflies = container.querySelectorAll('.firefly').length;
  const transitionFireflies = 15; // Add extra fireflies during transition
  
  for (let i = 0; i < transitionFireflies; i++) {
    setTimeout(() => {
      createFirefly();
    }, i * 100); // Stagger creation
  }
  
  // Remove extra fireflies after transition
  setTimeout(() => {
    const allFireflies = container.querySelectorAll('.firefly');
    const config = getCurrentParticleConfig();
    const targetCount = config.count;
    
    // Remove excess fireflies
    for (let i = targetCount; i < allFireflies.length; i++) {
      if (allFireflies[i]) {
        allFireflies[i].remove();
      }
    }
    console.log('🎭 Firefly transition complete');
  }, 3000);
}

// CSS-based firefly animation (no drawing needed)
function animateFireflies() {
  // Fireflies are animated via CSS keyframes
  // This function can be used for any JavaScript-based updates if needed
  console.log('🎭 Fireflies animating via CSS');
}

// Firefly system sleep mode control
window.particleSystem = {
  setSleepMode: function(sleepMode) {
    const container = document.getElementById('particle-container');
    if (!container) return;
    
    if (sleepMode) {
      // Reduce firefly activity in sleep mode
      container.style.animationDuration = '8s'; // Slower animations
      const fireflies = container.querySelectorAll('.firefly');
      fireflies.forEach(firefly => {
        firefly.style.opacity = '0.3'; // Dimmer fireflies
      });
      console.log('🎭 Fireflies entering sleep mode');
    } else {
      // Restore normal firefly activity
      container.style.animationDuration = '4s'; // Normal speed
      const fireflies = container.querySelectorAll('.firefly');
      fireflies.forEach(firefly => {
        firefly.style.opacity = ''; // Reset opacity
      });
      console.log('🎭 Fireflies exiting sleep mode');
    }
  }
};

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

// Handle window resize for fireflies
window.addEventListener('resize', () => {
    // Fireflies automatically adapt to window size via CSS
    // Re-initialize to ensure proper distribution
    const config = getCurrentParticleConfig();
    if (config) {
        initializeParticles(config);
    }
});


// --- PERPETUAL CLOCK ---

function updatePerpetualClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('perpetual-clock').textContent = `${h}:${m}:${s}`;
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
}

function startTimer() {
  if (isRunning) {
    // Pause timer
    clearInterval(timerInterval);
    isRunning = false;
    updateStartButton('Resume');
  } else {
    // Start/Resume timer
    isRunning = true;
    updateStartButton('Pause');
    document.getElementById('resetButton').disabled = false;

    timerInterval = setInterval(() => {
      totalSeconds--;
      updateDisplay();

      if (totalSeconds <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        
        // Play completion sound
        playCompletionSound();
        
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


// --- EVENT LISTENERS AND MODALS ---

function toggleSettingsModal(show) {
  const modal = document.getElementById('settingsModal');
  modal.classList.toggle('show', show);
}

function showCalendarModal() {
    // Placeholder for future calendar page/modal
    console.log('Calendar button clicked. Future navigation to calendar.html or modal logic here.');
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
    appSettings.sleepTimeout = parseInt(e.target.value);
    saveSettings();
    
    // Update sleep manager if it exists
    if (window.sleepManager) {
        window.sleepManager.updateSleepTimeout();
    }
    
    const timeoutText = appSettings.sleepTimeout === 0 ? 'disabled' : `${appSettings.sleepTimeout} seconds`;
    console.log(`💤 Sleep mode timeout updated to: ${timeoutText}`);
});


// --- INITIALIZATION ---
window.onload = initializeFirebase;