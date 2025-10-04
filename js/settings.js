// settings.js — handles user preferences, themes, and form interactions
console.log("[settings.js] Module loaded ✅");

const SETTINGS_VERSION = 1;
const MAX_SETTINGS_SIZE = 10000; // 10KB limit for localStorage

export function loadSettings() {
  console.log("⚙️ Settings loaded with security validation");
  
  // Secure defaults with validation
  const defaults = {
    version: SETTINGS_VERSION,
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

  try {
    const saved = localStorage.getItem('studyflow_settings');
    if (!saved) return defaults;
    
    // Size check for security
    if (saved.length > MAX_SETTINGS_SIZE) {
      console.warn("[settings] Settings too large, using defaults");
      return defaults;
    }
    
    const parsed = JSON.parse(saved);
    
    // Version check for migration safety
    if (parsed.version !== SETTINGS_VERSION) {
      console.warn(`[settings] Version mismatch (got ${parsed.version}, expected ${SETTINGS_VERSION}), using defaults`);
      return defaults;
    }
    
    // Schema validation: only allow known keys
    const validKeys = new Set(Object.keys(defaults));
    const filtered = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (validKeys.has(key)) {
        filtered[key] = value;
      }
    });
    
    return { ...defaults, ...filtered };
  } catch (error) {
    console.warn("[settings] Error loading settings:", error);
    localStorage.removeItem('studyflow_settings'); // Clear corrupted data
    return defaults;
  }
}

export function saveSettings(settings) {
  console.log("💾 Settings saved with security validation");
  
  try {
    // Ensure version is set
    const versioned = { ...settings, version: SETTINGS_VERSION };
    
    // Serialize and check size
    const serialized = JSON.stringify(versioned);
    if (serialized.length > MAX_SETTINGS_SIZE) {
      console.error("[settings] Settings payload too large, not saving");
      return false;
    }
    
    localStorage.setItem('studyflow_settings', serialized);
    return true;
  } catch (error) {
    console.error("[settings] Error saving settings:", error);
    return false;
  }
}

// Security: Whitelist allowed values
const ALLOWED_SEASONS = new Set(['summer', 'autumn', 'winter', 'rain']);
const ALLOWED_TIMEZONES = new Set(['Africa/Johannesburg']); // Expand as needed

// Utility: Clamp numeric values to safe ranges
function clampValue(value, min = 0, max = 100, fallback = 100) {
  const num = Number(value);
  if (isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

export function applyThemeSettings(settings) {
  console.log("[settings] Applying theme settings with security validation");
  
  // Create sanitized copy of settings
  const sanitized = { ...settings };
  
  // Validate and sanitize season
  if (!ALLOWED_SEASONS.has(sanitized.season)) {
    console.warn(`[settings] Invalid season "${sanitized.season}", defaulting to summer`);
    sanitized.season = 'summer';
  }
  
  // Validate and clamp numeric values
  sanitized.background_brightness = clampValue(sanitized.background_brightness, 0, 100, 100);
  sanitized.frame_opacity = clampValue(sanitized.frame_opacity, 0, 100, 100);
  sanitized.pomodoro_sessions = clampValue(sanitized.pomodoro_sessions, 1, 10, 4);
  sanitized.work_minutes = clampValue(sanitized.work_minutes, 1, 120, 25);
  sanitized.short_break_minutes = clampValue(sanitized.short_break_minutes, 1, 60, 5);
  sanitized.long_break_minutes = clampValue(sanitized.long_break_minutes, 1, 120, 20);
  sanitized.slideshow_interval_seconds = clampValue(sanitized.slideshow_interval_seconds, 5, 300, 30);
  
  // Apply background brightness (safely clamped)
  const bgRoot = document.getElementById('bg-root');
  if (bgRoot) {
    bgRoot.style.opacity = sanitized.background_brightness / 100;
  }
  
  // Apply frame opacity (safely clamped)
  const frame = document.querySelector('.frame-ornate');
  if (frame) {
    frame.style.opacity = sanitized.frame_opacity / 100;
  }
  
  // Apply season (whitelisted)
  document.body.setAttribute('data-theme', sanitized.season);
  
  return sanitized; // Return sanitized settings for further use
}
