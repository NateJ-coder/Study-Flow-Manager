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
    particles: { count: 30, size: 2, speed: 0.5, type: 'glow' } // Subtle summer glow
  },
  autumn: {
    images: {
      day: Array.from({ length: 8 }, (_, i) => `assets/images/autumn-day-${i + 1}.png`),
      night: Array.from({ length: 8 }, (_, i) => `assets/images/autumn-night-${i + 1}.png`),
    },
    particles: { count: 50, size: 6, speed: 1.5, type: 'leaf' } // Falling leaves
  },
  winter: {
    images: {
      day: Array.from({ length: 7 }, (_, i) => `assets/images/winter-day-${i + 1}.png`),
      night: Array.from({ length: 7 }, (_, i) => `assets/images/winter-night-${i + 1}.png`),
    },
    particles: { count: 70, size: 4, speed: 1, type: 'snow' } // Snowflakes
  }
};

// Default Settings
let appSettings = {
  theme: 'autumn',
  bgIndex: 0,
  focusDuration: 25, // minutes
};

// Timer State
let timerInterval = null;
let totalSeconds = appSettings.focusDuration * 60;
let isRunning = false;
let isFocusSession = true; // Placeholder for future Pomodoro logic

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

  // 3. Apply Timer Duration
  totalSeconds = appSettings.focusDuration * 60;
  document.getElementById('focus-duration').value = appSettings.focusDuration;
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

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
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
    
    // Smooth transition
    backgroundImageElement.style.opacity = '0.1';
    setTimeout(() => {
      backgroundImageElement.src = nextImage;
      backgroundImageElement.style.opacity = '0.9';
    }, 300); // Transition time for opacity fade out
    
    // Save the new index/theme
    if (oldIndex !== appSettings.bgIndex || forceUpdate) {
      saveSettings();
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
        
        // Reinitialize with force update and new particles
        initializeBackgroundSystem(true); 
    }
}

// Helper function for checking day/night boundary transitions
function checkDayNightBoundary() {
  if (isNight !== isNightTime()) {
    // Day/Night transition detected, force an immediate update and reset index
    console.log(`🌓 Day/Night transition detected. Switching image set.`);
    appSettings.bgIndex = 0;
    updateBackground(true);
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
    // 1. Background image cycling every 30 minutes
    backgroundInterval = setInterval(() => updateBackground(false), 1000 * 60 * 30); // 30 mins

    // 2. Day/Night boundary check every 1 minute
    dayNightCheckInterval = setInterval(checkDayNightBoundary, 1000 * 60); // 1 min

    // Update the flag
    isBackgroundSystemInitialized = true;
    console.log("🖼️ Background Slideshow System Initialized.");

    // Initialize Particles based on current theme
    initializeParticles(BACKGROUND_CONFIG[appSettings.theme].particles);
}


// --- PARTICLE SYSTEM (Canvas) ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animationFrameId;

function initializeParticles(config) {
    // Stop any running animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        particles = [];
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    for (let i = 0; i < config.count; i++) {
        particles.push(createParticle(config));
    }

    drawParticles(config);
}

function createParticle(config) {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: config.size + Math.random() * 2,
    speed: config.speed * (0.5 + Math.random()),
    // Angle only relevant for leaf/snow to give slight horizontal drift
    angle: Math.random() * 360, 
  };
}

function drawParticles(config) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--particle-color').trim() || '#fff';
  
  particles.forEach(p => {
    // Update position
    p.y += p.speed;
    
    if (config.type === 'leaf' || config.type === 'snow') {
        // Add slight horizontal sway for snow/leaves
        p.x += Math.sin(p.y / 100) * 0.5;
    } else if (config.type === 'glow') {
        // Subtle random drift for glow/fireflies
        p.x += (Math.random() - 0.5) * 0.5;
    }

    // Wrap around when it falls off screen
    if (p.y > canvas.height) {
      p.y = -p.size;
      p.x = Math.random() * canvas.width; // Reset horizontal position too
    }

    // Draw particle
    ctx.beginPath();
    if (config.type === 'snow') {
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); // Simple circles for snow
    } else if (config.type === 'leaf') {
        ctx.fillRect(p.x, p.y, p.size, p.size * 0.5); // Rectangular shape for simple leaf
    } else {
        // Glow effect (Subtle circle)
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        // Optional: add a blur/shadow for a better glow effect
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = p.size * 3;
    }
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow for next draw
  });

  animationFrameId = requestAnimationFrame(() => drawParticles(config));
}

// Handle canvas resize
window.addEventListener('resize', () => {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Re-initialize particles to fit the new size
        initializeParticles(BACKGROUND_CONFIG[appSettings.theme].particles);
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

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function updateDisplay() {
  document.getElementById('timer-display').textContent = formatTime(totalSeconds);
  document.getElementById('timer-mode').textContent = isFocusSession ? 'Focus Session' : 'Short Break'; // Placeholder
}

function startTimer() {
  if (isRunning) {
    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('startButton').textContent = 'Resume';
  } else {
    isRunning = true;
    document.getElementById('startButton').textContent = 'Pause';
    document.getElementById('resetButton').disabled = false;

    timerInterval = setInterval(() => {
      totalSeconds--;
      updateDisplay();

      if (totalSeconds <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        document.getElementById('startButton').textContent = 'Start';
        document.getElementById('resetButton').disabled = true;
        console.log('Timer finished!');
        // TODO: Add notification and audio feedback here
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  document.getElementById('startButton').textContent = 'Start';
  document.getElementById('resetButton').disabled = true;
  totalSeconds = appSettings.focusDuration * 60; // Reset to configured duration
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


// --- INITIALIZATION ---
window.onload = initializeFirebase;