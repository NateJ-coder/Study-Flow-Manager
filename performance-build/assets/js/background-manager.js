/**// assets/js/background-manager.js

 * StudyFlow Background System/**

 * Implements: theme selection, day/night cycling, sequential image rotation, * SmartBackgroundManager

 * preloading, cross-fade transitions, seasonal particle system, persistence, and * Season-aware, time-of-day aware slideshow + theme particles

 * robust error handling. * - Season selected in UI (summer | autumn | winter)

 */ * - Shuffles within that season

 * - Day ↔ Night auto-switch at 06:00 / 18:00 in the user's chosen timezone

// ---- Configuration ---- * - Uses THEME_DATA (declared in core.js) for image lists

const STORAGE_KEY = 'studyflow-settings'; * - Respects window.timerSettings.slideshowTime (min 20s)

const ASSET_BASE = 'assets/images/'; * - Lightweight canvas particles (snow / leaves)

 */

// Build file lists by rule, matching the spec's counts

const THEME_COUNTS = {(function () {

  summer: { day: 8, night: 8 },  // ---------- tiny helpers ----------

  autumn: { day: 8, night: 8 },  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  winter: { day: 7, night: 7 },  const shuffle = (arr) => {

};    const a = arr.slice();

    for (let i = a.length - 1; i > 0; i--) {

function buildImageList(theme, phase, count) {      const j = (Math.random() * (i + 1)) | 0;

  const files = [];      [a[i], a[j]] = [a[j], a[i]];

  for (let i = 1; i <= count; i++) {    }

    files.push(`${theme}-${phase}-${i}.png`);    return a;

  }  };

  return files;  const nowInTZ = (tz) => new Date(new Date().toLocaleString("en-US", { timeZone: tz }));

}

  class SmartBackgroundManager {

const THEME_DATA = Object.fromEntries(    constructor() {

  Object.entries(THEME_COUNTS).map(([theme, c]) => [      // required DOM

    theme,      this.bgEl = document.getElementById('bg-container');

    {      if (!this.bgEl) {

      day: { images: buildImageList(theme, 'day', c.day) },        console.error('SmartBackgroundManager: #bg-container not found.');

      night: { images: buildImageList(theme, 'night', c.night) },        return;

    },      }

  ])

);      // THEME_DATA is exposed by core.js

      this.themeData = window.THEME_DATA || {};

// ---- State ----      

let settings = loadSettings();      // Load saved settings from localStorage first

let activeTheme = sanitizeTheme(settings.theme || 'autumn');      this._loadSavedSettings();

let rotationTimer = null;      

let currentIndex = 0; // within current phase list      // settings come from timer.html (updated via Settings modal)

let isNight = isNightTime();      this.settings = window.timerSettings || {};

let lastPhaseKey = isNight ? 'night' : 'day';      

let activeLayer = 'a'; // which bg DIV is currently visible      // slideshow state

let retryMap = new Map(); // filename -> retryCount      this.season = this.settings.theme || 'autumn'; // BUG FIX: Add fallback to prevent undefined

      this.timeOfDay = 'day';                     // 'day' | 'night'

// ---- Elements ----      this.indices = [];                          // shuffled index order for current image set

let bgA, bgB, particleCanvas, stateChip;      this.cursor = 0;                            // current position in indices

      this.rotationTimer = null;

// ---- Background System Class ----      this.timeCheckTimer = null;

class StudyFlowBackgroundManager {

  constructor() {      // particles

    this.initialized = false;      this.particles = null;

    this.boundMethods = {};

  }      this._init();

    }

  init() {    

    if (this.initialized) return;    _loadSavedSettings() {

          try {

    // Create background elements        const saved = localStorage.getItem('studyflow-timer-settings');

    this.createBackgroundElements();        if (saved) {

              const savedSettings = JSON.parse(saved);

    // Cache elements          // Merge saved settings into timerSettings

    bgA = document.getElementById('bg-a');          Object.assign(window.timerSettings, savedSettings);

    bgB = document.getElementById('bg-b');          console.log('🔄 Loaded saved theme:', window.timerSettings.theme);

    particleCanvas = document.getElementById('particle-canvas');        }

          } catch (e) {

    // Initialize the system        console.warn('Could not load saved settings:', e);

    this.initializeBackgroundSystem();      }

        }

    this.initialized = true;

    console.log('✅ StudyFlow Background Manager initialized');    // ---------- public API ----------

  }    setSeason(season) {

      console.log(`🔄 setSeason called with: ${season}`);

  createBackgroundElements() {      if (!this.themeData[season]) {

    // Create background root if it doesn't exist        console.warn(`SmartBackgroundManager: unknown season "${season}"`);

    if (!document.getElementById('background-root')) {        return;

      const bgRoot = document.createElement('div');      }

      bgRoot.id = 'background-root';      

      bgRoot.setAttribute('aria-hidden', 'true');      const oldSeason = this.season;

      bgRoot.style.cssText = `      this.season = season;

        position: fixed;      console.log(`🌿 Season changed: ${oldSeason} → ${season}`);

        inset: 0;      

        overflow: hidden;      document.body.classList.remove('summer-theme', 'autumn-theme', 'winter-theme');

        z-index: 1;      document.body.classList.add(`${season}-theme`);

        pointer-events: none;      console.log(`🎨 Applied CSS theme: ${season}-theme`);

        backface-visibility: hidden;      

        transform: translateZ(0);      this._rebuildImageOrder(true);

      `;      this._applySeasonParticles();

          }

      // Create two background layers for cross-fade

      const bgA = document.createElement('div');    setTimezone(tz) {

      bgA.className = 'bg-layer';      this.settings.timezone = tz;

      bgA.id = 'bg-a';      // force a time check immediately

      bgA.style.cssText = `      this._checkTimeAndMaybeFlip(true);

        position: absolute;    }

        inset: 0;

        background-position: center center;    setIntervalSeconds(sec) {

        background-repeat: no-repeat;      const safe = clamp(parseInt(sec || 20, 10), 20, 3600);

        background-size: cover;      this.settings.slideshowTime = safe;

        opacity: 0;      this._restartRotation();

        transition: opacity 900ms ease;    }

        will-change: opacity, background-image;

        filter: saturate(1.05) contrast(1.03);    // ---------- internal ----------

      `;    _init() {

            // 0) Apply initial theme CSS class

      const bgB = document.createElement('div');      console.log(`🎨 Applying initial theme: ${this.season}`);

      bgB.className = 'bg-layer';      document.body.classList.remove('summer-theme', 'autumn-theme', 'winter-theme');

      bgB.id = 'bg-b';      document.body.classList.add(`${this.season}-theme`);

      bgB.style.cssText = bgA.style.cssText;      

            // 1) establish initial day/night by timezone

      bgRoot.appendChild(bgA);      this._checkTimeAndMaybeFlip(true);

      bgRoot.appendChild(bgB);

      document.body.appendChild(bgRoot);      // 2) build shuffled order and paint first background

    }      this._rebuildImageOrder(true);



    // Create particle canvas if it doesn't exist      // 3) start timers

    if (!document.getElementById('particle-canvas')) {      this._restartRotation();

      const canvas = document.createElement('canvas');      this._startTimeWatcher();

      canvas.id = 'particle-canvas';

      canvas.setAttribute('aria-hidden', 'true');      // 4) particles

      canvas.style.cssText = `      this._installParticleCanvas();

        position: fixed;      this._applySeasonParticles();

        inset: 0;

        z-index: 3;      // expose for integration

        pointer-events: none;      window.backgroundManager = this;

      `;      console.log('✅ SmartBackgroundManager ready:', {

      document.body.appendChild(canvas);        season: this.season,

    }        timeOfDay: this.timeOfDay,

        tz: this.settings.timezone,

    // Add active class styles        images: this._images().length

    const style = document.createElement('style');      });

    style.textContent = '.bg-layer.active { opacity: 1; }';    }

    document.head.appendChild(style);

  }    _restartRotation() {

      if (this.rotationTimer) clearInterval(this.rotationTimer);

  initializeBackgroundSystem() {      const ms = this.settings.slideshowTime * 1000;

    // First paint immediately      this.rotationTimer = setInterval(() => this._next(), ms);

    currentIndex = 0;    }

    isNight = isNightTime();

    lastPhaseKey = isNight ? 'night' : 'day';    _startTimeWatcher() {

    setBackgroundImage(getImageSrc(activeTheme, lastPhaseKey, currentIndex), /*immediate*/true)      if (this.timeCheckTimer) clearInterval(this.timeCheckTimer);

      .then(() => preloadNextImage())      // check once per minute to flip day/night exactly at 06:00 / 18:00

      .catch(() => {/* handled in setBackgroundImage */});      this.timeCheckTimer = setInterval(() => this._checkTimeAndMaybeFlip(false), 60_000);

    }

    // Particles

    initializeParticles(activeTheme);    _checkTimeAndMaybeFlip(force) {

      const t = nowInTZ(this.settings.timezone);

    // Start timers      const hour = t.getHours();

    scheduleRotation();      const newTOD = (hour >= 6 && hour < 18) ? 'day' : 'night';

    scheduleDayNightWatcher();      if (force || newTOD !== this.timeOfDay) {

        const old = this.timeOfDay;

    console.log(`🎨 Background system ready: ${activeTheme} theme, ${lastPhaseKey} phase`);        this.timeOfDay = newTOD;

  }        this._rebuildImageOrder(true);

        if (!force) console.log(`🌗 Time-of-day changed: ${old} → ${newTOD} @ ${this.settings.timezone}`);

  // Public API methods      }

  setTheme(theme) {    }

    const newTheme = sanitizeTheme(theme);

    if (newTheme === activeTheme) return;    _images() {

          const seasonCfg = this.themeData[this.season] || {};

    settings.theme = newTheme;      const bucket = (this.timeOfDay === 'day' ? seasonCfg.day : seasonCfg.night) || {};

    saveSettings();      const imgs = bucket.images || [];

          console.log(`🖼️ Getting images for ${this.season} ${this.timeOfDay}: ${imgs.length} images found`);

    activeTheme = newTheme;      if (imgs.length > 0) {

    currentIndex = 0;        console.log(`📸 Sample images:`, imgs.slice(0, 3).map(img => img.split('/').pop()));

    isNight = isNightTime();      }

    lastPhaseKey = isNight ? 'night' : 'day';      return imgs.slice();

        }

    setBackgroundImage(getImageSrc(activeTheme, lastPhaseKey, currentIndex), true)

      .then(() => preloadNextImage())    _rebuildImageOrder(paintFirst) {

      .catch(() => {});      const imgs = this._images();

          if (!imgs.length) return;

    initializeParticles(activeTheme, true /* reset */);

    console.log(`🔄 Theme changed to: ${activeTheme}`);      // shuffle new order; keep some variety by reshuffling fully

  }      const order = shuffle(imgs.map((_, i) => i));

      this.indices = order;

  setRotationEnabled(enabled) {      this.cursor = 0;

    settings.backgroundRotation = settings.backgroundRotation || {};

    settings.backgroundRotation.enabled = Boolean(enabled);      if (paintFirst) {

    saveSettings();        const first = imgs[this.indices[this.cursor]];

            this._setBackground(first, true /* immediate */);

    if (settings.backgroundRotation.enabled) {      }

      scheduleRotation();    }

    } else {

      clearRotation();    _next() {

    }      const imgs = this._images();

  }      if (!imgs.length) return;



  setInterval(intervalMs) {      this.cursor = (this.cursor + 1) % this.indices.length;

    const interval = Math.max(5000, Number(intervalMs) || 20000);      if (this.cursor === 0) {

    settings.backgroundRotation = settings.backgroundRotation || {};        // reshuffle each cycle for fresh order

    settings.backgroundRotation.interval = interval;        this.indices = shuffle(this.indices);

    saveSettings();      }

          const next = imgs[this.indices[this.cursor]];

    // Restart rotation with new interval      this._setBackground(next, false);

    clearRotation();    }

    scheduleRotation();

  }    _setBackground(url, immediate) {

      if (!this.bgEl) return;

  nextBackground() {      if (immediate) {

    updateBackground();        this.bgEl.style.transition = 'none';

  }        this.bgEl.style.opacity = '1';

        this.bgEl.style.backgroundImage = `url('${url}')`;

  getCurrentState() {        // restore transition after one tick

    const phase = isNight ? 'night' : 'day';        requestAnimationFrame(() => {

    const total = THEME_DATA[activeTheme][phase].images.length;          this.bgEl.style.transition = 'opacity 1s ease-in-out';

    const idx = (currentIndex % total) + 1;        });

    const enabled = Boolean(settings.backgroundRotation?.enabled ?? true);        return;

          }

    return {      // fade

      theme: activeTheme,      this.bgEl.style.opacity = '0';

      phase,      setTimeout(() => {

      index: idx,        this.bgEl.style.backgroundImage = `url('${url}')`;

      total,        this.bgEl.style.opacity = '1';

      rotationEnabled: enabled,      }, 150);

      interval: settings.backgroundRotation?.interval ?? 20000    }

    };

  }    // ---------- particles ----------

}    _installParticleCanvas() {

      this.canvas = document.createElement('canvas');

// ---- Core Functions ----      this.canvas.id = 'theme-particles';

function sanitizeTheme(name) {      Object.assign(this.canvas.style, {

  const key = String(name || '').toLowerCase();        position: 'fixed',

  if (key in THEME_DATA) return key;        inset: '0',

  console.warn('[StudyFlow] Invalid theme; defaulting to autumn:', name);        zIndex: '1',          // above bg, below UI card

  return 'autumn';        pointerEvents: 'none'

}      });

      document.body.appendChild(this.canvas);

function scheduleRotation() {      this.ctx = this.canvas.getContext('2d');

  const enabled = Boolean(settings.backgroundRotation?.enabled ?? true);

  if (!enabled) return;      const onResize = () => {

  const interval = Number(settings.backgroundRotation?.interval ?? 20000);        this.canvas.width = window.innerWidth;

  clearRotation();        this.canvas.height = window.innerHeight;

  rotationTimer = setInterval(() => {      };

    updateBackground();      window.addEventListener('resize', onResize);

  }, Math.max(5000, interval));      onResize();

}    }



function clearRotation() {     _applySeasonParticles() {

  if (rotationTimer) {       // stop previous loop if any

    clearInterval(rotationTimer);       if (this.particles && this.particles.stop) {

    rotationTimer = null;         this.particles.stop();

  }         console.log('🛑 Stopped previous particles');

}      }



function scheduleDayNightWatcher() {      console.log(`🎨 Applying particles for season: ${this.season}`);

  // Check every minute if phase changed      

  setInterval(() => {      if (this.season === 'winter') {

    const nowNight = isNightTime();        this.particles = snowSystem(this.canvas, this.ctx);

    if (nowNight !== isNight) {        console.log('❄️ Winter snow particles activated');

      isNight = nowNight;      } else if (this.season === 'summer') {

      lastPhaseKey = isNight ? 'night' : 'day';        this.particles = leavesSystem(this.canvas, this.ctx, { hue: 110, sat: 45, light: 55, size: [2, 4] }); // green small leaves

      currentIndex = 0; // reset sequence for the new phase        console.log('🌿 Summer green leaves activated');

      setBackgroundImage(getImageSrc(activeTheme, lastPhaseKey, currentIndex))      } else {

        .then(() => preloadNextImage())        this.particles = leavesSystem(this.canvas, this.ctx, { hue: 30, sat: 60, light: 55, size: [3, 6] });   // autumn leaves

        .catch(() => {});        console.log('🍂 Autumn leaves activated');

      console.log(`🌗 Day/night switched to: ${lastPhaseKey}`);      }

    }      this.particles.start();

  }, 60_000);    }

}  }



function isNightTime() {  // -------- particle engines (low-poly dots/leaves) --------

  const h = new Date().getHours();  function snowSystem(canvas, ctx) {

  // Day: 06:00–17:59, Night: 18:00–05:59    let raf = 0;

  return !(h >= 6 && h < 18);    const flakes = [];

}    const density = Math.round((canvas.width * canvas.height) / 24000); // Slightly more snowflakes

    for (let i = 0; i < density; i++) {

function getImageSrc(theme, phase, index) {      flakes.push({

  const list = THEME_DATA[theme][phase].images;        x: Math.random() * canvas.width,

  const file = list[index % list.length];        y: Math.random() * canvas.height,

  return ASSET_BASE + file;        r: 1.2 + Math.random() * 2.5, // Slightly larger

}        vx: (Math.random() - 0.5) * 0.3,

        vy: 0.4 + Math.random() * 0.9,

async function updateBackground() {        drift: Math.random() * Math.PI * 2

  const phase = isNight ? 'night' : 'day';      });

  currentIndex = (currentIndex + 1) % THEME_DATA[activeTheme][phase].images.length;    }

  const src = getImageSrc(activeTheme, phase, currentIndex);    const draw = () => {

  try {      ctx.clearRect(0, 0, canvas.width, canvas.height);

    await setBackgroundImage(src);      ctx.globalAlpha = 0.95; // More visible

    preloadNextImage();      for (const f of flakes) {

  } catch (err) {        f.drift += 0.01;

    console.warn('[StudyFlow] Failed to set bg; advancing', err);        f.x += f.vx + Math.sin(f.drift) * 0.2;

    // skip to next image        f.y += f.vy;

    currentIndex = (currentIndex + 1) % THEME_DATA[activeTheme][phase].images.length;        if (f.y > canvas.height + 5) { f.y = -5; f.x = Math.random() * canvas.width; }

  }        if (f.x < -5) f.x = canvas.width + 5;

}        if (f.x > canvas.width + 5) f.x = -5;

        

function preloadNextImage() {        // Higher poly snowflake: 6-pointed star instead of circle

  const phase = isNight ? 'night' : 'day';        ctx.fillStyle = '#ffffff';

  const nextIdx = (currentIndex + 1) % THEME_DATA[activeTheme][phase].images.length;        ctx.beginPath();

  const src = getImageSrc(activeTheme, phase, nextIdx);        for (let i = 0; i < 6; i++) {

  const img = new Image();          const angle = (i * Math.PI) / 3;

  img.loading = 'eager';          const px = f.x + Math.cos(angle) * f.r;

  img.decoding = 'async';          const py = f.y + Math.sin(angle) * f.r;

  img.src = src;          if (i === 0) ctx.moveTo(px, py);

  // No-op onload; browser caches for instant swap          else ctx.lineTo(px, py);

}        }

        ctx.closePath();

async function setBackgroundImage(src, immediate = false) {        ctx.fill();

  await ensureImageLoadedWithRetry(src);        

  const showA = activeLayer === 'a';        // Add subtle center dot for more definition

  const nextEl = showA ? bgB : bgA;        ctx.beginPath();

  const curEl = showA ? bgA : bgB;        ctx.arc(f.x, f.y, f.r * 0.3, 0, Math.PI * 2);

        ctx.fill();

  nextEl.style.backgroundImage = `url('${cssUrl(src)}')`;      }

      raf = requestAnimationFrame(draw);

  if (immediate) {    };

    curEl.classList.remove('active');    return {

    nextEl.classList.add('active');      start() { cancelAnimationFrame(raf); draw(); },

    activeLayer = showA ? 'b' : 'a';      stop() { cancelAnimationFrame(raf); }

    // hint GC to release old image memory    };

    queueMicrotask(() => { curEl.style.backgroundImage = 'none'; });  }

    return;

  }  function leavesSystem(canvas, ctx, opts) {

    let raf = 0;

  // Cross-fade    const hue = opts?.hue ?? 30;

  nextEl.classList.add('active');    const sat = opts?.sat ?? 60;

  curEl.classList.remove('active');    const light = opts?.light ?? 55;

  activeLayer = showA ? 'b' : 'a';    const [minS, maxS] = opts?.size ?? [3, 6];



  // After transition, clear the old background to free memory    const leaves = [];

  const ms = 900; // transition duration    const density = Math.round((canvas.width * canvas.height) / 20000); // Slightly more particles

  await new Promise(r => setTimeout(r, ms + 50));    for (let i = 0; i < density; i++) {

  curEl.style.backgroundImage = 'none';      leaves.push({

}        x: Math.random() * canvas.width,

        y: Math.random() * canvas.height,

function cssUrl(u) {        s: minS + Math.random() * (maxS - minS),

  // Basic escape for quotes and parentheses in URLs        rx: Math.random() * Math.PI * 2,

  return String(u).replace(/"/g, '\\"').replace(/\)/g, '\\)');        ry: Math.random() * Math.PI * 2,

}        vx: -0.4 + Math.random() * 0.8,

        vy: 0.5 + Math.random() * 1.0,

async function ensureImageLoadedWithRetry(src) {        wob: Math.random() * Math.PI * 2

  const maxRetries = 3;      });

  const attempt = retryMap.get(src) || 0;    }

  try {    const draw = () => {

    await loadImage(src);      ctx.clearRect(0, 0, canvas.width, canvas.height);

    retryMap.delete(src);      ctx.globalAlpha = 0.95; // More visible

  } catch (err) {      for (const L of leaves) {

    if (attempt < maxRetries) {        L.wob += 0.02;

      const backoff = Math.min(2000 * (attempt + 1), 4000);        L.x += L.vx + Math.sin(L.wob) * 0.6;

      retryMap.set(src, attempt + 1);        L.y += L.vy;

      console.warn(`[StudyFlow] Load failed for ${src}. Retry ${attempt+1}/${maxRetries} in ${backoff}ms`);        if (L.y > canvas.height + 8) { L.y = -8; L.x = Math.random() * canvas.width; }

      await new Promise(r => setTimeout(r, backoff));        if (L.x < -8) L.x = canvas.width + 8;

      return ensureImageLoadedWithRetry(src);        if (L.x > canvas.width + 8) L.x = -8;

    } else {

      console.error(`[StudyFlow] Giving up on ${src} after ${maxRetries} retries.`);        // Higher poly leaf: hexagonal shape instead of diamond

      // Gracefully skip by throwing to caller        const c = `hsl(${hue} ${sat}% ${light}%)`;

      throw err;        ctx.fillStyle = c;

    }        ctx.beginPath();

  }        // Create a 6-sided leaf shape

}        for (let i = 0; i < 6; i++) {

          const angle = (i * Math.PI) / 3;

function loadImage(src) {          const px = L.x + Math.cos(angle) * L.s;

  return new Promise((resolve, reject) => {          const py = L.y + Math.sin(angle) * L.s * 0.7; // Slightly flattened

    const img = new Image();          if (i === 0) ctx.moveTo(px, py);

    img.onload = () => resolve();          else ctx.lineTo(px, py);

    img.onerror = reject;        }

    img.decoding = 'async';        ctx.closePath();

    img.referrerPolicy = 'no-referrer';        ctx.fill();

    img.src = src;        

  });        // Add subtle outline for more definition

}        ctx.strokeStyle = `hsl(${hue} ${sat + 10}% ${light - 15}%)`;

        ctx.lineWidth = 0.5;

function saveSettings() {        ctx.stroke();

  try {      }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));      raf = requestAnimationFrame(draw);

  } catch (e) {    };

    console.warn('[StudyFlow] Failed to persist settings', e);    return {

  }      start() { cancelAnimationFrame(raf); draw(); },

}      stop() { cancelAnimationFrame(raf); }

    };

function loadSettings() {  }

  try {

    const raw = localStorage.getItem(STORAGE_KEY);  // boot on DOM ready, with a slight delay to ensure timerSettings are loaded

    if (!raw) return {  document.addEventListener('DOMContentLoaded', () => {

      theme: 'autumn',    setTimeout(() => {

      backgroundRotation: { enabled: true, interval: 20000 }      new SmartBackgroundManager();

    };    }, 100); // Small delay to ensure settings are loaded

    const parsed = JSON.parse(raw);  });

    // Ensure structure})();
    return {
      theme: sanitizeTheme(parsed.theme ?? 'autumn'),
      backgroundRotation: {
        enabled: Boolean(parsed.backgroundRotation?.enabled ?? true),
        interval: Number(parsed.backgroundRotation?.interval ?? 20000),
      },
    };
  } catch {
    return { theme: 'autumn', backgroundRotation: { enabled: true, interval: 20000 } };
  }
}

// ---- Particle System ----
let particleCtx, px, py, width, height, pr;
let particles = [];
let particleRAF = null;

function initializeParticles(theme, reset = false) {
  if (!particleCanvas) return;
  if (reset) cancelAnimationFrame(particleRAF);

  // Setup canvas size
  const dpr = window.devicePixelRatio || 1;
  width = particleCanvas.clientWidth = window.innerWidth;
  height = particleCanvas.clientHeight = window.innerHeight;
  particleCanvas.width = Math.round(width * dpr);
  particleCanvas.height = Math.round(height * dpr);
  pr = dpr;
  particleCtx = particleCanvas.getContext('2d');
  particleCtx.scale(dpr, dpr);

  // Build particle config based on theme
  const config = getParticleConfig(theme);
  particles = spawnParticles(config);

  window.addEventListener('resize', () => initializeParticles(activeTheme, true));

  // Loop
  const loop = (t) => {
    drawParticles(config);
    particleRAF = requestAnimationFrame(loop);
  };
  particleRAF = requestAnimationFrame(loop);
}

function getParticleConfig(theme) {
  // Baseline counts tuned for performance
  const base = {
    maxCount: 90,
    minSize: 6,
    maxSize: 14,
    wind: 0.12,
    gravity: 0.02,
    sway: 0.7,
    drift: 0.35,
    opacity: 0.9,
  };

  switch (theme) {
    case 'summer':
      return { ...base, shape: 'hex', color: '#9bd18b', maxCount: 70, gravity: 0.015, sway: 0.9 };
    case 'autumn':
      return { ...base, shape: 'hex', color: '#d28e52', maxCount: 80, gravity: 0.025, sway: 0.8 };
    case 'winter':
    default:
      return { ...base, shape: 'snow', color: '#ffffff', maxCount: 110, gravity: 0.01, sway: 1.0 };
  }
}

function spawnParticles(cfg) {
  const out = [];
  const count = Math.min(cfg.maxCount, Math.floor((width * height) / 22000));
  for (let i = 0; i < count; i++) {
    out.push(makeParticle(cfg, /*spawnTop*/ Math.random() < 0.7));
  }
  return out;
}

function makeParticle(cfg, spawnTop = true) {
  const size = rand(cfg.minSize, cfg.maxSize);
  return {
    x: Math.random() * width,
    y: spawnTop ? -rand(0, height) : Math.random() * height,
    vx: (Math.random() - 0.5) * cfg.drift + cfg.wind,
    vy: rand(0.2, 0.8) + cfg.gravity,
    r: size,
    angle: Math.random() * Math.PI * 2,
    swing: rand(0.3, cfg.sway),
    opacity: cfg.opacity * rand(0.6, 1),
    spin: (Math.random() - 0.5) * 0.02,
  };
}

function drawParticles(cfg) {
  particleCtx.clearRect(0, 0, width, height);

  for (let p of particles) {
    // Update
    p.angle += p.spin;
    p.x += p.vx + Math.sin(p.angle) * p.swing * 0.5;
    p.y += p.vy;

    // Wrap
    if (p.y - p.r > height) {
      p.y = -p.r * 2;
      p.x = Math.random() * width;
      p.vx = (Math.random() - 0.5) * cfg.drift + cfg.wind;
      p.vy = rand(0.2, 0.8) + cfg.gravity;
    }
    if (p.x + p.r < 0) p.x = width + p.r;
    if (p.x - p.r > width) p.x = -p.r;

    // Draw
    particleCtx.globalAlpha = p.opacity;
    particleCtx.fillStyle = cfg.color;
    particleCtx.strokeStyle = cfg.color;

    if (cfg.shape === 'snow') drawSnowflake(particleCtx, p.x, p.y, p.r);
    else drawHexLeaf(particleCtx, p.x, p.y, p.r, p.angle);
  }
  particleCtx.globalAlpha = 1;
}

function drawHexLeaf(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSnowflake(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
}

function rand(min, max) { return Math.random() * (max - min) + min; }

// ---- Global Initialization ----
let backgroundManager = null;

document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure other scripts are loaded
  setTimeout(() => {
    backgroundManager = new StudyFlowBackgroundManager();
    backgroundManager.init();
    
    // Make globally available
    window.backgroundManager = backgroundManager;
    
    console.log('🎨 StudyFlow Background System ready!');
  }, 100);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StudyFlowBackgroundManager };
}