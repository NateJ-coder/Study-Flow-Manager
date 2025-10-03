/*********************************************************
 * Firebase SDK (Initialization Only)
 *********************************************************/
import { initializeApp } from "firebase/app";
// Import placeholder for database/auth until they are used
const firebaseConfig = {
  apiKey: "AIzaSyDiY_fxXuLNSTgpPIiHTkmvSAlT-Owqkgc",
  authDomain: "studyflowapp-2dfd0.firebaseapp.com",
  projectId: "studyflowapp-2dfd0",
  storageBucket: "studyflowapp-2dfd0.firebasestorage.app",
  messagingSenderId: "292997866503",
  appId: "1:292997866503:web:a999c0ef9d3f06b61136a2",
  measurementId: "G-CEJ384DE17"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Placeholders until Firestore/Auth are actually used
let db = null;
let auth = null;

// Export placeholders for future imports (other modules can import these)
export { db, auth };

/*********************************************************
 * Persistent User Settings (Defaults)
 *********************************************************/
const userSettings = {
  theme: {
    season: 'summer', // summer | autumn | winter
    timeOfDay: 'auto', // day | night | auto
    rainMode: 'auto', // auto | off | on
  },
  timer: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    roundsPerCycle: 4,
    autoStart: false,
  },
  general: {
    timeZone: 'Africa/Johannesburg',
    preloadAssets: true,
  },
  dev: {
    overrideRainLockout: false
  }
};

/*********************************************************
 * Global Reactive State
 *********************************************************/
const appState = {
  // routing
  currentView: 'timerView',

  // timer runtime state (transient)
  timer: {
    status: 'idle',             // 'idle' | 'running' | 'paused' | 'finished'
    sessionType: 'work',        // 'work' | 'short' | 'long'
    sessionCounter: 0,          // increments on each completed work session
    totalSeconds: userSettings.timer.workDuration * 60,
    remainingSeconds: userSettings.timer.workDuration * 60,
    intervalId: null
  },

  // settings buffer (for forms before Save is pressed)
  tempSettings: JSON.parse(JSON.stringify(userSettings)),

  // UI caches
  ui: {
    views: {},          // { timerView, calendarView, settingsView }
    sideNavButtons: {}  // { goTimer, goCalendar, goSettings }
  }
};

// Expose globally for debugging and other inline modules if needed
window.userSettings = userSettings;
window.appState = appState;

/*********************************************************
 * Utilities
 *********************************************************/
const qs  = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const NAV_HIGHLIGHT_CLASSES = [
  'ring-2','ring-white/60','ring-offset-2','ring-offset-gray-900'
];

/*********************************************************
 * View Switching
 *********************************************************/
function showView(viewId) {
  // Hide all .view sections
  const views = qsa('.view');
  views.forEach(v => v.classList.add('hidden'));

  // Show requested view (if present)
  const target = qs(`#${viewId}`);
  if (target) target.classList.remove('hidden');

  // Update state
  appState.currentView = viewId;

  // SideNav highlighting
  const map = {
    timerView: 'goTimer',
    calendarView: 'goCalendar',
    settingsView: 'goSettings'
  };

  // Remove highlight from all buttons
  Object.values(map).forEach(btnId => {
    const btn = qs(`#${btnId}`);
    if (!btn) return;
    btn.classList.remove(...NAV_HIGHLIGHT_CLASSES);
  });

  // Add highlight to active button
  const activeBtnId = map[viewId];
  const activeBtn = qs(`#${activeBtnId}`);
  if (activeBtn) {
    activeBtn.classList.add(...NAV_HIGHLIGHT_CLASSES);
  }

  // If lucide is present, re-hydrate icons in the newly shown view
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Export the function in case other modules need it
export { showView };

/*********************************************************
 * PASTE ALL NEW THEME/BACKGROUND/RAIN CODE HERE
 *********************************************************/

/**
 * Theme, Background Cross-Fade, and Rain Logic (StudyFlow)
 * Requires:
 * - Global: window.userSettings, window.appState
 * - DOM: #bgA, #bgB (.bg-layer), #rainBlocker, #sfx-rain
 * - Assets in: assets/images/, assets/audio/
 */

/**
 * Map of available images per theme variant.
 * File name patterns (must exist under assets/images/):
 * - rain:               rain-bg-{n}.png
 * - {season}-{tod}:     e.g., summer-day-{n}.png, winter-night-{n}.png
 */
const THEME_ASSETS = {
  rain: 9,
  summer_day: 8,
  summer_night: 6,
  autumn_day: 6,
  autumn_night: 6,
  winter_day: 6,
  winter_night: 6
};

/**
 * Preload a list of images/audio for smooth transitions.
 * @param {string[]} urls
 * @returns {Promise<void>}
 */
async function preloadAssets(urls = []) {
  const tasks = urls.map((url) => {
    return new Promise((resolve) => {
      // crude type inference by extension
      const isAudio = /\.mp3$|\.ogg$|\.wav$/i.test(url);
      if (isAudio) {
        const a = new Audio();
        a.src = url;
        a.preload = 'auto';
        // Resolve on canplaythrough or error to avoid hanging
        const done = () => {
          a.oncanplaythrough = a.onerror = null;
          resolve();
        };
        a.oncanplaythrough = done;
        a.onerror = done;
      } else {
        const img = new Image();
        img.loading = 'eager';
        img.decoding = 'async';
        img.onload = img.onerror = () => resolve();
        img.src = url;
      }
    });
  });
  await Promise.all(tasks);
}

/**
 * Return a random background path for a given type.
 * @param {'rain' | 'summer_day' | 'summer_night' | 'autumn_day' | 'autumn_night' | 'winter_day' | 'winter_night'} type
 * @returns {string}
 */
function getRandomBg(type) {
  const count = THEME_ASSETS[type];
  if (!count) {
    console.warn(`[Theme] Unknown bg type "${type}", falling back to summer_day`);
    return getRandomBg('summer_day');
  }
  const n = 1 + Math.floor(Math.random() * count);

  if (type === 'rain') {
    return `assets/images/rain-bg-${n}.png`;
  }

  const [season, tod] = type.split('_'); // 'summer', 'day'
  return `assets/images/${season}-${tod}-${n}.png`;
}

/**
 * Determine time of day ('day' | 'night') for a given IANA time zone.
 * Day is 06:00–17:59 inclusive; Night otherwise.
 * @param {string} timeZone
 * @returns {'day' | 'night'}
 */
function determineTimeOfDay(timeZone = 'UTC') {
  try {
    // Use Intl API to get hour in specified TZ
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone
    });
    const parts = fmt.formatToParts(new Date());
    const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '12');
    return (hour >= 6 && hour < 18) ? 'day' : 'night';
  } catch {
    const h = new Date().getHours();
    return (h >= 6 && h < 18) ? 'day' : 'night';
  }
}

/**
 * Compute the active theme type considering priority:
 * Rain (highest) > Time of Day > Season (lowest).
 * Uses userSettings.theme.{season,timeOfDay,rainMode} and appState.isRaining.
 * @returns {'rain' | 'summer_day' | 'summer_night' | 'autumn_day' | 'autumn_night' | 'winter_day' | 'winter_night'}
 */
function computeThemeType() {
  const { theme } = window.userSettings;
  const { isRaining, timeOfDay: stateTOD } = window.appState;

  if (isRaining) return 'rain';

  const tod =
    theme.timeOfDay === 'auto'
      ? (stateTOD || determineTimeOfDay(window.userSettings.general?.timeZone || 'UTC'))
      : theme.timeOfDay; // 'day' | 'night'

  const season = theme.season; // 'summer' | 'autumn' | 'winter'
  const key = `${season}_${tod}`;
  return (key in THEME_ASSETS) ? key : 'summer_day';
}

/**
 * Cross-fade backgrounds between #bgA and #bgB.
 * - Find inactive layer (lower opacity)
 * - Apply new background image
 * - Fade it in while fading the other out
 */
async function updateBackground() {
  const bgA = document.getElementById('bgA');
  const bgB = document.getElementById('bgB');
  if (!bgA || !bgB) return;

  // Ensure transitions exist (fallback if CSS not present)
  [bgA, bgB].forEach(el => {
    if (!el.style.transition) {
      el.style.transition = 'opacity 1200ms ease';
    }
    if (!el.style.backgroundSize) {
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
    }
  });

  const type = computeThemeType();
  const nextUrl = getRandomBg(type);

  // Preload next background (and optional overlay/audio if needed)
  if (window.userSettings.general?.preloadAssets) {
    const preloadList = [nextUrl];
    if (type === 'rain') {
      preloadList.push('assets/images/rain-drops-overlay.png', 'assets/audio/rainfall.mp3');
    }
    await preloadAssets(preloadList);
  }

  // Decide active/inactive by computed opacity (default bgA active on first run)
  const oa = parseFloat(getComputedStyle(bgA).opacity || '1');
  const ob = parseFloat(getComputedStyle(bgB).opacity || '0');

  const active = oa >= ob ? bgA : bgB;
  const inactive = oa >= ob ? bgB : bgA;

  // Apply new image to inactive, then cross-fade
  inactive.style.backgroundImage = `url("${nextUrl}")`;
  requestAnimationFrame(() => {
    inactive.style.opacity = '1';
    active.style.opacity = '0';
  });
}

/**
 * Apply body classes, lockouts, audio, and refresh background.
 */
async function applyTheme() {
  const body = document.body;
  const { theme, dev } = window.userSettings;

  // Ensure appState.timeOfDay is set if auto
  const tod =
    theme.timeOfDay === 'auto'
      ? determineTimeOfDay(window.userSettings.general?.timeZone || 'UTC')
      : theme.timeOfDay;

  window.appState.timeOfDay = tod;

  // Body classes
  body.classList.toggle('night', window.appState.isRaining ? false : (tod === 'night'));
  body.classList.toggle('rain', !!window.appState.isRaining);

  // Settings lockout when raining (unless overridden)
  const rainBlocker = document.getElementById('rainBlocker');
  if (rainBlocker) {
    const lock = window.appState.isRaining && !dev?.overrideRainLockout;
    rainBlocker.classList.toggle('hidden', !lock);
  }

  // Control rain SFX
  const rainAudio = document.getElementById('sfx-rain');
  if (rainAudio) {
    try {
      if (window.appState.isRaining) {
        rainAudio.volume = 0.6;
        if (rainAudio.paused) {
          // Some browsers require a user gesture; ignore rejection silently
          rainAudio.play().catch(() => {});
        }
      } else {
        if (!rainAudio.paused) rainAudio.pause();
      }
    } catch { /* noop */ }
  }

  // Update background based on current state
  await updateBackground();
}

/*********************************************************
 * Calendar, Settings Persistence, and Save Logic (StudyFlow)
 * Requires:
 * - Global: window.appState, window.userSettings, applyTheme, resetTimer
 * - Utilities: qs, qsa
 * - DOM: #settings form fields, #btnSettingsSave, #btnSettingsReset,
 * #prevMonth, #nextMonth, #calTitle, #calGrid
 * Persistence:
 * - localStorage keys:
 * - 'studyflow_settings'  (settings JSON)
 * - 'studyflow_completed' (completed days map JSON)
 *********************************************************/

/* ---------------- Local Storage Keys ---------------- */
const LS_KEYS = {
  SETTINGS: 'studyflow_settings',
  COMPLETED: 'studyflow_completed'
};

/* ---------------- Helpers ---------------- */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj ?? {}));
}
function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  if (override && typeof override === 'object') {
    for (const k of Object.keys(override)) {
      const v = override[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = deepMerge(base?.[k] ?? {}, v);
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

/* ---------------- Settings Persistence ---------------- */
function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge over current defaults in userSettings
      const merged = deepMerge(window.userSettings, parsed);
      Object.assign(window.userSettings, merged);
    }
  } catch (e) {
    console.warn('[Settings] Failed to parse saved settings, using defaults.', e);
  }
  // Sync tempSettings with current userSettings
  window.appState.tempSettings = deepClone(window.userSettings);

  // Completed days
  try {
    const savedCompleted = localStorage.getItem(LS_KEYS.COMPLETED);
    window.appState.completedDays = savedCompleted ? JSON.parse(savedCompleted) : {};
  } catch {
    window.appState.completedDays = {};
  }
}

function saveSettings() {
  try {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(window.userSettings));
  } catch (e) {
    console.warn('[Settings] Failed to save settings:', e);
  }
}

/* ---------------- Settings ↔ Form Sync ---------------- */
function loadSettingsForm() {
  const s = window.userSettings;

  // Durations
  const setWork   = qs('#setWork');
  const setShort  = qs('#setShort');
  const setLong   = qs('#setLong');
  const setRounds = qs('#setRounds');
  const setAutostart = qs('#setAutostart');

  if (setWork)   setWork.value  = s.timer.workDuration;
  if (setShort)  setShort.value = s.timer.shortBreakDuration;
  if (setLong)   setLong.value  = s.timer.longBreakDuration;
  if (setRounds) setRounds.value = s.timer.roundsPerCycle;
  if (setAutostart) setAutostart.checked = !!s.timer.autoStart;

  // Theme / Weather
  const setSeason   = qs('#setSeason');
  const setTOD      = qs('#setTOD');
  const setRainMode = qs('#setRainMode');
  const setTZ       = qs('#setTZ');
  const setRainTest = qs('#setRainTest');

  if (setSeason)   setSeason.value   = s.theme.season;
  if (setTOD)      setTOD.value      = s.theme.timeOfDay;
  if (setRainMode) setRainMode.value = s.theme.rainMode;
  if (setTZ)       setTZ.value       = s.general.timeZone;
  if (setRainTest) setRainTest.checked = !!s.dev.overrideRainLockout;

  // Assets/Behavior
  const setPreload = qs('#setPreload');
  if (setPreload) setPreload.checked = !!s.general.preloadAssets;
}

/**
 * Read all form inputs into appState.tempSettings (live buffer).
 * Attach this as the #settings change/input handler.
 */
function saveSettingsToTemp() {
  const t = deepClone(window.appState.tempSettings);

  // Pull fresh values from the form
  const setWork   = qs('#setWork');
  const setShort  = qs('#setShort');
  const setLong   = qs('#setLong');
  const setRounds = qs('#setRounds');
  const setAutostart = qs('#setAutostart');

  const setSeason   = qs('#setSeason');
  const setTOD      = qs('#setTOD');
  const setRainMode = qs('#setRainMode');
  const setTZ       = qs('#setTZ');
  const setRainTest = qs('#setRainTest');
  const setPreload  = qs('#setPreload');

  // Ensure structure
  t.timer  ||= {};
  t.theme  ||= {};
  t.general ||= {};
  t.dev    ||= {};

  // Numbers
  if (setWork)   t.timer.workDuration       = clampInt(setWork.value, 1, 180, 25);
  if (setShort)  t.timer.shortBreakDuration = clampInt(setShort.value, 1, 60, 5);
  if (setLong)   t.timer.longBreakDuration  = clampInt(setLong.value, 1, 90, 15);
  if (setRounds) t.timer.roundsPerCycle     = clampInt(setRounds.value, 1, 12, 4);

  // Booleans
  if (setAutostart) t.timer.autoStart = !!setAutostart.checked;
  if (setPreload)   t.general.preloadAssets = !!setPreload.checked;
  if (setRainTest)  t.dev.overrideRainLockout = !!setRainTest.checked;

  // Enums / strings
  if (setSeason)   t.theme.season    = setSeason.value;
  if (setTOD)      t.theme.timeOfDay = setTOD.value;
  if (setRainMode) t.theme.rainMode  = setRainMode.value;
  if (setTZ)       t.general.timeZone = setTZ.value;

  window.appState.tempSettings = t;
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  return fallback;
}

/* ---------------- Save Button Workflow ---------------- */
async function handleSettingsSave() {
  const btn = qs('#btnSettingsSave');
  if (!btn) return;

  btn.disabled = true;
  btn.classList.add('btn-saving');

  // Simulate network delay buffer
  setTimeout(() => {
    // Apply buffered temp settings to live settings
    const next = deepClone(window.appState.tempSettings);
    // Overwrite userSettings in-place (preserves reference)
    for (const k of Object.keys(window.userSettings)) delete window.userSettings[k];
    Object.assign(window.userSettings, next);

    // Persist locally
    saveSettings();

    // Apply visuals & timer (new durations / rain mode / tz may change UI)
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof resetTimer === 'function') resetTimer();

    btn.classList.remove('btn-saving');
    btn.disabled = false;
  }, 700);
}

/* ---------------- Completed Days Tracking ---------------- */
function markDayAsCompleted(dateString, count = 1) {
  // dateString format: YYYY-MM-DD
  const map = window.appState.completedDays || (window.appState.completedDays = {});
  map[dateString] = (map[dateString] || 0) + count;
  try {
    localStorage.setItem(LS_KEYS.COMPLETED, JSON.stringify(map));
  } catch {}
  // Re-render calendar if visible month includes this day
  if (window.appState.currentCalDate) {
    renderCalendar(window.appState.currentCalDate);
  }
}

/* --------- Override transitionToNextSession to log completions --------- */
/* This definition intentionally overrides the previous one to add
   `markDayAsCompleted` when a WORK session completes. */
function transitionToNextSession() {
  const tset = window.userSettings.timer;
  const st = window.appState.timer;

  // If a WORK session just finished, record completion today
  if (st.sessionType === 'work') {
    const tz = window.userSettings.general?.timeZone || 'UTC';
    const iso = toLocalISODate(tz);
    markDayAsCompleted(iso, 1);
  }

  let nextSession = 'work';
  if (st.sessionType === 'work') {
    st.sessionCounter += 1;
    const cycle = Math.max(1, Number(tset.roundsPerCycle || 4));
    nextSession = (st.sessionCounter % cycle === 0) ? 'long' : 'short';
  } else {
    nextSession = 'work';
  }

  st.status = 'idle';
  updateSession(nextSession);

  // play finish sound
  const splash = document.getElementById('sfx-splash');
  if (splash) {
    try { splash.currentTime = 0; splash.play().catch(() => {}); } catch {}
  }

  if (tset.autoStart) startTimer();
  else reflectControls();
}

function toLocalISODate(timeZone) {
  // Make a date string in YYYY-MM-DD according to the specified IANA TZ
  const now = new Date();
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', { // en-CA yields YYYY-MM-DD
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    return fmt.format(now); // already YYYY-MM-DD
  } catch {
    // Fallback to local system date
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/* ---------------- Calendar Rendering ---------------- */
function renderCalendar(date = new Date()) {
  const calTitle = qs('#calTitle');
  const calGrid = qs('#calGrid');
  if (!calGrid || !calTitle) return;

  // Track current month being shown
  window.appState.currentCalDate = new Date(date.getFullYear(), date.getMonth(), 1);

  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  const firstOfMonth = new Date(y, m, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // Title
  const monthName = firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  calTitle.textContent = monthName;

  // Build 6x7 = 42 cells
  calGrid.innerHTML = '';
  const cells = [];

  // Leading blanks
  for (let i = 0; i < startWeekday; i++) {
    const cell = document.createElement('div');
    cell.className = 'aspect-square rounded-xl';
    cells.push(cell);
  }

  // Month days
  const completed = window.appState.completedDays || {};
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'aspect-square glass rounded-xl relative p-1 text-left hover:bg-white/10 transition';
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cell.id = `day-${iso}`;

    // Day label
    const label = document.createElement('div');
    label.className = 'absolute top-1 left-1 text-xs opacity-80';
    label.textContent = d;

    // Completion marker
    const count = completed[iso] || 0;
    const marker = document.createElement('div');
    marker.className = 'absolute inset-0 flex items-center justify-center';
    if (count > 0) {
      marker.innerHTML = `
        <svg class="w-8 h-8 opacity-80" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4 L20 20 M20 4 L4 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      `;
    }

    // Counter badge
    const badge = document.createElement('div');
    badge.className = 'absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10';
    badge.textContent = count > 0 ? `${count}` : '';

    // Optional: future click handler
    cell.addEventListener('click', () => {
      // Placeholder for future modal; for now toggle a highlight
      cell.classList.toggle('ring-2');
      cell.classList.toggle('ring-white/60');
    });

    cell.appendChild(label);
    if (count > 0) cell.appendChild(marker);
    if (count > 0) cell.appendChild(badge);
    cells.push(cell);
  }

  // Trailing blanks
  while (cells.length < 42) {
    const cell = document.createElement('div');
    cell.className = 'aspect-square rounded-xl';
    cells.push(cell);
  }

  // Inject
  for (const c of cells) calGrid.appendChild(c);
}

/* ---------------- Calendar Navigation ---------------- */
function gotoPrevMonth() {
  const base = window.appState.currentCalDate || new Date();
  const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  renderCalendar(prev);
}
function gotoNextMonth() {
  const base = window.appState.currentCalDate || new Date();
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  renderCalendar(next);
}

/* ---------------- DOMContentLoaded Wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Load persisted state
  loadSettings();
  // Sync form from settings
  loadSettingsForm();

  // Wire settings form to live buffer
  const settingsForm = qs('#settings');
  if (settingsForm) {
    // Use both 'change' and 'input' for responsiveness
    settingsForm.addEventListener('change', saveSettingsToTemp);
    settingsForm.addEventListener('input', saveSettingsToTemp);
  }

  // Save button workflow
  const btnSave = qs('#btnSettingsSave');
  if (btnSave) btnSave.addEventListener('click', handleSettingsSave);

  // Reset button: discard temp changes and reload form from userSettings
  const btnReset = qs('#btnSettingsReset');
  if (btnReset) btnReset.addEventListener('click', () => {
    // Reset temp to current saved settings
    window.appState.tempSettings = deepClone(window.userSettings);
    loadSettingsForm();
  });

  // Calendar navigation
  const prevBtn = qs('#prevMonth');
  const nextBtn = qs('#nextMonth');
  if (prevBtn) prevBtn.addEventListener('click', gotoPrevMonth);
  if (nextBtn) nextBtn.addEventListener('click', gotoNextMonth);

  // Initial calendar render for current date
  renderCalendar(new Date());
});


/**
 * Pomodoro Timer Logic & State Management (StudyFlow)
 * Requires:
 * - Global: window.appState, window.userSettings, qs, qsa
 * - DOM: #countdown, #btnStart, #btnPause, #btnReset
 * - Hourglass SVG parts: #sandTop, #sandStream, #sandBottom
 * - SFX: #sfx-splash
 */

/* ---------- Display ---------- */
function updateDisplay() {
  const el = document.getElementById('countdown');
  if (!el) return;
  const secs = Math.max(0, Math.floor(window.appState.timer.remainingSeconds || 0));
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  el.textContent = `${mm}:${ss}`;
}

/* ---------- Durations ---------- */
function getDurationInSeconds(sessionType) {
  const t = window.userSettings?.timer || {};
  switch (sessionType) {
    case 'work':  return (t.workDuration ?? 25) * 60;
    case 'short': return (t.shortBreakDuration ?? 5) * 60;
    case 'long':  return (t.longBreakDuration ?? 15) * 60;
    default:      return (t.workDuration ?? 25) * 60;
  }
}

/* ---------- Session Update ---------- */
function updateSession(newSessionType) {
  const total = getDurationInSeconds(newSessionType);
  const st = window.appState.timer;
  st.sessionType = newSessionType;          // 'work' | 'short' | 'long'
  st.totalSeconds = total;
  st.remainingSeconds = total;
  updateDisplay();
  // Reset hourglass immediately to "full top / empty bottom"
  animateHourglass(0);
}

/* ---------- Reset ---------- */
function resetTimer() {
  const st = window.appState.timer;
  if (st.intervalId) {
    clearInterval(st.intervalId);
    st.intervalId = null;
  }
  st.status = 'idle';
  st.sessionType = 'work';
  st.sessionCounter = 0;
  st.totalSeconds = getDurationInSeconds('work');
  st.remainingSeconds = st.totalSeconds;
  updateDisplay();
  animateHourglass(0);
  reflectControls();
}

/* ---------- State Machine ---------- */

/* ---------- Hourglass Animation ---------- */
function animateHourglass(fractionComplete) {
  const f = Math.min(1, Math.max(0, Number(fractionComplete) || 0));
  const sandTop = document.getElementById('sandTop');
  const sandStream = document.getElementById('sandStream');
  const sandBottom = document.getElementById('sandBottom');

  if (sandTop) {
    sandTop.style.transformOrigin = '50% 100%';
    sandTop.style.transform = `scaleY(${1 - f})`;
    sandTop.style.opacity = (1 - f * 0.15).toFixed(3);
  }

  if (sandBottom) {
    sandBottom.style.transformOrigin = '50% 100%';
    const base = 0.2;
    sandBottom.style.transform = `scaleY(${base + (1 - base) * f})`;
    sandBottom.style.opacity = (0.7 + 0.3 * f).toFixed(3);
  }

  if (sandStream) {
    const running = window.appState.timer.status === 'running';
    const show = running && f > 0 && f < 1;
    sandStream.style.opacity = show ? '1' : '0';
    sandStream.style.transformOrigin = '50% 0%';
    sandStream.style.transform = show ? `scaleY(${0.9 + 0.1 * Math.sin(performance.now()/300)})` : 'scaleY(0.8)';
  }
}

/* ---------- Tick ---------- */
function tick() {
  const st = window.appState.timer;

  st.remainingSeconds -= 1;

  if (st.remainingSeconds <= 0) {
    st.remainingSeconds = 0;
    updateDisplay();
    animateHourglass(1);
    pauseTimer();
    transitionToNextSession();
    return;
  }

  updateDisplay();

  const frac = (st.totalSeconds - st.remainingSeconds) / Math.max(1, st.totalSeconds);
  animateHourglass(frac);
}

/* ---------- Controls ---------- */
function startTimer() {
  const st = window.appState.timer;
  if (st.status === 'running') return;

  if (st.remainingSeconds <= 0) {
    st.remainingSeconds = st.totalSeconds;
  }

  st.status = 'running';
  if (st.intervalId) clearInterval(st.intervalId);
  st.intervalId = setInterval(tick, 1000);
  reflectControls();
}

function pauseTimer() {
  const st = window.appState.timer;
  if (st.intervalId) {
    clearInterval(st.intervalId);
    st.intervalId = null;
  }
  if (st.status === 'running') {
    st.status = 'paused';
  }
  reflectControls();
}

/* Enable/disable buttons based on state */
function reflectControls() {
  const st = window.appState.timer;
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');

  if (btnStart) {
    btnStart.disabled = (st.status === 'running');
    btnStart.classList.toggle('opacity-50', btnStart.disabled);
    btnStart.classList.toggle('pointer-events-none', btnStart.disabled);
  }
  if (btnPause) {
    btnPause.disabled = (st.status !== 'running');
    btnPause.classList.toggle('opacity-50', btnPause.disabled);
    btnPause.classList.toggle('pointer-events-none', btnPause.disabled);
  }
  if (btnReset) {
    btnReset.disabled = false;
    btnReset.classList.remove('opacity-50','pointer-events-none');
  }
}

/* ---------- Wire Up Controls (augment existing DOMContentLoaded) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');

  if (btnStart) btnStart.addEventListener('click', startTimer);
  if (btnPause) btnPause.addEventListener('click', pauseTimer);
  if (btnReset) btnReset.addEventListener('click', () => {
    resetTimer();
  });

  // Initial session & UI
  resetTimer();
});


/**
 * Start the repeating rain scheduler.
 * - If userSettings.theme.rainMode === 'on' => always raining
 * - If 'off' => never raining
 * - If 'auto' => Rains for 45 minutes every 2 hours (rolling window)
 * Logic: Using local clock minutes since epoch, mod 120 < 45 => raining
 */
function startRainScheduler() {
  // Clear any previous scheduler
  if (window.appState._rainIntervalId) {
    clearInterval(window.appState._rainIntervalId);
    window.appState._rainIntervalId = null;
  }

  const evaluate = () => {
    const { theme } = window.userSettings;

    let nextIsRaining = false;
    if (theme.rainMode === 'on') {
      nextIsRaining = true;
    } else if (theme.rainMode === 'off') {
      nextIsRaining = false;
    } else {
      // auto schedule: 45 minutes every 120-minute cycle
      const now = new Date();
      const minutesSinceEpoch = Math.floor(now.getTime() / 60000);
      const cyclePos = minutesSinceEpoch % 120;
      nextIsRaining = cyclePos < 45;
    }

    // flip only on change
    if (nextIsRaining !== window.appState.isRaining) {
      window.appState.isRaining = nextIsRaining;
      applyTheme();
    }
  };

  // Evaluate immediately, then every minute to reduce jitter
  evaluate();
  window.appState._rainIntervalId = setInterval(evaluate, 60 * 1000);
}

/*
 * Initializer Hook
 */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure state flags exist
  if (typeof window.appState.isRaining !== 'boolean') {
    window.appState.isRaining = false;
  }
  // Seed initial TOD
  window.appState.timeOfDay =
    determineTimeOfDay(window.userSettings.general?.timeZone || 'UTC');

  // Start scheduler and apply the initial theme
  startRainScheduler();
  applyTheme();
});
