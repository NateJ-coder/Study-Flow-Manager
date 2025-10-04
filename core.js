/* ===== Global STATE and ELEMENTS ===== */
const STATE = {
  currentPage: "timer",     // default page
  rainLockout: false,       // lockout status
  isNight: false,           // day/night detection for theming
  currentSeason: "summer",  // current season theme
  isRaining: false,         // rain mode status
  
  // Config data loaded from studyflow_config.json
  config: null,             // loaded configuration
  
  // Timer state
  timerMode: 'work',        // 'work', 'short-break', 'long-break'
  timeRemaining: 25 * 60,   // seconds remaining
  isTimerRunning: false,    // timer active status
  timerInterval: null,      // setInterval reference
  sessionCount: 0,          // completed work sessions
  
  // Screensaver state
  lastActivityTime: Date.now(),
  screensaverActive: false,
  activityCheckInterval: null,
  
  // Hourglass animation state
  hourglassFlipInterval: null,
  sandAnimationActive: false,
  
  // Rain cycle state (always starts false - only activated by manual toggle)
  isRainActive: false,
  rainAudio: null,
  // Seasonal particle system state
  seasonParticleInterval: null,
  seasonParticleActive: false,
  // Mouse/cursor audio and element
  clickAudio: null,
  customCursor: null,
  
  // Calendar state
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  completedDays: new Set(),
  selectedDate: null,
  tasks: new Map(), // Date string -> array of tasks
  
  // Task modal state
  taskModalOpen: false,
  currentTaskDate: null,
  
  // Rain lockout auto-hide
  rainLockoutTimeout: null
};

const ELEMENTS = {
  pages: null,
  sidebar: null,
  rainLockout: null
};

/* ===== Utility: Map page IDs to elements ===== */
function MapsTo() {
  ELEMENTS.pages = document.querySelectorAll("main > section"); // all app pages
  ELEMENTS.sidebar = document.getElementById("sidebar");
  ELEMENTS.rainLockout = document.getElementById("rain-lockout");

  // If nav items are anchors linking to other HTML pages, infer data-target
  // so nav-hiding works consistently both for single-page and multi-page setups.
  if (ELEMENTS.sidebar) {
    ELEMENTS.sidebar.querySelectorAll('.nav-item').forEach(btn => {
      if (!btn.dataset.target) {
        const href = btn.getAttribute('href') || '';
        if (href) {
          const file = href.split('/').pop().split('#')[0].toLowerCase();
          let inferred = '';
          if (file === '' || file.includes('index')) inferred = 'timer';
          else if (file.includes('calendar')) inferred = 'calendar';
          else if (file.includes('settings')) inferred = 'settings';
          if (inferred) btn.dataset.target = inferred;
        }
      }
    });
  }
}

/* ===== Utility: Hide nav items depending on active page ===== */
function setupNavHiding() {
  if (!ELEMENTS.sidebar) return;

  ELEMENTS.sidebar.querySelectorAll(".nav-item").forEach(btn => {
    const target = btn.dataset.target;
    if (target === STATE.currentPage) {
      btn.style.display = "none"; // hide icon for current page
    } else {
      btn.style.display = "inline-flex"; // show the others
    }
  });
}

/* ===== PAGE NAVIGATION ===== */

/**
 * Navigate to a specific page
 * @param {string} pageId - The page ID to navigate to
 */
function navigateToPage(pageId) {
  console.log(`🧭 Navigating to page: ${pageId}`);
  
  // Hide all pages
  const allPages = document.querySelectorAll('main section[data-view]');
  allPages.forEach(page => {
    page.setAttribute('hidden', 'true');
  });
  
  // Show target page
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.removeAttribute('hidden');
    STATE.currentPage = pageId;
    
    // Update body data attribute
    document.body.setAttribute('data-page', pageId);
    
    // Update navigation visibility
    setupNavHiding();
    
    console.log(`✅ Successfully navigated to ${pageId}`);
  } else {
    console.error(`❌ Page not found: page-${pageId}`);
  }
}

/**
 * Setup navigation event listeners
 */
function setupNavigation() {
  if (!ELEMENTS.sidebar) return;
  ELEMENTS.sidebar.querySelectorAll('.nav-item').forEach(btn => {
    const href = btn.getAttribute('href') || '';

    // If this nav-item is an anchor to another HTML page, do not intercept click
    // — let the browser navigate to that file. For in-page buttons (no href
    // or href that is a fragment), intercept and run SPA navigation.
    if (btn.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      // Keep inferred data-target for nav hiding, but don't add click listener.
      return;
    }

    btn.addEventListener('click', (e) => {
      // Prevent default if this would navigate away in-page
      if (btn.tagName === 'A' && href && !href.startsWith('#')) {
        // allow normal navigation
        return;
      }
      e.preventDefault();
      const target = btn.dataset.target;
      if (target) {
        navigateToPage(target);
      }
    });
  });
  
  console.log('✅ Navigation setup complete');
}

/* ===== Rain Lockout Management ===== */
function showRainLockout(status, autoHide = true) {
  STATE.rainLockout = status;

  if (status) {
    // Clear any existing timeout
    if (STATE.rainLockoutTimeout) {
      clearTimeout(STATE.rainLockoutTimeout);
      STATE.rainLockoutTimeout = null;
    }
    
    // Use existing rain lockout element from HTML
    let lockoutElement = document.getElementById('rain-lockout');
    if (!lockoutElement) {
      console.warn('Rain lockout element not found in HTML');
      return;
    }
    
    ELEMENTS.rainLockout = lockoutElement;
    
    // Show lockout overlay
    lockoutElement.removeAttribute("hidden");
    document.body.classList.add("shock-cursor");
    
    console.log('🔒 Rain lockout activated');
    
    // Auto-hide after 5 seconds if requested
    if (autoHide) {
      STATE.rainLockoutTimeout = setTimeout(() => {
        hideRainLockoutOverlay();
      }, 5000);
    }
  } else {
    hideRainLockoutOverlay();
    console.log('🔓 Rain lockout deactivated');
  }
}

/**
 * Hide the rain lockout overlay but keep the underlying restrictions
 */
function hideRainLockoutOverlay() {
  STATE.rainLockout = false;
  if (ELEMENTS.rainLockout) {
    ELEMENTS.rainLockout.setAttribute("hidden", "true");
  }
  document.body.classList.remove("shock-cursor");
  
  // Clear timeout if it exists
  if (STATE.rainLockoutTimeout) {
    clearTimeout(STATE.rainLockoutTimeout);
    STATE.rainLockoutTimeout = null;
  }
}

/* ===== SETTINGS: Load & Save ===== */

// Default values (can be overridden by config or localStorage)
const DEFAULT_SETTINGS = {
  calendar_cross_color: "#ff4d4d",
  background_brightness: 100,
  frame_opacity: 100,
  season: "summer",
  timezone: "Africa/Johannesburg",
  slideshow_enabled: true,
  slideshow_interval_seconds: 30,
  pomodoro_sessions: 4,
  work_minutes: 25,
  short_break_minutes: 5,
  long_break_minutes: 20,
  short_breaks_before_long: 3,
  rain_toggle_enabled: false
};

/**
 * Load settings from localStorage if available,
 * otherwise use DEFAULT_SETTINGS.
 */
function loadSettings() {
  try {
    const saved = localStorage.getItem("studyflow_settings");
    if (saved) {
      STATE.userSettings = JSON.parse(saved);
    } else {
      STATE.userSettings = { ...DEFAULT_SETTINGS };
    }
  } catch (err) {
    console.error("Failed to load settings, using defaults", err);
    STATE.userSettings = { ...DEFAULT_SETTINGS };
  }

  // Sanitize legacy rain-related settings that could force lockout
  if (STATE.userSettings.developer_mode_test_rain_no_lockout !== undefined) {
    console.log('🔧 Clearing legacy developer_mode_test_rain_no_lockout setting');
    delete STATE.userSettings.developer_mode_test_rain_no_lockout;
  }
  // If stored season is 'rain', reset to 'summer' to avoid accidental activation
  if (STATE.userSettings.season === 'rain') {
    console.log("🔧 Stored season was 'rain' — resetting to 'summer'");
    STATE.userSettings.season = 'summer';
    saveSettings();
  }


  // Populate the form fields if present
  const form = document.getElementById("settings-form");
  if (form) {
    Object.entries(STATE.userSettings).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === "checkbox") {
          input.checked = Boolean(value);
        } else {
          input.value = value;
        }
      }
    });
  }
}

/**
 * Save current STATE.userSettings into localStorage.
 */
function saveSettings() {
  try {
    localStorage.setItem("studyflow_settings", JSON.stringify(STATE.userSettings));
    console.log("Settings saved:", STATE.userSettings);
  } catch (err) {
    console.error("Failed to save settings", err);
  }
}

/* ===== EVENT: Handle Settings Form Submit ===== */

/**
 * Safely coerce a value to a number, returning fallback for invalid values
 */
function coerceNumber(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function setupSettingsForm() {
  const form = document.getElementById("settings-form");
  if (!form) return;

  // Live preview: update only visuals as user changes the cross color
  const colorInput = form.querySelector('[name="calendar_cross_color"]');
  if (colorInput) {
    colorInput.addEventListener('input', () => {
      // Preview on today's cell if present
      document.querySelectorAll('.calendar-day.completed .cross-line-1, .calendar-day.completed .cross-line-2')
        .forEach(line => line.setAttribute('stroke', colorInput.value));
    });
  }

  form.addEventListener("submit", e => {
    e.preventDefault();

    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (!input) return;

      if (input.type === "checkbox") {
        STATE.userSettings[key] = input.checked;
      } else if (input.type === "number" || input.type === "range") {
        // safer number parsing
        STATE.userSettings[key] = coerceNumber(input.value, DEFAULT_SETTINGS[key]);
      } else {
        STATE.userSettings[key] = input.value;
      }
    });

    saveSettings();
    // Optional: toast/feedback
    console.log('✅ Settings saved');
  });
}

/**
 * Setup rain toggle button
 */
function setupRainToggle() {
  const rainToggle = document.getElementById('rain-toggle');
  if (!rainToggle) return;
  
  // Update button text based on rain state
  function updateRainToggleButton() {
    rainToggle.textContent = STATE.isRainActive ? 'Stop Rain' : 'Start Rain';
    rainToggle.style.background = STATE.isRainActive ? 
      'rgba(255, 0, 0, 0.7)' : 'rgba(0, 150, 255, 0.7)';
  }
  
  // Handle rain toggle click
  rainToggle.addEventListener('click', () => {
    toggleRain();
    updateRainToggleButton();
  });
  
  // Initialize button state
  updateRainToggleButton();
  
  console.log('✅ Rain toggle setup complete');
}

/* ===== PERPETUAL CLOCK & TIME ZONE ===== */



/**
 * Start the perpetual clock that updates every second.
 * Updates #clock-time element and detects day/night for theming.
 */
function startPerpetualClock() {
  const clockElement = document.getElementById("clock-time");
  
  function updateClock() {
    try {
      const now = new Date();
      const timezone = STATE.userSettings?.timezone || "Africa/Johannesburg";
      
      // Format time for display (24-hour format)
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Get hour for night/day detection
      const hourFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      });
      
      const timeString = timeFormatter.format(now);
      const hourString = hourFormatter.format(now);
      const currentHour = parseInt(hourString, 10);
      
      // Update clock display
      if (clockElement) {
        clockElement.textContent = timeString;
      }
      
      // Theme Integration: Detect night-time (6 PM to 6 AM)
      const wasNight = STATE.isNight;
      STATE.isNight = currentHour >= 18 || currentHour < 6;
      
      // If night/day status changed, trigger theme update
      if (wasNight !== STATE.isNight) {
        console.log(`Time of day changed: ${STATE.isNight ? 'Night' : 'Day'} mode`);
        // You can add theme update logic here later
        // e.g., updateTheme();
      }
      // Micro-animation for the sidebar clock icon (rotate subtly based on seconds)
      try {
        const secs = now.getSeconds();
        const clockNavImg = document.querySelector('#nav-timer .nav-icon-img');
        if (clockNavImg) {
          // Map seconds to a subtle angle between -6deg and +6deg
          const angle = (secs / 59) * 12 - 6;
          clockNavImg.style.transform = `rotate(${angle}deg)`;
        }
      } catch (e) {
        // ignore
      }
      
    } catch (error) {
      // Fallback to local time if timezone fails
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      if (clockElement) {
        clockElement.textContent = timeString;
      }
      
      // Fallback night detection using local time
      const currentHour = now.getHours();
      const wasNight = STATE.isNight;
      STATE.isNight = currentHour >= 18 || currentHour < 6;
      
      if (wasNight !== STATE.isNight) {
        console.log(`Time of day changed: ${STATE.isNight ? 'Night' : 'Day'} mode (local time)`);
      }
      
      console.warn("Timezone error, using local time:", error);
    }
  }
  
  // Update immediately, then every second
  updateClock();
  setInterval(updateClock, 1000);
  
  console.log("✅ Perpetual clock started");
}

/* ===== THEME/SEASON SWITCHER ===== */

/**
 * Master theme function that orchestrates all visual changes
 * @param {string} season - "summer", "autumn", "winter" 
 * @param {boolean} isNight - true for night mode
 * @param {boolean} isRain - true for rain mode (overrides season)
 */
function applyTheme(season, isNight, isRain) {
  console.log(`🎨 Applying theme: ${season}, night: ${isNight}, rain: ${isRain}`);
  
  // Update STATE (but don't override rain state if it's manually controlled)
  STATE.currentSeason = season;
  STATE.isNight = isNight;
  if (isRain !== undefined) {
    STATE.isRaining = isRain;
  }
  
  // Set UI tint colors via CSS variables
  setUITintColors(season, isNight, isRain);
  
  // Update background slideshow
  updateBackground(season, isNight, isRain);
  
  // Update particle effects
  updateParticles(season, isNight, isRain);
  
  // Update calendar/clock aesthetics
  updateCalendarClockAesthetic(season, isNight, isRain);
  
  console.log("✅ Theme applied successfully");
}

/**
 * Set CSS custom properties for UI tinting based on theme
 */
function setUITintColors(season, isNight, isRain) {
  const root = document.documentElement;
  
  // Rain mode overrides everything
  if (isRain) {
    const rainConfig = STATE.config?.backgrounds?.rain;
    const tints = rainConfig?.ui_tint || ['#9fc5e8', '#dbe9ff'];
    const textColor = rainConfig?.timer_text_color || '#d8eef7';
    
    root.style.setProperty('--ui-tint-primary', tints[0]);
    root.style.setProperty('--ui-tint-secondary', tints[1]);
    root.style.setProperty('--timer-text-color', textColor);
    root.style.setProperty('--sand-color', '#4aa3df');
    return;
  }
  
  // Season-based tinting from config
  const seasonConfig = STATE.config?.backgrounds?.seasons?.[season];
  let colors = {};
  
  if (seasonConfig) {
    const tints = seasonConfig.ui_tint || ['#dff6ff', '#b7f0c6'];
    colors = {
      primary: tints[0],
      secondary: tints[1],
      timerText: seasonConfig.timer_text_color || '#ffffff',
      sand: '#f7f7f7' // Default sand color
    };
  } else {
    // Fallback colors
    colors = {
      primary: '#dff6ff',
      secondary: '#b7f0c6', 
      timerText: '#ffffff',
      sand: '#f7f7f7'
    };
  }
  
  root.style.setProperty('--ui-tint-primary', colors.primary);
  root.style.setProperty('--ui-tint-secondary', colors.secondary);
  root.style.setProperty('--timer-text-color', colors.timerText);
  root.style.setProperty('--sand-color', colors.sand);
  // approximate icon tint — store a CSS variable that can be used by CSS to filter/tint images
  // Use the secondary color for icon accent
  const iconTint = colors.secondary || colors.primary || '#ffffff';
  root.style.setProperty('--nav-icon-tint', iconTint);
}

/**
 * Update background images/slideshow
 */
function updateBackground(season, isNight, isRain) {
  const backgroundElement = document.getElementById('bg-slideshow');
  if (!backgroundElement) return;
  
  const basePath = STATE.config?.paths?.images?.backgrounds || 'assets/images';
  let imagePath;
  
  if (isRain) {
    // Rain backgrounds using config
    const rainConfig = STATE.config?.backgrounds?.rain;
    const rainCount = rainConfig?.count || 9;
    const rainNum = Math.floor(Math.random() * rainCount) + 1;
    const pattern = rainConfig?.pattern || 'rain-bg-1.png';
    imagePath = `${basePath}/${pattern.replace('1.png', `${rainNum}.png`)}`;
  } else {
    // Season + time backgrounds using config
    const seasonConfig = STATE.config?.backgrounds?.seasons?.[season];
    const timeMode = isNight ? 'night' : 'day';
    const patternKey = timeMode === 'night' ? 'night_pattern' : 'day_pattern';
    const count = seasonConfig?.count_per_cycle || 8;
    const imageNum = Math.floor(Math.random() * count) + 1;
    
    const pattern = seasonConfig?.[patternKey] || `${season}-${timeMode}-1.png`;
    imagePath = `${basePath}/${pattern.replace('1.png', `${imageNum}.png`)}`;
  }
  
  // Apply background with fade effect
  backgroundElement.style.backgroundImage = `url("${imagePath}")`;
  backgroundElement.classList.add('fade-transition');
  
  console.log(`🖼️ Background updated: ${imagePath}`);
}

/**
 * Update particle effects and mouse trails
 */
function updateParticles(season, isNight, isRain) {
  const particleContainer = document.getElementById('particles-layer');
  if (!particleContainer) return;
  
  // Clear existing particle classes
  particleContainer.className = 'particle-container';
  
  let particleType;
  
  if (isRain) {
    particleType = 'rain';
  } else if (isNight) {
    particleType = 'fireflies';
  } else {
    // Day particles by season
    const dayParticles = {
      summer: 'leaves-green',
      autumn: 'leaves-burnt_orange_brown', 
      winter: 'snowflakes'
    };
    particleType = dayParticles[season] || 'leaves-green';
  }
  
  // Add particle type class
  particleContainer.classList.add(`particles-${particleType}`);
  
  // Update mouse trail effect
  document.body.setAttribute('data-mouse-trail', particleType);

  // Start/stop season particle loop
  startSeasonParticles(particleType, isRain);

  // Ensure click audio is initialized
  if (!STATE.clickAudio) {
    try {
      STATE.clickAudio = new Audio(getAudioPath('click'));
      STATE.clickAudio.volume = 0.2;
      STATE.clickAudio.preload = 'auto';
    } catch (err) {
      console.warn('Click audio failed to initialize:', err);
    }
  }

  // Ensure custom cursor exists and apply seasonal tint
  ensureCustomCursor();
  applyCursorTintForParticleType(particleType);
  
  console.log(`✨ Particles updated: ${particleType}`);
}

/* ===== SEASONAL PARTICLES & MOUSE TRAIL ===== */

function startSeasonParticles(particleType, isRainMode) {
  // Stop any existing seasonal particle generation
  stopSeasonParticles();

  const container = document.getElementById('particles-layer');
  if (!container) return;

  // For rain mode we don't spawn leaves/snow here
  if (isRainMode) {
    STATE.seasonParticleActive = false;
    return;
  }

  STATE.seasonParticleActive = true;

  // Create initial batch of particles based on type
  if (particleType === 'snowflakes') {
    createSnowParticles();
  } else if (particleType.includes('leaves-green') || particleType === 'leaves-green') {
    createSummerLeafParticles();
  } else if (particleType.includes('leaves') && (particleType.includes('brown') || particleType.includes('burnt') || particleType.includes('orange'))) {
    createAutumnLeafParticles();
  } else if (particleType === 'fireflies') {
    createFireflyParticles();
  }

  // Start continuous particle generation with improved logic
  startSeasonalParticles();
}



function stopSeasonParticles() {
  STATE.seasonParticleActive = false;
  if (STATE.seasonParticleInterval) {
    clearInterval(STATE.seasonParticleInterval);
    STATE.seasonParticleInterval = null;
  }
  // Remove existing seasonal particles
  document.querySelectorAll('.falling-leaf, .autumn-leaf, .snowflake, .firefly').forEach(p => p.remove());
}

function createSummerLeafParticles() {
  const container = document.getElementById('particles-layer');
  if (!container) return;
  
  for (let i = 0; i < 15; i++) {
    const leaf = document.createElement("div");
    leaf.className = "particle leaves-green";
    // No emoji - pure CSS styling
    leaf.style.left = Math.random() * 100 + "vw";
    leaf.style.top = "-10px";
    leaf.style.animationDelay = Math.random() * 10 + "s";
    
    // Add random variations
    const sizeMultiplier = 0.8 + Math.random() * 0.4;
    leaf.style.setProperty('--particle-scale', sizeMultiplier.toString());
    leaf.style.setProperty('--initial-rotate', Math.random() * 360 + 'deg');
    leaf.style.setProperty('--particle-drift', (Math.random() - 0.5) * 60 + 'px');
    leaf.style.setProperty('--fall-duration', (8 + Math.random() * 4) + 's');
    
    container.appendChild(leaf);
  }
}

function createAutumnLeafParticles() {
  const container = document.getElementById('particles-layer');
  if (!container) return;
  
  for (let i = 0; i < 20; i++) {
    const leaf = document.createElement("div");
    leaf.className = "particle leaves-burnt_orange_brown";
    // No emoji - pure CSS styling
    leaf.style.left = Math.random() * 100 + "vw";
    leaf.style.top = "-10px";
    leaf.style.animationDelay = Math.random() * 8 + "s";
    
    // Add random variations
    const sizeMultiplier = 0.7 + Math.random() * 0.6;
    leaf.style.setProperty('--particle-scale', sizeMultiplier.toString());
    leaf.style.setProperty('--initial-rotate', Math.random() * 360 + 'deg');
    leaf.style.setProperty('--particle-drift', (Math.random() - 0.5) * 80 + 'px');
    leaf.style.setProperty('--fall-duration', (6 + Math.random() * 4) + 's');
    
    container.appendChild(leaf);
  }
}

function createSnowParticles() {
  const container = document.getElementById('particles-layer');
  if (!container) return;
  
  for (let i = 0; i < 25; i++) {
    const snow = document.createElement("div");
    snow.className = "particle snowflakes";
    // No emoji - pure CSS styling with white particles
    snow.style.left = Math.random() * 100 + "vw";
    snow.style.top = "-10px";
    snow.style.animationDelay = Math.random() * 12 + "s";
    snow.style.backgroundColor = "#ffffff";
    snow.style.boxShadow = "0 0 3px rgba(255,255,255,0.6)";
    
    // Add random variations
    const sizeMultiplier = 0.6 + Math.random() * 0.8;
    snow.style.setProperty('--particle-scale', sizeMultiplier.toString());
    snow.style.setProperty('--particle-drift', (Math.random() - 0.5) * 50 + 'px');
    snow.style.setProperty('--fall-duration', (10 + Math.random() * 4) + 's');
    
    container.appendChild(snow);
  }
}

function createFireflyParticles() {
  const container = document.getElementById('particles-layer');
  if (!container) return;
  
  for (let i = 0; i < 25; i++) {
    const f = document.createElement("div");
    f.className = "firefly";
    f.style.left = Math.random() * 100 + "vw";
    f.style.top = Math.random() * 100 + "vh";
    f.style.animationDelay = Math.random() * 8 + "s";
    f.style.animationDuration = 8 + Math.random() * 5 + "s";
    f.style.width = f.style.height = 4 + Math.random() * 4 + "px";
    container.appendChild(f);
  }
}

// Refined seasonal particle generation with fixed interval and probability
function startSeasonalParticles() {
  if (STATE.seasonParticleInterval) {
    clearInterval(STATE.seasonParticleInterval);
  }

  if (STATE.seasonParticleActive) {
    STATE.seasonParticleInterval = setInterval(() => {
      const season = STATE.currentSeason;
      let particleType = null;
      let spawnChance = 0; 
      
      if (season === 'autumn') {
        // High chance for steady leaf fall
        spawnChance = 0.85; 
        particleType = STATE.isNight ? 'leaves-burnt_orange_brown' : 'leaves-green';
      } else if (season === 'summer') {
        // Lower chance for subtle summer leaves
        spawnChance = 0.5;
        particleType = STATE.isNight ? 'fireflies' : 'leaves-green';
      } else if (season === 'winter') {
        spawnChance = 0.9;
        particleType = 'snowflakes';
      } 
      
      // Call the enhanced creator if chance succeeds
      if (particleType && Math.random() < spawnChance) {
        // Use the refined function for all seasonal particles
        createEnhancedParticle(particleType);
      }
    }, 200); // Check every 200 milliseconds for smooth flow rate
  }
}

// Function to load and apply seasonal theming to SVG buttons
function loadSVGButtons() {
  const buttons = STATE.config?.ui_elements?.buttons || {
    start: 'assets/images/start-button.svg',
    reset: 'assets/images/reset-button.svg'
  };
  
  loadSVGButton('btn-start', buttons.start);
  loadSVGButton('btn-reset', buttons.reset);
}

// Function to toggle between rest and active timer modes
function toggleTimerMode() {
  const restMode = document.getElementById('rest-mode-timer');
  const activeMode = document.getElementById('active-mode-timer');
  
  if (restMode.classList.contains('active')) {
    // Switch to active mode
    restMode.classList.remove('active');
    activeMode.classList.add('active');
    console.log('Switched to Active Mode');
  } else {
    // Switch to rest mode
    activeMode.classList.remove('active');
    restMode.classList.add('active');
    console.log('Switched to Rest Mode');
  }
}

// Add click handlers for mode switching
function setupModeToggling() {
  const restTimer = document.getElementById('rest-mode-timer');
  const setReminderBtn = document.getElementById('btn-set-reminder');
  
  if (restTimer) {
    restTimer.addEventListener('click', toggleTimerMode);
  }
  if (setReminderBtn) {
    setReminderBtn.addEventListener('click', toggleTimerMode);
  }
}

// Function to load individual SVG button with theming
async function loadSVGButton(buttonId, svgFileName) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  try {
    const response = await fetch(svgFileName);
    if (!response.ok) {
      console.log(`SVG button ${svgFileName} not found, keeping text button`);
      return;
    }
    
    const svgText = await response.text();
    
    // Parse and theme the SVG
    const themedSVG = applySVGTheming(svgText);
    
    // Insert the SVG into the button
    button.innerHTML = themedSVG;
    
    console.log(`✅ Loaded SVG button: ${buttonId}`);
  } catch (err) {
    console.log(`Error loading SVG button ${buttonId}:`, err.message);
  }
}

// Function to apply seasonal theming to SVG content
function applySVGTheming(svgText) {
  // Replace SVG color values with CSS variables for dynamic theming
  let themedSVG = svgText
    // Remove white/light backgrounds
    .replace(/fill="#ffffff"/g, 'fill="none"')
    .replace(/fill="#f4f4f6"/g, 'fill="none"')
    .replace(/fill="white"/g, 'fill="none"')
    
    // Wood gradients
    .replace(/#b86a2d/g, 'var(--svg-wood-primary)')
    .replace(/#a15523/g, 'var(--svg-wood-secondary)')
    .replace(/#7e3c15/g, 'var(--svg-wood-tertiary)')
    .replace(/#c77a3d/g, 'var(--svg-wood-primary)')
    .replace(/#8a471b/g, 'var(--svg-wood-secondary)')
    
    // Leaf gradients
    .replace(/#b8ff5a/g, 'var(--svg-leaf-primary)')
    .replace(/#2b8a2e/g, 'var(--svg-leaf-secondary)')
    
    // Vine gradients
    .replace(/#8af06b/g, 'var(--svg-vine-primary)')
    .replace(/#1e7a23/g, 'var(--svg-vine-secondary)')
    
    // Additional wood tones that might appear
    .replace(/#9b5825/g, 'var(--svg-wood-secondary)')
    .replace(/#753812/g, 'var(--svg-wood-tertiary)')
    .replace(/#6e3213/g, 'var(--svg-wood-tertiary)')
    .replace(/#5e2a0e/g, 'var(--svg-wood-tertiary)')
    
    // Leaf accent colors
    .replace(/#83d24a/g, 'var(--svg-leaf-primary)')
    .replace(/#0d4c18/g, 'var(--svg-leaf-secondary)');
    
  return themedSVG;
}

// Function to update SVG button themes when season changes
function updateSVGButtonThemes() {
  // Re-load buttons to apply new theme colors
  loadSVGButtons();
  // Also refresh the frame SVG with new theming
  loadFrameSVG();
}

// Test function to cycle through seasons (for demonstration)
let testSeasons = ['summer', 'autumn', 'winter'];
let currentTestSeason = 0;
function testSeasonSwitch() {
  currentTestSeason = (currentTestSeason + 1) % testSeasons.length;
  const season = testSeasons[currentTestSeason];
  
  // Update the button emoji
  const btn = document.getElementById('btn-season');
  const emojis = { summer: '🌻', autumn: '🍁', winter: '❄️' };
  if (btn) btn.textContent = emojis[season];
  
  // Apply the theme to body and other elements
  document.body.classList.remove('summer-theme', 'autumn-theme', 'winter-theme', 'rain-theme');
  document.body.classList.add(`${season}-theme`);
  
  // Apply to other elements that need theming
  const elementsToTheme = ['clock', 'calendar-grid'];
  elementsToTheme.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.remove('summer-theme', 'autumn-theme', 'winter-theme', 'rain-theme');
      element.classList.add(`${season}-theme`);
    }
  });
  
  // Update SVG themes and reload frame
  updateSVGButtonThemes();
  
  console.log(`🎨 Switched to ${season} theme for testing`);
}

// Function to load and integrate the actual frame.svg content
function loadFrameSVG() {
  const timerSvg = document.getElementById('timer-svg');
  if (!timerSvg) return;
  
  // Attempt to fetch the actual frame.svg file
  fetch('assets/images/frame.svg')
    .then(response => {
      if (!response.ok) {
        console.log('Frame SVG not found, using placeholder design');
        return null;
      }
      return response.text();
    })
    .then(svgText => {
      if (svgText) {
        // Parse the SVG content
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const frameSvg = svgDoc.documentElement;
        
        // Get the viewBox from the original SVG
        const viewBox = frameSvg.getAttribute('viewBox') || '0 0 400 300';
        timerSvg.setAttribute('viewBox', viewBox);
        
        // Clear placeholder content but preserve the foreignObject
        const foreignObject = timerSvg.querySelector('foreignObject');
        timerSvg.innerHTML = '';
        
        // Copy frame SVG content
        Array.from(frameSvg.children).forEach(child => {
          timerSvg.appendChild(child.cloneNode(true));
        });
        
        // Re-add the foreignObject with timer content
        if (foreignObject) {
          timerSvg.appendChild(foreignObject);
        }
        
        console.log('✅ Frame SVG loaded successfully');
      }
    })
    .catch(err => {
      console.log('Using placeholder frame design:', err.message);
    });
}

// Enhanced particle creation with visual improvements
function createEnhancedParticle(type) {
  const container = document.getElementById('particles-layer');
  if (!container) return;

  let particle;
  
  if (type === 'snowflakes') {
    particle = document.createElement("div");
    particle.className = "particle snowflake";
    // Add custom logic for snowflakes if needed (less rotation)
    particle.style.setProperty('--particle-scale', (0.8 + Math.random() * 0.4).toString());
    particle.style.setProperty('--particle-drift', `${(Math.random() - 0.5) * 100}px`);
    particle.style.opacity = (0.6 + Math.random() * 0.4).toString();
  } else if (type.includes('leaves-green') || type === 'leaves-green') {
    particle = document.createElement("div");
    particle.className = "particle leaves-green";
  } else if (type.includes('leaves') && (type.includes('brown') || type.includes('burnt') || type.includes('orange'))) {
    particle = document.createElement("div");
    particle.className = "particle leaves-burnt_orange_brown";
  }
  
  if (particle && type.startsWith('leaves')) {
    // 1. Random Size (Scale)
    // Scale is applied in CSS via the variable, so we only need to set the variable
    const sizeMultiplier = 0.6 + Math.random() * 0.6; // From 60% to 120% scale
    particle.style.setProperty('--particle-scale', sizeMultiplier.toString());
    
    // 2. Random Opacity
    particle.style.opacity = (0.4 + Math.random() * 0.6).toString(); // 40% to 100%

    // 3. Random Rotation (for the CSS animation keyframe)
    const initialRotation = Math.random() * 360;
    particle.style.setProperty('--initial-rotate', `${initialRotation}deg`);
    
    // 4. Random Horizontal Drift (for the CSS animation keyframe)
    const driftX = (Math.random() - 0.5) * 80; // Random drift from -40px to +40px
    particle.style.setProperty('--particle-drift', `${driftX}px`);
    
    // 5. Set fall duration
    particle.style.setProperty('--fall-duration', (6 + Math.random() * 4) + 's');
  }
  
  if (particle) {
    particle.style.left = Math.random() * 100 + "vw";
    particle.style.top = "-10px";
    particle.style.animationDelay = Math.random() * 2 + "s";
    container.appendChild(particle);
  }
  
  return particle;
}

/* ===== MOUSE TRAIL & CUSTOM CURSOR ===== */
function ensureCustomCursor() {
  if (STATE.customCursor && document.body.contains(STATE.customCursor)) return;

  // Wrapper for background tint + svg img inside
  const wrapper = document.createElement('div');
  wrapper.id = 'custom-cursor';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.className = 'custom-cursor-wrapper';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0px';
  wrapper.style.top = '0px';
  wrapper.style.width = '40px';
  wrapper.style.height = '40px';
  wrapper.style.borderRadius = '50%';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '10001';
  wrapper.style.transform = 'translate(-50%, -50%)';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.transition = 'background-color 200ms linear, transform 80ms linear';

  const img = document.createElement('img');
  img.id = 'custom-cursor-img';
  img.src = 'assets/images/cursor-default.svg';
  img.alt = '';
  img.style.width = '26px';
  img.style.height = '26px';
  img.style.pointerEvents = 'none';
  img.style.transition = 'transform 140ms ease-out, filter 200ms linear';

  wrapper.appendChild(img);
  document.body.appendChild(wrapper);
  STATE.customCursor = wrapper;

  // Add a class to hide the native cursor while custom cursor is present
  document.documentElement.classList.add('has-custom-cursor');

  // Pointer move to update cursor and spawn trail particles
  window.addEventListener('pointermove', (e) => {
    if (!STATE.customCursor) return;
    STATE.customCursor.style.left = `${e.clientX}px`;
    STATE.customCursor.style.top = `${e.clientY}px`;

    // spawn small trail particle
    const trailType = document.body.getAttribute('data-mouse-trail') || '';
    createTrailParticle(e.clientX, e.clientY, trailType);
  }, { passive: true });

  // Pointer down/up to animate click cursor
  window.addEventListener('pointerdown', (e) => {
    if (!STATE.customCursor) return;
    const imgEl = document.getElementById('custom-cursor-img');
    if (!imgEl) return;

    // Switch to click SVG and animate down
    imgEl.src = 'assets/images/cursor-click.svg';
    imgEl.classList.add('cursor-press');

    // small timeout to revert back (keep press state visually)
    setTimeout(() => {
      // revert image on pointerup; if pointerup already fired, this is harmless
      if (imgEl) imgEl.classList.remove('cursor-press');
    }, 220);
  }, { passive: true });

  window.addEventListener('pointerup', (e) => {
    if (!STATE.customCursor) return;
    const imgEl = document.getElementById('custom-cursor-img');
    if (!imgEl) return;

    // brief delay to allow click animation to show
    setTimeout(() => {
      imgEl.src = 'assets/images/cursor-default.svg';
    }, 110);
  }, { passive: true });
}

function applyCursorTintForParticleType(particleType) {
  if (!STATE.customCursor) return;
  const wrapper = STATE.customCursor;
  const imgEl = document.getElementById('custom-cursor-img');

  // Season tinting sets the wrapper background and image filter for contrast
  if (particleType.includes('green')) {
    wrapper.style.backgroundColor = 'rgba(124,207,107,0.18)';
    wrapper.style.boxShadow = '0 0 8px rgba(124,207,107,0.25)';
    if (imgEl) imgEl.style.filter = 'brightness(1) saturate(1.05)';
  } else if (particleType.includes('burnt') || particleType.includes('brown') || particleType.includes('orange')) {
    wrapper.style.backgroundColor = 'rgba(196,106,43,0.18)';
    wrapper.style.boxShadow = '0 0 8px rgba(196,106,43,0.22)';
    if (imgEl) imgEl.style.filter = 'brightness(0.98) saturate(0.9)';
  } else if (particleType === 'snowflakes') {
    wrapper.style.backgroundColor = 'rgba(255,255,255,0.18)';
    wrapper.style.boxShadow = '0 0 10px rgba(255,255,255,0.45)';
    if (imgEl) imgEl.style.filter = 'brightness(1.2) contrast(1.05)';
  } else {
    // default
    wrapper.style.backgroundColor = 'rgba(255,255,255,0.12)';
    wrapper.style.boxShadow = 'none';
    if (imgEl) imgEl.style.filter = 'none';
  }
}

function createTrailParticle(x, y, trailType) {
  const container = document.getElementById('particles-layer');
  if (!container) return;

  const p = document.createElement('div');
  p.className = 'trail-particle';

  // Use same particle type system as seasonal particles
  if (trailType.includes('green')) {
    p.classList.add('leaves-green');
  } else if (trailType.includes('burnt') || trailType.includes('brown') || trailType.includes('orange')) {
    p.classList.add('leaves-burnt_orange_brown');
  } else if (trailType === 'snowflakes') {
    p.classList.add('snowflakes');
  } else {
    p.classList.add('default');
  }

  p.style.left = `${x}px`;
  p.style.top = `${y}px`;

  // Add small random variations like seasonal particles
  const sizeVariation = 0.8 + Math.random() * 0.4; // 80% to 120% size
  p.style.transform = `scale(${sizeVariation})`;
  
  // Slight opacity variation for depth
  p.style.opacity = (0.7 + Math.random() * 0.25).toString(); // 70% to 95%

  container.appendChild(p);

  // Remove after short life (slightly shorter than before for cleaner trail)
  setTimeout(() => { if (p && p.parentNode) p.remove(); }, 800 + Math.random() * 200);
}

/* ===== CLICK SFX FOR BUTTONS ===== */
// Play click sound when interactive elements are clicked
document.addEventListener('click', (e) => {
  try {
    const el = e.target;
    const interactive = el.closest && el.closest('button, .nav-item, .timer-button, a, input[type="button"], input[type="submit"]');
    if (!interactive) return;

    // Do not play click when rain lockout prevents clicks
    if (STATE.isRainActive && shouldBlockElement(interactive)) return;

    if (STATE.clickAudio) {
      // clone to allow overlapping rapid clicks
      const audio = STATE.clickAudio.cloneNode();
      audio.volume = 0.2; // Lower volume
      audio.play().catch(() => {});
    }
  } catch (err) {
    // swallow audio errors
  }
}, true);

/**
 * Update calendar and clock aesthetic elements
 */
function updateCalendarClockAesthetic(season, isNight, isRain) {
  const clockElement = document.getElementById('clock');
  const calendarElement = document.getElementById('calendar-grid');
  
  // Clear existing theme classes
  [clockElement, calendarElement].forEach(element => {
    if (element) {
      element.classList.remove(
        'summer-theme', 'autumn-theme', 'winter-theme', 'rain-theme',
        'night-mode', 'day-mode',
        'autumn-spider', 'winter-snowman', 'summer-bird'
      );
    }
  });
  
  // Apply base theme classes
  const themeClass = isRain ? 'rain-theme' : `${season}-theme`;
  const timeClass = isNight ? 'night-mode' : 'day-mode';
  
  // Apply theme to body for global CSS variables
  document.body.classList.remove('summer-theme', 'autumn-theme', 'winter-theme', 'rain-theme');
  document.body.classList.add(themeClass);
  
  [clockElement, calendarElement].forEach(element => {
    if (element) {
      element.classList.add(themeClass, timeClass);
    }
  });
  
  // Add special decorative elements
  if (clockElement) {
    if (season === 'autumn' && !isRain) {
      clockElement.classList.add('autumn-spider');
    } else if (season === 'winter' && !isRain) {
      clockElement.classList.add('winter-snowman'); 
    } else if (season === 'summer' && !isNight && !isRain) {
      clockElement.classList.add('summer-bird');
    }
  }
  
  console.log(`🕐 Calendar/Clock aesthetic updated: ${themeClass} ${timeClass}`);
  
  // Update SVG button themes
  updateSVGButtonThemes();
}

/* ===== TIMER LOGIC ===== */

/**
 * Start or resume the timer
 */
function startTimer() {
  if (STATE.timerInterval) return; // Already running
  
  console.log(`▶️ Starting ${STATE.timerMode} timer: ${STATE.timeRemaining} seconds`);
  
  STATE.isTimerRunning = true;
  
  // Start scene animations
  setSceneRunning(true);
  
  STATE.timerInterval = setInterval(() => {
    STATE.timeRemaining--;
    updateTimerDisplay();
    updateHourglassAnimation();
    
    // Timer finished
    if (STATE.timeRemaining <= 0) {
      clearInterval(STATE.timerInterval);
      STATE.timerInterval = null;
      STATE.isTimerRunning = false;
      
      // Trigger hourglass flip before mode switch
      flipHourglass();
      
      // Handle timer completion
      setTimeout(() => {
        switchMode();
      }, 800); // Delay to allow flip animation
    }
  }, 1000);
  
  updateTimerButtons();
}

/**
 * Pause the timer
 */
function pauseTimer() {
  if (!STATE.timerInterval) return; // Not running
  
  console.log(`⏸️ Pausing ${STATE.timerMode} timer`);
  
  clearInterval(STATE.timerInterval);
  STATE.timerInterval = null;
  STATE.isTimerRunning = false;
  
  updateTimerButtons();
}

/**
 * Reset the timer to initial state
 */
function resetTimer() {
  console.log(`🔄 Resetting timer`);
  
  // Stop any running timer
  if (STATE.timerInterval) {
    clearInterval(STATE.timerInterval);
    STATE.timerInterval = null;
  }
  
  STATE.isTimerRunning = false;
  
  // Pause scene animations
  setSceneRunning(false);
  
  // Reset to work mode with full duration
  const workMinutes = STATE.userSettings?.work_minutes || 25;
  STATE.timerMode = 'work';
  STATE.timeRemaining = workMinutes * 60;
  
  updateTimerDisplay();
  updateTimerButtons();
  updateHourglassAnimation();
}

/**
 * Handle timer completion and mode switching
 */
function switchMode() {
  console.log(`🔔 Timer completed: ${STATE.timerMode}`);
  
  // Play completion sound
  playCompletionSound();
  
  // Increment session count for work sessions
  if (STATE.timerMode === 'work') {
    STATE.sessionCount++;
    console.log(`✅ Work session ${STATE.sessionCount} completed`);
  }
  
  // Determine next mode
  let nextMode;
  let nextDuration;
  let autoStart = false;
  
  if (STATE.timerMode === 'work') {
    // Work completed - determine break type
    const shortBreaksBeforeLong = STATE.userSettings?.short_breaks_before_long || 3;
    
    if (STATE.sessionCount % (shortBreaksBeforeLong + 1) === 0) {
      // Time for long break
      nextMode = 'long-break';
      nextDuration = (STATE.userSettings?.long_break_minutes || 20) * 60;
    } else {
      // Time for short break
      nextMode = 'short-break';
      nextDuration = (STATE.userSettings?.short_break_minutes || 5) * 60;
    }
    
    autoStart = true; // Auto-start breaks
    
  } else {
    // Break completed - back to work
    nextMode = 'work';
    nextDuration = (STATE.userSettings?.work_minutes || 25) * 60;
    autoStart = false; // Wait for user to start work session
  }
  
  // Switch to next mode
  STATE.timerMode = nextMode;
  STATE.timeRemaining = nextDuration;
  
  console.log(`🔄 Switching to ${nextMode} (${Math.floor(nextDuration / 60)} minutes)`);
  
  updateTimerDisplay();
  updateTimerButtons();
  updateHourglassAnimation();
  
  // Auto-start if it's a break, otherwise wait for user
  if (autoStart) {
    setTimeout(() => {
      startTimer();
    }, 1000); // 1 second delay for audio/visual feedback
  } else {
    // Show notification that user needs to start work session
    showWorkStartPrompt();
  }
}

/**
 * Play completion sound effect
 */
function playCompletionSound() {
  try {
  const audio = new Audio(getAudioPath('work_done'));
    audio.volume = 0.7;
    audio.play().catch(err => {
      console.warn('Could not play completion sound:', err);
    });
  } catch (err) {
    console.warn('Audio not available:', err);
  }
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
  const minutesElement = document.getElementById('time-mm');
  const secondsElement = document.getElementById('time-ss');
  
  if (minutesElement && secondsElement) {
    const minutes = Math.floor(STATE.timeRemaining / 60);
    const seconds = STATE.timeRemaining % 60;
    
    minutesElement.textContent = minutes.toString().padStart(2, '0');
    secondsElement.textContent = seconds.toString().padStart(2, '0');
  }
  
  // Update mode indicator (btn-mode shows current mode)
  const modeBtn = document.getElementById('btn-mode');
  if (modeBtn) {
    const modeText = {
      'work': 'Work',
      'short-break': 'Short Break',
      'long-break': 'Long Break'
    };
    modeBtn.textContent = modeText[STATE.timerMode] || STATE.timerMode;
    modeBtn.dataset.mode = STATE.timerMode;
  }
  
  // Update session indicator
  const sessionCurrentElement = document.getElementById('session-current');
  const sessionTotalElement = document.getElementById('session-total');
  if (sessionCurrentElement && sessionTotalElement) {
    sessionCurrentElement.textContent = STATE.sessionCount + 1;
    const totalSessions = STATE.userSettings?.pomodoro_sessions || 4;
    sessionTotalElement.textContent = totalSessions;
  }
}

/**
 * Update timer button states
 */
function updateTimerButtons() {
  const startBtn = document.getElementById('btn-start');
  const pauseBtn = document.getElementById('btn-pause');
  const resetBtn = document.getElementById('btn-reset');
  
  if (startBtn && pauseBtn) {
    if (STATE.isTimerRunning) {
      // Show pause button, hide start button
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
      pauseBtn.disabled = false;
    } else {
      // Show start button, hide pause button
      startBtn.style.display = 'inline-block';
      pauseBtn.style.display = 'none';
      startBtn.disabled = false;
    }
  }
  
  if (resetBtn) {
    resetBtn.disabled = false;
  }
}

/**
 * Show prompt for user to start work session
 */
function showWorkStartPrompt() {
  // You can implement a modal or notification here
  console.log('💼 Ready to start work session - click Start when ready!');
  
  // Optional: Add visual indication
  const startBtn = document.getElementById('btn-start');
  if (startBtn) {
    startBtn.classList.add('pulse-animation');
    setTimeout(() => {
      startBtn.classList.remove('pulse-animation');
    }, 3000);
  }
}

/**
 * Setup timer button event listeners
 */
function setupTimerButtons() {
  const startBtn = document.getElementById('btn-start');
  const pauseBtn = document.getElementById('btn-pause');
  const resetBtn = document.getElementById('btn-reset');
  
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startTimer();
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      pauseTimer();
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetTimer();
    });
  }
  
  console.log('✅ Timer buttons setup complete');
}

/* ===== HOURGLASS ANIMATION ===== */

/**
 * Update hourglass visual based on timer progress
 */
function updateHourglassAnimation() {
  const hourglassElement = document.querySelector('.hourglass');
  if (!hourglassElement) return;
  
  // Calculate progress (0 to 1)
  const totalTime = getTotalTimeForMode(STATE.timerMode);
  const elapsed = totalTime - STATE.timeRemaining;
  const progress = Math.min(elapsed / totalTime, 1);
  
  // Update sand levels
  const topSand = Math.max(0, (1 - progress) * 40); // Start at 40%, drain to 0%
  const bottomSand = Math.min(40, progress * 40);   // Start at 10%, fill to 40%
  
  hourglassElement.style.setProperty('--top-sand-height', `${topSand}%`);
  hourglassElement.style.setProperty('--bottom-sand-height', `${bottomSand + 10}%`);
  
  // Show sand stream when timer is running
  const sandStream = document.querySelector('.sand-stream');
  if (sandStream) {
    if (STATE.isTimerRunning && topSand > 0) {
      sandStream.style.display = 'block';
    } else {
      sandStream.style.display = 'none';
    }
  }
}

/**
 * Trigger hourglass flip animation
 */
function flipHourglass() {
  const hourglassElement = document.querySelector('.hourglass');
  if (!hourglassElement) return;
  
  console.log('⏳ Flipping hourglass');
  
  // Add flip class
  hourglassElement.classList.add('flip');
  
  // Reset sand levels after flip animation
  setTimeout(() => {
    hourglassElement.style.setProperty('--top-sand-height', '40%');
    hourglassElement.style.setProperty('--bottom-sand-height', '10%');
    
    // Remove flip class after animation
    setTimeout(() => {
      hourglassElement.classList.remove('flip');
    }, 400);
  }, 400);
}

/**
 * Get total time in seconds for a timer mode
 */
function getTotalTimeForMode(mode) {
  switch (mode) {
    case 'work':
      return (STATE.userSettings?.work_minutes || 25) * 60;
    case 'short-break':
      return (STATE.userSettings?.short_break_minutes || 5) * 60;
    case 'long-break':
      return (STATE.userSettings?.long_break_minutes || 20) * 60;
    default:
      return 25 * 60;
  }
}

/**
 * Initialize hourglass HTML structure
 */
function setupHourglassAnimation() {
  const container = document.getElementById('hourglass');
  if (!container) return;
  
  // Create hourglass structure if it doesn't exist
  if (!container.querySelector('.hourglass')) {
    container.innerHTML = `
      <div class="hourglass">
        <div class="sand-stream"></div>
      </div>
    `;
  }
  
  // Initialize sand levels
  updateHourglassAnimation();
  
  console.log('✅ Hourglass animation setup complete');
}

/* ===== RAIN CYCLE MANAGER ===== */

/**
 * Toggle rain mode on/off manually
 */
function toggleRain() {
  if (STATE.isRainActive) {
    endRain();
  } else {
    startRain();
  }
}

/**
 * Start rain mode - manual toggle
 */
function startRain() {
  if (STATE.isRainActive) {
    console.log('🌧️ Rain already active, ignoring start request');
    return;
  }
  
  console.log('🌧️ Starting rain mode');
  
  STATE.isRainActive = true;
  
  // Apply rain theme
  applyTheme(STATE.currentSeason, STATE.isNight, true);
  
  // Start rainfall audio loop
  startRainfallAudio();
  
  // Add wet effect to all buttons
  addWetEffectToButtons();
  
  // Create rain particle system
  createRainParticleSystem();
  createRainOverlay();
  
  // Show rain lockout (auto-hide after 5 seconds)
  showRainLockout(true, true);
  
  console.log('🌧️ Rain mode activated');
}



/**
 * End rain mode and return to seasonal theme
 */
function endRain() {
  if (!STATE.isRainActive) {
    console.log('🌤️ Rain not active, ignoring end request');
    return;
  }
  
  console.log('🌤️ Ending rain mode - returning to seasonal theme');
  
  STATE.isRainActive = false;
  
  // Return to seasonal theme
  applyTheme(STATE.currentSeason, STATE.isNight, false);
  
  // Stop rainfall audio
  stopRainfallAudio();
  
  // Remove wet effect from buttons
  removeWetEffectFromButtons();
  
  // Cleanup rain particles
  cleanupRainParticles();
  removeRainOverlay();
  
  // Hide rain lockout
  showRainLockout(false);
  
  console.log('🌤️ Rain mode ended');
}

/**
 * Start rainfall audio loop
 */
function startRainfallAudio() {
  try {
    // Stop any existing rain audio
    stopRainfallAudio();
    
  STATE.rainAudio = new Audio(getAudioPath('rainfall'));
    STATE.rainAudio.loop = true;
    STATE.rainAudio.volume = 0.6;
    
    // Fade in the audio
    STATE.rainAudio.volume = 0;
    STATE.rainAudio.play().then(() => {
      console.log('🎵 Rainfall audio started');
      
      // Gradually increase volume over 3 seconds
      let volume = 0;
      const fadeIn = setInterval(() => {
        volume += 0.02;
        if (volume >= 0.6) {
          volume = 0.6;
          clearInterval(fadeIn);
        }
        if (STATE.rainAudio) {
          STATE.rainAudio.volume = volume;
        }
      }, 50);
      
    }).catch(err => {
      console.warn('Could not play rainfall audio:', err);
    });
    
  } catch (err) {
    console.warn('Rainfall audio not available:', err);
  }
}

/**
 * Stop rainfall audio
 */
function stopRainfallAudio() {
  if (STATE.rainAudio) {
    console.log('🔇 Stopping rainfall audio');
    
    // Fade out the audio
    let volume = STATE.rainAudio.volume;
    const fadeOut = setInterval(() => {
      volume -= 0.02;
      if (volume <= 0) {
        volume = 0;
        clearInterval(fadeOut);
        if (STATE.rainAudio) {
          STATE.rainAudio.pause();
          STATE.rainAudio = null;
        }
      } else if (STATE.rainAudio) {
        STATE.rainAudio.volume = volume;
      }
    }, 50);
  }
}

/**
 * Add wet effect overlay to all interactive buttons
 */
function addWetEffectToButtons() {
  const buttons = document.querySelectorAll('.nav-item, .nav-icon, button, .timer-button');
  
  buttons.forEach(button => {
    button.classList.add('rain-wet-effect');
  });
  
  console.log(`💧 Added wet effect to ${buttons.length} buttons`);
}

/**
 * Remove wet effect overlay from all buttons
 */
function removeWetEffectFromButtons() {
  const buttons = document.querySelectorAll('.rain-wet-effect');
  
  buttons.forEach(button => {
    button.classList.remove('rain-wet-effect');
  });
  
  console.log(`🌤️ Removed wet effect from ${buttons.length} buttons`);
}



/**
 * Manual rain controls for testing (can be called from console)
 */
window.debugRain = {
  start: startRain,
  end: endRain,
  status: () => {
    console.log('Rain Status:', {
      active: STATE.isRainActive,
      startTime: STATE.rainStartTime ? new Date(STATE.rainStartTime).toLocaleTimeString() : null,
      audio: !!STATE.rainAudio
    });
  }
};

/* ===== RAIN PARTICLE SYSTEM ===== */

/**
 * Create animated rain particle system
 */
function createRainParticleSystem() {
  const particleCount = 100; // Number of rain particles
  const particlesLayer = document.getElementById('particles-layer');
  
  if (!particlesLayer) return;
  
  // Clear existing rain particles
  particlesLayer.querySelectorAll('.rain-particle').forEach(p => p.remove());
  
  for (let i = 0; i < particleCount; i++) {
    createRainParticle();
  }
  
  console.log(`🌧️ Created ${particleCount} rain particles`);
}

/**
 * Create a single rain particle
 */
function createRainParticle() {
  const particle = document.createElement('div');
  particle.className = 'rain-particle';
  
  // Random particle properties
  const size = Math.random();
  if (size < 0.3) {
    particle.classList.add('light');
  } else if (size > 0.7) {
    particle.classList.add('heavy');
  }
  
  // Random position and timing
  const startX = Math.random() * window.innerWidth;
  const animationDuration = 1 + Math.random() * 2; // 1-3 seconds
  const animationDelay = Math.random() * 2; // 0-2 seconds delay
  
  particle.style.left = startX + 'px';
  particle.style.animationDuration = animationDuration + 's';
  particle.style.animationDelay = animationDelay + 's';
  
  // Add to DOM
  document.body.appendChild(particle);
  
  // Remove particle after animation completes
  const totalTime = (animationDuration + animationDelay) * 1000;
  setTimeout(() => {
    if (particle && particle.parentNode) {
      particle.remove();
      
      // Create splash effect at bottom
      createRainSplash(startX);
      
      // Create new particle if rain is still active
      if (STATE.isRainActive) {
        setTimeout(() => createRainParticle(), Math.random() * 1000);
      }
    }
  }, totalTime);
}

/**
 * Create rain splash effect when particle hits ground
 * @param {number} x - X coordinate for splash
 */
function createRainSplash(x) {
  const splash = document.createElement('div');
  splash.className = 'rain-splash';
  splash.style.left = x + 'px';
  splash.style.bottom = '0px';
  
  document.body.appendChild(splash);
  
  // Remove splash after animation
  setTimeout(() => {
    if (splash && splash.parentNode) {
      splash.remove();
    }
  }, 300);
}

/**
 * Create rain overlay for screen wet effect
 */
function createRainOverlay() {
  // Remove existing overlay
  removeRainOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'rain-screen-overlay';
  overlay.className = 'rain-overlay';
  
  document.body.appendChild(overlay);
  
  console.log('🌧️ Rain screen overlay created');
}

/**
 * Remove rain overlay
 */
function removeRainOverlay() {
  const existingOverlay = document.getElementById('rain-screen-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
}

/**
 * Cleanup rain particle system
 */
function cleanupRainParticles() {
  // Remove all rain particles
  document.querySelectorAll('.rain-particle').forEach(p => p.remove());
  document.querySelectorAll('.rain-splash').forEach(s => s.remove());
  
  // Remove rain overlay
  removeRainOverlay();
  
  console.log('🧹 Rain particles cleaned up');
}

/* ===== RAIN AESTHETICS ===== */

/**
 * Create water ripple effect at specified coordinates
 * @param {number} x - X coordinate for ripple center
 * @param {number} y - Y coordinate for ripple center
 * @param {string} size - 'small', 'medium', or 'large'
 */
function createWaterRipple(x, y, size = 'medium') {
  const ripple = document.createElement('div');
  ripple.className = `water-ripple ${size !== 'medium' ? size : ''}`;
  
  // Position the ripple
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  
  // Add to document
  document.body.appendChild(ripple);
  
  // Remove after animation completes
  const duration = size === 'large' ? 1000 : size === 'small' ? 600 : 800;
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple);
    }
  }, duration);
  
  console.log(`💧 Water ripple created at (${x}, ${y}) - ${size}`);
}

/**
 * Create multiple ripples for enhanced effect
 */
function createMultipleRipples(x, y) {
  // Main ripple
  createWaterRipple(x, y, 'medium');
  
  // Secondary smaller ripples with slight delay and offset
  setTimeout(() => {
    createWaterRipple(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, 'small');
  }, 100);
  
  setTimeout(() => {
    createWaterRipple(x + (Math.random() - 0.5) * 15, y + (Math.random() - 0.5) * 15, 'small');
  }, 200);
}

/**
 * Check if an element should be blocked during rain mode
 * @param {Element} element - The element to check
 * @returns {boolean} True if element should be blocked
 */
function shouldBlockElement(element) {
  // Only block during rain mode
  if (!STATE.isRainActive) return false;
  
  // Always allow timer controls to work
  if (element.closest('#timer-controls')) {
    return false;
  }
  
  // Allow rain toggle button to work during rain
  if (element.id === 'rain-toggle') {
    return false;
  }
  
  // Block settings page navigation and form elements (except rain toggle)
  if (element.closest('#page-settings') || 
      element.dataset?.target === 'settings' ||
      element.id === 'nav-settings') {
    return true;
  }
  
  // Block settings form elements specifically (except rain toggle)
  if (element.closest('#settings-form') && element.id !== 'rain-toggle') {
    return true;
  }
  
  // Block calendar navigation
  if (element.dataset?.target === 'calendar' ||
      element.id === 'nav-calendar') {
    return true;
  }
  
  // Allow navigation back to timer
  if (element.dataset?.target === 'timer') {
    return false;
  }
  
  // Block calendar interactions
  if (element.closest('#page-calendar')) {
    return true;
  }
  
  // Allow everything else (like timer controls)
  return false;
}

/**
 * Setup global click listener for rain effects
 */
function setupRainClickEffects() {
  document.addEventListener('click', (event) => {
    if (!STATE.isRainActive) return;
    
    const x = event.clientX;
    const y = event.clientY;
    const clickedElement = event.target;
    
    // Check if element should be blocked
    if (shouldBlockElement(clickedElement)) {
      event.preventDefault();
      event.stopPropagation();
      
      // Show shock animation and re-show lockout message
      triggerShockAnimation(clickedElement, x, y);
      showRainLockout(true, true); // Auto-hide after 5 seconds
      return false;
    }
    
    // Normal rain click - create ripple effect
    createMultipleRipples(x, y);
  }, true); // Use capture phase to catch events early
  
  console.log('✅ Rain click effects setup complete');
}

/**
 * Trigger shock animation when clicking disabled elements during rain
 * @param {Element} element - The clicked element
 * @param {number} x - Click X coordinate
 * @param {number} y - Click Y coordinate
 */
function triggerShockAnimation(element, x, y) {
  console.log('⚡ Triggering shock animation');
  
  // Add shock class to clicked element
  element.classList.add('button-shock');
  
  // Create screen flash effect
  const flash = document.createElement('div');
  flash.className = 'shock-flash';
  document.body.appendChild(flash);
  
  // Create localized shock ripple (different from water ripple)
  const shockRipple = document.createElement('div');
  shockRipple.className = 'shock-ripple';
  shockRipple.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 20px;
    height: 20px;
    background: radial-gradient(circle, rgba(255, 255, 0, 0.8) 0%, rgba(255, 140, 0, 0.6) 50%, transparent 100%);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%, -50%) scale(0);
    animation: shockRipple 0.4s ease-out forwards;
  `;
  
  // Add shock ripple keyframes if not already added
  if (!document.querySelector('#shock-ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'shock-ripple-styles';
    style.textContent = `
      @keyframes shockRipple {
        0% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(3);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(shockRipple);
  
  // Play shock sound effect
  playShockSound();
  
  // Cleanup animations
  setTimeout(() => {
    element.classList.remove('button-shock');
    if (flash.parentNode) flash.parentNode.removeChild(flash);
    if (shockRipple.parentNode) shockRipple.parentNode.removeChild(shockRipple);
  }, 400);
}

/**
 * Play shock sound effect
 */
function playShockSound() {
  try {
  const audio = new Audio('assets/audio/shock.mp3');
    audio.volume = 0.4;
    audio.play().catch(err => {
      console.warn('Could not play shock sound:', err);
    });
  } catch (err) {
    console.warn('Shock audio not available:', err);
  }
}

/* ===== CALENDAR GENERATION & INTERACTIVITY ===== */

/**
 * Wire up calendar header navigation buttons
 */
function wireCalendarHeader() {
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');
  if (!prevBtn || !nextBtn) return;

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const m = STATE.currentMonth - 1;
    const y = m < 0 ? STATE.currentYear - 1 : STATE.currentYear;
    const month = (m + 12) % 12;
    renderCalendar(month, y);
  });

  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const m = STATE.currentMonth + 1;
    const y = m > 11 ? STATE.currentYear + 1 : STATE.currentYear;
    const month = m % 12;
    renderCalendar(month, y);
  });
}

/**
 * Update calendar header title
 */
function updateCalendarHeader(month, year) {
  const title = document.getElementById('cal-title');
  if (!title) return;
  const name = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(year, month, 1));
  title.textContent = `${name} ${year}`;
}

/**
 * Add cross mark to a day cell
 */
function addCrossMarkToDay(dayCell) {
  // Remove any prior cross
  const existing = dayCell.querySelector('.cross-mark');
  if (existing) existing.remove();

  const color = STATE.userSettings?.calendar_cross_color || '#ff4d4d';

  const wrapper = document.createElement('div');
  wrapper.className = 'cross-mark';
  wrapper.innerHTML = `
    <svg class="cross-svg" viewBox="0 0 24 24" aria-hidden="true">
      <line class="cross-line-1" x1="3" y1="3" x2="21" y2="21" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <line class="cross-line-2" x1="21" y1="3" x2="3" y2="21" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
  dayCell.appendChild(wrapper);
}

/**
 * Mark a day as completed
 */
function markDayAsCompleted(dayCell, dateKey) {
  STATE.completedDays.add(dateKey);
  dayCell.classList.add('completed', 'drawing-animation');
  addCrossMarkToDay(dayCell);
  // Optional: audio fx
  try { document.getElementById('audio-drawing')?.play().catch(()=>{});} catch(e){}
}

/**
 * Unmark a day as completed
 */
function unmarkDayAsCompleted(dayCell, dateKey) {
  STATE.completedDays.delete(dateKey);
  dayCell.classList.remove('completed', 'drawing-animation');
  dayCell.querySelector('.cross-mark')?.remove();
}

/**
 * Add task indicator to day cell
 */
function addTaskIndicatorToDay(dayCell, count) {
  let badge = dayCell.querySelector('.task-indicator');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'task-indicator';
    dayCell.appendChild(badge);
  }
  badge.textContent = count;
  badge.setAttribute('aria-label', `${count} task${count === 1 ? '' : 's'}`);
}

/**
 * Render calendar for specified month and year
 * @param {number} month - Month (0-11)
 * @param {number} year - Full year (e.g. 2025)
 */
function renderCalendar(month, year) {
  // Update STATE to track current month/year
  STATE.currentMonth = month;
  STATE.currentYear = year;
  
  // Update header title
  updateCalendarHeader(month, year);
  const container = document.getElementById('calendar-grid');
  if (!container) {
    console.warn('Calendar container not found');
    return;
  }
  
  console.log(`📅 Rendering calendar for ${month + 1}/${year}`);
  
  // Update state
  STATE.currentMonth = month;
  STATE.currentYear = year;
  
  // Clear existing calendar
  container.innerHTML = '';
  
  // Create calendar grid
  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'calendar-grid';
  
  // Add day headers (Sun, Mon, Tue, etc.)
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-header';
    header.textContent = day;
    calendarGrid.appendChild(header);
  });
  
  // Calculate calendar layout
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-empty';
    calendarGrid.appendChild(emptyCell);
  }
  
  // Add day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;
    dayCell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Mark today
    if (isCurrentMonth && today.getDate() === day) {
      dayCell.classList.add('today');
    }
    
    // Mark completed days
    const dateKey = dayCell.dataset.date;
    if (STATE.completedDays.has(dateKey)) {
      dayCell.classList.add('completed');
      addCrossMarkToDay(dayCell);
    }
    
    // Mark days with tasks
    if (STATE.tasks.has(dateKey) && STATE.tasks.get(dateKey).length > 0) {
      dayCell.classList.add('has-tasks');
      addTaskIndicatorToDay(dayCell, STATE.tasks.get(dateKey).length);
    }
    
    // Add event listeners
    setupDayEventListeners(dayCell);
    
    calendarGrid.appendChild(dayCell);
  }
  
  container.appendChild(calendarGrid);
  
  // Update calendar header if it exists
  updateCalendarHeader(month, year);
  
  console.log('✅ Calendar rendered successfully');
}

/**
 * Setup event listeners for a calendar day cell
 * @param {Element} dayCell - The day cell element
 */
function setupDayEventListeners(dayCell) {
  // Right-click: Mark as completed (drawing animation)
  dayCell.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    
    const dateKey = dayCell.dataset.date;
    
    if (STATE.completedDays.has(dateKey)) {
      // Unmark as completed
      unmarkDayAsCompleted(dayCell, dateKey);
    } else {
      // Mark as completed with drawing animation
      markDayAsCompleted(dayCell, dateKey);
    }
  });
  
  // Left-click: Show task modal
  dayCell.addEventListener('click', (event) => {
    event.preventDefault();
    
    const dateKey = dayCell.dataset.date;
    showTaskModal(dateKey);
  });
  
  // Hover effects
  dayCell.addEventListener('mouseenter', () => {
    if (!dayCell.classList.contains('completed')) {
      dayCell.classList.add('hover');
    }
  });
  
  dayCell.addEventListener('mouseleave', () => {
    dayCell.classList.remove('hover');
  });
}

/**
 * Mark a day as completed with drawing animation
 * @param {Element} dayCell - The day cell element
 * @param {string} dateKey - Date string (YYYY-MM-DD)
 */
function markDayAsCompleted(dayCell, dateKey) {
  console.log(`✅ Marking ${dateKey} as completed`);
  
  // Add to completed days
  STATE.completedDays.add(dateKey);
  
  // Add completed class
  dayCell.classList.add('completed', 'drawing-animation');
  
  // Create and animate cross mark
  const crossMark = addCrossMarkToDay(dayCell);
  
  // Play drawing audio
  playDrawingAudio();
  
  // Save to localStorage
  saveCompletedDays();
  
  // Show encouraging popup after animation
  setTimeout(() => {
    dayCell.classList.remove('drawing-animation');
    showEncouragingPopup(dateKey);
  }, 800);
}

/**
 * Unmark a day as completed
 * @param {Element} dayCell - The day cell element
 * @param {string} dateKey - Date string (YYYY-MM-DD)
 */
function unmarkDayAsCompleted(dayCell, dateKey) {
  console.log(`❌ Unmarking ${dateKey} as completed`);
  
  // Remove from completed days
  STATE.completedDays.delete(dateKey);
  
  // Remove completed class and cross mark
  dayCell.classList.remove('completed');
  const crossMark = dayCell.querySelector('.cross-mark');
  if (crossMark) {
    crossMark.remove();
  }
  
  // Save to localStorage
  saveCompletedDays();
}

/**
 * Add cross mark to a completed day
 * @param {Element} dayCell - The day cell element
 * @returns {Element} The cross mark element
 */
function addCrossMarkToDay(dayCell) {
  // Remove existing cross mark
  const existing = dayCell.querySelector('.cross-mark');
  if (existing) {
    existing.remove();
  }
  
  // Create cross mark
  const crossMark = document.createElement('div');
  crossMark.className = 'cross-mark';
  crossMark.innerHTML = `
    <svg viewBox="0 0 24 24" class="cross-svg">
      <path class="cross-line-1" d="M6 6L18 18" stroke="var(--calendar-cross-color, #ff4d4d)" stroke-width="2" stroke-linecap="round"/>
      <path class="cross-line-2" d="M6 18L18 6" stroke="var(--calendar-cross-color, #ff4d4d)" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  
  dayCell.appendChild(crossMark);
  return crossMark;
}

/**
 * Add task indicator to a day with tasks
 * @param {Element} dayCell - The day cell element
 * @param {number} taskCount - Number of tasks
 */
function addTaskIndicatorToDay(dayCell, taskCount) {
  // Remove existing indicator
  const existing = dayCell.querySelector('.task-indicator');
  if (existing) {
    existing.remove();
  }
  
  // Create task indicator
  const indicator = document.createElement('div');
  indicator.className = 'task-indicator';
  indicator.textContent = taskCount;
  indicator.title = `${taskCount} task${taskCount === 1 ? '' : 's'}`;
  
  dayCell.appendChild(indicator);
}

/**
 * Show task modal for a specific date
 * @param {string} dateKey - Date string (YYYY-MM-DD)
 */
function showTaskModal(dateKey) {
  console.log(`📝 Opening task modal for ${dateKey}`);
  
  STATE.taskModalOpen = true;
  STATE.currentTaskDate = dateKey;
  
  // Create modal if it doesn't exist
  let modal = document.getElementById('task-modal');
  if (!modal) {
    modal = createTaskModal();
  }
  
  // Populate modal with date and existing tasks
  const dateObj = new Date(dateKey + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Tasks for ${formattedDate}`;
  }
  
  // Load existing tasks
  loadTasksIntoModal(dateKey);
  
  // Show modal
  modal.removeAttribute('hidden');
  modal.classList.add('modal-open');
  
  // Focus on input field
  const taskInput = modal.querySelector('#new-task-input');
  if (taskInput) {
    setTimeout(() => taskInput.focus(), 100);
  }
}

/**
 * Hide task modal
 */
function hideTaskModal() {
  console.log('📝 Closing task modal');
  
  const modal = document.getElementById('task-modal');
  if (!modal) return;
  
  STATE.taskModalOpen = false;
  STATE.currentTaskDate = null;
  
  modal.classList.remove('modal-open');
  setTimeout(() => {
    modal.setAttribute('hidden', 'true');
  }, 200);
}

/**
 * Create task modal HTML structure
 * @returns {Element} The modal element
 */
function createTaskModal() {
  const modal = document.createElement('div');
  modal.id = 'task-modal';
  modal.className = 'task-modal';
  modal.setAttribute('hidden', 'true');
  
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Tasks</h3>
        <button class="modal-close" type="button">&times;</button>
      </div>
      <div class="modal-body">
        <div class="task-input-section">
          <input type="text" id="new-task-input" placeholder="Add a new task..." maxlength="100">
          <button id="add-task-btn" type="button">Add</button>
        </div>
        <div class="task-list-section">
          <ul id="task-list"></ul>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  const closeBtn = modal.querySelector('.modal-close');
  const backdrop = modal.querySelector('.modal-backdrop');
  const addBtn = modal.querySelector('#add-task-btn');
  const taskInput = modal.querySelector('#new-task-input');
  
  closeBtn.addEventListener('click', hideTaskModal);
  backdrop.addEventListener('click', hideTaskModal);
  addBtn.addEventListener('click', addNewTask);
  
  taskInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addNewTask();
    }
  });
  
  document.body.appendChild(modal);
  return modal;
}

/**
 * Load tasks into modal for specified date
 * @param {string} dateKey - Date string (YYYY-MM-DD)
 */
function loadTasksIntoModal(dateKey) {
  const taskList = document.getElementById('task-list');
  if (!taskList) return;
  
  // Clear existing tasks
  taskList.innerHTML = '';
  
  // Get tasks for this date
  const tasks = STATE.tasks.get(dateKey) || [];
  
  tasks.forEach((task, index) => {
    const taskItem = createTaskListItem(task, index, dateKey);
    taskList.appendChild(taskItem);
  });
  
  if (tasks.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-tasks';
    emptyMessage.textContent = 'No tasks yet. Add one above!';
    taskList.appendChild(emptyMessage);
  }
}

/**
 * Create a task list item element
 * @param {Object} task - Task object {text, completed, id}
 * @param {number} index - Task index
 * @param {string} dateKey - Date string
 * @returns {Element} Task list item
 */
function createTaskListItem(task, index, dateKey) {
  const li = document.createElement('li');
  li.className = `task-item ${task.completed ? 'completed' : ''}`;
  li.dataset.taskId = task.id;
  
  li.innerHTML = `
    <div class="task-content">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
      <span class="task-text">${escapeHtml(task.text)}</span>
    </div>
    <div class="task-actions">
      <button class="task-move-btn" title="Move to another date">📅</button>
      <button class="task-delete-btn" title="Delete task">&times;</button>
    </div>
  `;
  
  // Add event listeners
  const checkbox = li.querySelector('.task-checkbox');
  const deleteBtn = li.querySelector('.task-delete-btn');
  const moveBtn = li.querySelector('.task-move-btn');
  
  checkbox.addEventListener('change', () => toggleTaskCompletion(task.id, dateKey));
  deleteBtn.addEventListener('click', () => deleteTask(task.id, dateKey));
  moveBtn.addEventListener('click', () => showTaskMoveDialog(task, dateKey));
  
  return li;
}

/**
 * Add a new task
 */
function addNewTask() {
  const taskInput = document.getElementById('new-task-input');
  if (!taskInput || !STATE.currentTaskDate) return;
  
  const taskText = taskInput.value.trim();
  if (!taskText) return;
  
  console.log(`➕ Adding task: "${taskText}" to ${STATE.currentTaskDate}`);
  
  // Create task object
  const task = {
    id: generateTaskId(),
    text: taskText,
    completed: false,
    createdAt: Date.now()
  };
  
  // Add to tasks map
  if (!STATE.tasks.has(STATE.currentTaskDate)) {
    STATE.tasks.set(STATE.currentTaskDate, []);
  }
  STATE.tasks.get(STATE.currentTaskDate).push(task);
  
  // Clear input
  taskInput.value = '';
  
  // Reload tasks in modal
  loadTasksIntoModal(STATE.currentTaskDate);
  
  // Update calendar display
  updateCalendarTaskIndicators();
  
  // Save tasks
  saveTasks();
}

/**
 * Toggle task completion status
 * @param {string} taskId - Task ID
 * @param {string} dateKey - Date string
 */
function toggleTaskCompletion(taskId, dateKey) {
  const tasks = STATE.tasks.get(dateKey);
  if (!tasks) return;
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.completed = !task.completed;
  
  console.log(`${task.completed ? '✅' : '⭕'} Task "${task.text}" marked as ${task.completed ? 'completed' : 'incomplete'}`);
  
  // Update UI
  const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskItem) {
    taskItem.classList.toggle('completed', task.completed);
  }
  
  // Save tasks
  saveTasks();
  
  // Show encouraging popup if task completed
  if (task.completed) {
    showEncouragingPopup(dateKey, task.text);
  }
}

/**
 * Delete a task
 * @param {string} taskId - Task ID
 * @param {string} dateKey - Date string
 */
function deleteTask(taskId, dateKey) {
  const tasks = STATE.tasks.get(dateKey);
  if (!tasks) return;
  
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;
  
  const task = tasks[taskIndex];
  console.log(`🗑️ Deleting task: "${task.text}"`);
  
  // Remove task
  tasks.splice(taskIndex, 1);
  
  // Clean up empty task arrays
  if (tasks.length === 0) {
    STATE.tasks.delete(dateKey);
  }
  
  // Reload tasks in modal
  loadTasksIntoModal(dateKey);
  
  // Update calendar display
  updateCalendarTaskIndicators();
  
  // Save tasks
  saveTasks();
}

/**
 * Show encouraging popup
 * @param {string} dateKey - Date string
 * @param {string} taskText - Optional task text for task completion
 */
function showEncouragingPopup(dateKey, taskText = null) {
  const messages = taskText
    ? [
        `Great job completing "${taskText}"! 🎉`,
        `Task completed! You're making progress! ✨`,
        `Well done on finishing "${taskText}"! 👏`,
        `Another task down! Keep it up! 💪`,
        `Excellent work on "${taskText}"! 🌟`
      ]
    : [
        'Day completed! Excellent work! 🎉',
        'Another productive day! Well done! ✨',
        'You\'re on fire! Great job today! 🔥',
        'Consistency is key! Keep it up! 💪',
        'Amazing progress! You\'re doing great! 🌟'
      ];
  
  const message = messages[Math.floor(Math.random() * messages.length)];
  
  // Create popup
  const popup = document.createElement('div');
  popup.className = 'encouraging-popup';
  popup.innerHTML = `
    <div class="popup-content">
      <div class="popup-icon">🎊</div>
      <div class="popup-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Animate in
  setTimeout(() => popup.classList.add('show'), 100);
  
  // Remove after delay
  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, 300);
  }, 3000);
  
  console.log(`🎉 Encouraging popup: ${message}`);
}

/**
 * Update calendar header with month/year
 * @param {number} month - Month (0-11)
 * @param {number} year - Full year
 */
function updateCalendarHeader(month, year) {
  const header = document.getElementById('cal-title');
  if (!header) return;
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  header.textContent = `${monthNames[month]} ${year}`;
}

/**
 * Update task indicators on calendar after task changes
 */
function updateCalendarTaskIndicators() {
  const dayCells = document.querySelectorAll('.calendar-day');
  
  dayCells.forEach(cell => {
    const dateKey = cell.dataset.date;
    const tasks = STATE.tasks.get(dateKey) || [];
    
    // Remove existing indicator
    const existingIndicator = cell.querySelector('.task-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Add new indicator if tasks exist
    if (tasks.length > 0) {
      cell.classList.add('has-tasks');
      addTaskIndicatorToDay(cell, tasks.length);
    } else {
      cell.classList.remove('has-tasks');
    }
  });
}

/**
 * Play drawing audio when marking day as completed
 */
function playDrawingAudio() {
  try {
  const audio = new Audio(getAudioPath('drawing'));
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.warn('Could not play drawing audio:', err);
    });
  } catch (err) {
    console.warn('Drawing audio not available:', err);
  }
}

/**
 * Generate unique task ID
 * @returns {string} Unique task ID
 */
function generateTaskId() {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Save completed days to localStorage
 */
function saveCompletedDays() {
  try {
    const completedArray = Array.from(STATE.completedDays);
    localStorage.setItem('studyflow_completed', JSON.stringify(completedArray));
    console.log('💾 Completed days saved');
  } catch (err) {
    console.error('Failed to save completed days:', err);
  }
}

/**
 * Load completed days from localStorage
 */
function loadCompletedDays() {
  try {
    const saved = localStorage.getItem('studyflow_completed');
    if (saved) {
      const completedArray = JSON.parse(saved);
      STATE.completedDays = new Set(completedArray);
      console.log('📅 Completed days loaded:', completedArray.length);
    }
  } catch (err) {
    console.error('Failed to load completed days:', err);
    STATE.completedDays = new Set();
  }
}

/**
 * Save tasks to localStorage
 */
function saveTasks() {
  try {
    const tasksObject = {};
    STATE.tasks.forEach((tasks, dateKey) => {
      tasksObject[dateKey] = tasks;
    });
    localStorage.setItem('studyflow_tasks', JSON.stringify(tasksObject));
    console.log('💾 Tasks saved');
  } catch (err) {
    console.error('Failed to save tasks:', err);
  }
}

/**
 * Load tasks from localStorage
 */
function loadTasks() {
  try {
    const saved = localStorage.getItem('studyflow_tasks');
    if (saved) {
      const tasksObject = JSON.parse(saved);
      STATE.tasks = new Map(Object.entries(tasksObject));
      
      let totalTasks = 0;
      STATE.tasks.forEach(tasks => totalTasks += tasks.length);
      console.log('📝 Tasks loaded:', totalTasks);
    }
  } catch (err) {
    console.error('Failed to load tasks:', err);
    STATE.tasks = new Map();
  }
}

/**
 * Show task move dialog (placeholder for now)
 * @param {Object} task - Task object
 * @param {string} fromDate - Source date
 */
function showTaskMoveDialog(task, fromDate) {
  // For now, just show a simple prompt
  const newDate = prompt(`Move task "${task.text}" to which date? (YYYY-MM-DD format)`);
  
  if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    moveTask(task.id, fromDate, newDate);
  } else if (newDate) {
    alert('Invalid date format. Please use YYYY-MM-DD format.');
  }
}

/**
 * Move task from one date to another
 * @param {string} taskId - Task ID
 * @param {string} fromDate - Source date
 * @param {string} toDate - Target date
 */
function moveTask(taskId, fromDate, toDate) {
  const fromTasks = STATE.tasks.get(fromDate);
  if (!fromTasks) return;
  
  const taskIndex = fromTasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;
  
  const task = fromTasks.splice(taskIndex, 1)[0];
  
  // Clean up empty arrays
  if (fromTasks.length === 0) {
    STATE.tasks.delete(fromDate);
  }
  
  // Add to target date
  if (!STATE.tasks.has(toDate)) {
    STATE.tasks.set(toDate, []);
  }
  STATE.tasks.get(toDate).push(task);
  
  console.log(`📅 Moved task "${task.text}" from ${fromDate} to ${toDate}`);
  
  // Update UI
  loadTasksIntoModal(STATE.currentTaskDate);
  updateCalendarTaskIndicators();
  saveTasks();
  
  // Show encouraging popup
  showEncouragingPopup(toDate, `Moved "${task.text}" successfully!`);
}

/**
 * Initialize calendar system
 */
function initializeCalendar() {
  // Load saved data
  loadCompletedDays();
  loadTasks();
  
  // Render current month
  const today = new Date();
  renderCalendar(today.getMonth(), today.getFullYear());
  
  console.log('✅ Calendar system initialized');
}

/* ===== SCREENSAVER FUNCTIONALITY ===== */

/**
 * Track user activity and manage screensaver
 */
function setupScreensaver() {
  const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds
  
  // Update activity timestamp
  function updateActivity() {
    STATE.lastActivityTime = Date.now();
    
    // Exit screensaver if active
    if (STATE.screensaverActive) {
      exitScreensaver();
    }
  }
  
  // Check for inactivity
  function checkInactivity() {
    const timeSinceActivity = Date.now() - STATE.lastActivityTime;
    
    if (timeSinceActivity >= INACTIVITY_TIMEOUT && !STATE.screensaverActive) {
      enterScreensaver();
    }
  }
  
  // Add activity event listeners
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  activityEvents.forEach(event => {
    document.addEventListener(event, updateActivity, true);
  });
  
  // Start activity checking interval
  STATE.activityCheckInterval = setInterval(checkInactivity, 5000); // Check every 5 seconds
  
  console.log('✅ Screensaver setup complete - 2 minute timeout');
}

/**
 * Enter screensaver mode
 */
function enterScreensaver() {
  if (STATE.screensaverActive) return;
  
  console.log('🌙 Entering screensaver mode');
  
  STATE.screensaverActive = true;
  document.body.classList.add('screensaver-active');

  // Optional: slightly boost seasonal particle generation while idle to make background come alive
  try {
    const currentParticle = document.body.getAttribute('data-mouse-trail') || '';
    // spawn a small burst for visual interest
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        if (currentParticle.includes('leaves')) createLeafParticle(currentParticle);
        else if (currentParticle === 'snowflakes') createSnowParticle();
      }, Math.random() * 2000);
    }
  } catch (e) {
    // ignore if particle functions are unavailable
  }
}

/**
 * Exit screensaver mode
 */
function exitScreensaver() {
  if (!STATE.screensaverActive) return;
  
  console.log('☀️ Exiting screensaver mode');
  
  STATE.screensaverActive = false;
  document.body.classList.remove('screensaver-active');
  document.body.style.filter = ''; // Remove any dimming
  
  // Pop nav icons so they feel alive when returning from screensaver
  try {
    const icons = document.querySelectorAll('.nav-icon-img');
    icons.forEach(img => {
      img.classList.add('pop');
      setTimeout(() => img.classList.remove('pop'), 420);
    });
  } catch (e) {}
}

/**
 * Cleanup screensaver on page unload
 */
function cleanupScreensaver() {
  if (STATE.activityCheckInterval) {
    clearInterval(STATE.activityCheckInterval);
    STATE.activityCheckInterval = null;
  }
}

/**
 * Load configuration from studyflow_config.json
 */
async function loadConfig() {
  try {
    const response = await fetch('data/studyflow_config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
    STATE.config = await response.json();
    console.log('✅ Config loaded successfully:', STATE.config);
    return STATE.config;
  } catch (error) {
    console.error('❌ Failed to load config:', error);
    // Fallback config with essential paths
    STATE.config = {
      ui_elements: {
        frame: { svg_path: 'assets/images/frame.svg' },
        buttons: {
          start: 'assets/images/start-button.svg',
          reset: 'assets/images/reset-button.svg',
          pause: 'assets/images/pause-button.svg'
        }
      },
      paths: {
        images: { backgrounds: 'assets/images' },
        audio: 'assets/audio'
      },
      timer: {
        sounds: {
          click: 'assets/audio/click.mp3',
          work_done: 'assets/audio/splash.mp3',
          break_done: 'assets/audio/splash.mp3',
          drawing: 'assets/audio/drawing.mp3',
          rainfall: 'assets/audio/rainfall.mp3'
        }
      }
    };
    return STATE.config;
  }
}

/**
 * Helper function to get audio path from config
 */
function getAudioPath(soundName) {
  return STATE.config?.timer?.sounds?.[soundName] || `assets/audio/${soundName}.mp3`;
}

/* ===== BACKGROUND NAVIGATION ===== */
function initBackgroundNavigation() {
  const prevBtn = document.querySelector('.bg-nav.prev');
  const nextBtn = document.querySelector('.bg-nav.next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      // Manual background change - cycle backwards through season backgrounds
      cycleBgManually('prev');
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      // Manual background change - cycle forwards through season backgrounds
      cycleBgManually('next');
    });
  }
}

function cycleBgManually(direction) {
  // Simple implementation: just trigger a background update
  // In a more advanced version, you could cycle through specific background arrays
  updateBackground(STATE.currentSeason, STATE.isNight, STATE.isRaining);
  console.log(`🖼️ Manual background cycle: ${direction}`);
}

/* ===== ANIMATED SCENE CONTROLS ===== */
// Season switcher: 'leaves' or 'snow'
function setSeason(season) {
  const studyFrame = document.getElementById('studyframe');
  if (studyFrame) {
    studyFrame.setAttribute('data-season', season);
  }
}

// Auto-set season by month (simple default)
function initSeasonalScene() {
  const month = new Date().getMonth();
  const winterMonths = [11, 0, 1, 2]; // Dec, Jan, Feb, Mar
  setSeason(winterMonths.includes(month) ? 'snow' : 'leaves');
}

// Pause/resume tied to your timer controls
function setSceneRunning(isRunning) {
  const studyFrame = document.getElementById('studyframe');
  if (studyFrame) {
    studyFrame.classList.toggle('paused', !isRunning);
  }
}

/* ===== Init on Page Load ===== */
window.onload = async () => {
  // Load configuration first
  await loadConfig();
  
  MapsTo();
  // Force-clear any lingering rain state at startup to avoid accidental lockouts
  try {
    STATE.isRainActive = false;
    STATE.rainLockout = false;
    const el = document.getElementById('rain-lockout');
    if (el) el.setAttribute('hidden', 'true');
  } catch (e) {
    console.warn('Startup guard: could not clear rain lockout element', e);
  }

  /**
   * Fetch and inline the decorative frame SVG into #timer-frame so we can
   * recolor internal elements and add simple animations (cat tail/head).
   */
  function injectFrameSVG() {
    const frameContainer = document.getElementById('timer-frame');
    if (!frameContainer) return;

    const framePath = STATE.config?.ui_elements?.frame?.svg_path || 'assets/images/frame.svg';
    fetch(framePath).then(resp => {
      if (!resp.ok) throw new Error(`Could not fetch frame.svg from ${framePath}`);
      return resp.text();
    }).then(svgText => {
      // Insert the SVG markup into the container
      const wrapper = document.createElement('div');
      wrapper.className = 'timer-frame-svg-wrapper';
      wrapper.innerHTML = svgText;

      // Ensure the SVG has a predictable wrapper class
      const svgEl = wrapper.querySelector('svg');
      if (svgEl) svgEl.classList.add('timer-frame-svg');

      // Insert before the countdown so the SVG frames the content
      frameContainer.insertBefore(wrapper, frameContainer.firstChild);

      // Apply initial theme tints
      applyFrameTheme(STATE.currentSeason, STATE.isNight, STATE.isRaining);

      // Try to add simple animations if cat parts exist
      tryAddCatAnimations(svgEl);

      // Make a subtle ambient particle emitter inside the frame on idle
      if (STATE.screensaverActive) {
        spawnFrameParticles(STATE.currentSeason);
      }
    }).catch(err => {
      console.warn('Could not inline frame.svg:', err);
    });
  }

  function applyFrameTheme(season, isNight, isRain) {
    const svg = document.querySelector('.timer-frame-svg');
    if (!svg) return;

    // Map a few example tints for the plant and accents
    const palette = {
      summer: { plant: '#7ccf6b', accent: '#ffd9b3' },
      autumn: { plant: '#c46a2b', accent: '#ffd9b3' },
      winter: { plant: '#ffffff', accent: '#dbe9ff' }
    };

    const colors = palette[season] || palette.summer;

    // Find plant elements (heuristic: id/class contains 'plant' or 'leaf')
    const plantEls = svg.querySelectorAll('[id*="plant"], [class*="plant"], [id*="leaf"], [class*="leaf"]');
    plantEls.forEach(el => {
      try { el.style.fill = colors.plant; } catch (e) {}
    });

    // Accent elements
    const accentEls = svg.querySelectorAll('[id*="accent"], [class*="accent"], [id*="frame"], [class*="frame"]');
    accentEls.forEach(el => {
      try { el.style.fill = colors.accent; } catch (e) {}
    });
  }

  function tryAddCatAnimations(svgEl) {
    if (!svgEl) return;

    // Heuristic selectors for tail and head
    const tail = svgEl.querySelector('[id*="tail"], [class*="tail"]');
    const head = svgEl.querySelector('[id*="head"], [class*="head"]');

    if (tail) {
      tail.classList.add('cat-tail');
    }
    if (head) {
      head.classList.add('cat-head');
    }
  }

  function spawnFrameParticles(season) {
    const frame = document.querySelector('.timer-frame-svg-wrapper');
    const container = document.getElementById('particles-layer');
    if (!frame || !container) return;

    // Create a few small seasonal particles constrained visually to the frame area
    for (let i = 0; i < 18; i++) {
      setTimeout(() => {
        if (season === 'winter') createSnowParticle();
        else createLeafParticle(season === 'autumn' ? 'leaves-burnt_orange_brown' : 'leaves-green');
      }, Math.random() * 1200);
    }
  }

// Function to load and integrate the actual frame.svg content
function loadFrameSVG() {
  const timerSvg = document.getElementById('timer-svg');
  if (!timerSvg) return;
  
  // Attempt to fetch the actual frame.svg file
  fetch('assets/images/frame.svg')
    .then(response => {
      if (!response.ok) {
        console.log('Frame SVG not found, using placeholder design');
        return null;
      }
      return response;
    })
    .then(response => {
      if (!response.ok) {
        console.log('Frame SVG not found, using placeholder design');
        return null;
      }
      return response.text();
    })
    .then(svgText => {
      if (svgText) {
        // Parse the SVG content and apply seasonal theming
        const parser = new DOMParser();
        const themedSvgText = applySVGTheming(svgText);
        const svgDoc = parser.parseFromString(themedSvgText, 'image/svg+xml');
        const frameSvg = svgDoc.documentElement;
        
        // Get the viewBox from the original SVG
        const viewBox = frameSvg.getAttribute('viewBox') || '0 0 400 300';
        timerSvg.setAttribute('viewBox', viewBox);
        
        // Clear placeholder content and replace with frame SVG content
        timerSvg.innerHTML = '';
        
        // Copy frame SVG content (excluding any existing foreignObject elements)
        Array.from(frameSvg.children).forEach(child => {
          if (child.tagName.toLowerCase() !== 'foreignobject') {
            timerSvg.appendChild(child.cloneNode(true));
          }
        });
        
        console.log('✅ Frame SVG loaded and integrated successfully');
      }
    })
    .catch(err => {
      console.log('Using placeholder frame design:', err.message);
      // Enhance placeholder design
      enhancePlaceholderFrame();
    });
  
  // Add debugging info
  console.log('🖼️ Frame SVG loading initiated for:', timerSvg);
  
  // If no SVG found, make sure placeholder is enhanced
  if (!timerSvg) {
    console.log('❌ No timer-svg element found');
    return;
  }
  
  // Enhance the placeholder immediately while we try to load the real frame
  enhancePlaceholderFrame();
}

// Function to enhance the placeholder frame design if no SVG is found
function enhancePlaceholderFrame() {
  const timerSvg = document.getElementById('timer-svg');
  if (!timerSvg) return;
  
  // Add more decorative elements to the placeholder
  const decorativeElements = `
    <!-- Enhanced placeholder frame -->
    <defs>
      <linearGradient id="frameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:var(--ui-tint-primary, #dff6ff);stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:var(--ui-tint-primary, #dff6ff);stop-opacity:0.4" />
      </linearGradient>
    </defs>
    <rect x="15" y="15" width="370" height="270" 
          fill="none" 
          stroke="url(#frameGradient)" 
          stroke-width="4" 
          rx="20" 
          opacity="0.9"/>
    <rect x="25" y="25" width="350" height="250" 
          fill="none" 
          stroke="var(--ui-tint-primary, #dff6ff)" 
          stroke-width="1" 
          rx="15" 
          opacity="0.5"/>
    <!-- Corner decorations -->
    <circle cx="45" cy="45" r="5" fill="var(--ui-tint-primary, #dff6ff)" opacity="0.7"/>
    <circle cx="355" cy="45" r="5" fill="var(--ui-tint-primary, #dff6ff)" opacity="0.7"/>
    <circle cx="45" cy="255" r="5" fill="var(--ui-tint-primary, #dff6ff)" opacity="0.7"/>
    <circle cx="355" cy="255" r="5" fill="var(--ui-tint-primary, #dff6ff)" opacity="0.7"/>
  `;
  
  // Insert enhanced decorations before the foreignObject
  const foreignObject = timerSvg.querySelector('foreignObject');
  if (foreignObject) {
    foreignObject.insertAdjacentHTML('beforebegin', decorativeElements);
  }
}

  setupNavigation();
  setupNavHiding();
  loadSettings();
  setupSettingsForm();
  setupRainToggle();
  startPerpetualClock();
  setupTimerButtons();
  loadFrameSVG(); // Load the actual frame.svg content
  loadSVGButtons(); // Load custom SVG buttons
  setupModeToggling(); // Setup click handlers for mode switching
  setupScreensaver();
  setupRainClickEffects();
  initializeCalendar();

  // SVG frame is now loaded directly into the inline SVG structure
  
  // Apply initial theme (ensure rain is never automatically activated)
  let initialSeason = STATE.userSettings?.season || "summer";
  // If someone had 'rain' as season, reset to summer since we now use manual toggle
  if (initialSeason === 'rain') {
    initialSeason = 'summer';
    STATE.userSettings.season = 'summer';
    saveSettings();
  }
  applyTheme(initialSeason, false, false);
  
  // Initialize timer display
  resetTimer();

  // Initialize background navigation arrows
  initBackgroundNavigation();
  
  // Initialize seasonal scene
  initSeasonalScene();

  // Debug: report rain-related initialization states
  try {
    const lockoutEl = document.getElementById('rain-lockout');
    console.log('🧭 Init debug - STATE.isRainActive:', STATE.isRainActive, 'STATE.rainLockout:', STATE.rainLockout, 'rain-lockout element present:', !!lockoutEl, 'hidden attribute:', lockoutEl ? lockoutEl.hasAttribute('hidden') : 'n/a');
  } catch (err) {
    console.warn('Init debug: could not access rain-lockout element', err);
  }

  console.log('🎯 StudyFlow initialization complete');
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupScreensaver();
});

/* ===== PAGE BOOTSTRAP ===== */
document.addEventListener('DOMContentLoaded', () => {
  // Map elements and set up cross-page features (safe to call everywhere)
  MapsTo();                  // map nav items to pages
  setupNavigation();         // nav click behavior
  loadSettings();            // load settings into STATE and hydrate any forms
  startPerpetualClock();     // top bar clock

  // Page-specific init
  const page = document.body.dataset.page;

  if (page === 'settings') {
    setupSettingsForm();     // wire up the form submit handler
    setupRainToggle();       // start/stop rain UI
  }

  if (page === 'calendar') {
    wireCalendarHeader();    // prev/next + title
    // initial render using STATE, falls back to today
    renderCalendar(STATE.currentMonth, STATE.currentYear);
  }
});
