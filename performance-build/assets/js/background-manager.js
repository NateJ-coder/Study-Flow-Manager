/**
 * StudyFlow Background System
 * Implements: theme selection, day/night cycling, sequential image rotation,
 * preloading, cross-fade transitions, seasonal particle system, persistence, and
 * robust error handling.
 */

// ---- Configuration ----
const STORAGE_KEY = 'studyflow-settings';
const ASSET_BASE = 'assets/images/';

// Build file lists by rule, matching the spec's counts
const THEME_COUNTS = {
  summer: { day: 8, night: 8 },
  autumn: { day: 8, night: 8 },
  winter: { day: 7, night: 7 },
};

function buildImageList(theme, phase, count) {
  const files = [];
  for (let i = 1; i <= count; i++) {
    files.push(`${theme}-${phase}-${i}.png`);
  }
  return files;
}

const THEME_DATA = Object.fromEntries(
  Object.entries(THEME_COUNTS).map(([theme, c]) => [
    theme,
    {
      day: { images: buildImageList(theme, 'day', c.day) },
      night: { images: buildImageList(theme, 'night', c.night) },
    },
  ])
);

// ---- State ----
let settings = loadSettings();
let activeTheme = sanitizeTheme(settings.theme || 'autumn');
let rotationTimer = null;
let currentIndex = 0; // within current phase list
let isNight = isNightTime();
let lastPhaseKey = isNight ? 'night' : 'day';
let activeLayer = 'a'; // which bg DIV is currently visible
let retryMap = new Map(); // filename -> retryCount

// ---- Elements ----
let bgA, bgB, particleCanvas, stateChip;

// ---- Background System Class ----
class StudyFlowBackgroundManager {
  constructor() {
    this.initialized = false;
    this.boundMethods = {};
  }

  init() {
    if (this.initialized) return;
    
    console.log('🎨 Initializing StudyFlow Background Manager...');
    
    // Create background elements
    this.createBackgroundElements();
    
    // Cache elements
    bgA = document.getElementById('bg-a');
    bgB = document.getElementById('bg-b');
    particleCanvas = document.getElementById('particle-canvas');
    
    if (!bgA || !bgB) {
      console.error('❌ Background elements not found after creation');
      return;
    }
    
    // Initialize the system
    this.initializeBackgroundSystem();
    
    this.initialized = true;
    console.log('✅ StudyFlow Background Manager initialized');
  }

  createBackgroundElements() {
    // Remove old bg-container if it exists
    const oldBg = document.getElementById('bg-container');
    if (oldBg) {
      oldBg.remove();
      console.log('🗑️ Removed old bg-container');
    }

    // Create background root if it doesn't exist
    if (!document.getElementById('background-root')) {
      const bgRoot = document.createElement('div');
      bgRoot.id = 'background-root';
      bgRoot.setAttribute('aria-hidden', 'true');
      bgRoot.style.cssText = `
        position: fixed;
        inset: 0;
        overflow: hidden;
        z-index: 1;
        pointer-events: none;
        backface-visibility: hidden;
        transform: translateZ(0);
      `;
      
      // Create two background layers for cross-fade
      const bgA = document.createElement('div');
      bgA.className = 'bg-layer';
      bgA.id = 'bg-a';
      bgA.style.cssText = `
        position: absolute;
        inset: 0;
        background-position: center center;
        background-repeat: no-repeat;
        background-size: cover;
        opacity: 0;
        transition: opacity 900ms ease;
        will-change: opacity, background-image;
        filter: saturate(1.05) contrast(1.03);
      `;
      
      const bgB = document.createElement('div');
      bgB.className = 'bg-layer';
      bgB.id = 'bg-b';
      bgB.style.cssText = bgA.style.cssText;
      
      bgRoot.appendChild(bgA);
      bgRoot.appendChild(bgB);
      document.body.appendChild(bgRoot);
      
      console.log('🏗️ Created new background elements');
    }

    // Create particle canvas if it doesn't exist
    if (!document.getElementById('particle-canvas')) {
      const canvas = document.createElement('canvas');
      canvas.id = 'particle-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 3;
        pointer-events: none;
      `;
      document.body.appendChild(canvas);
      console.log('🎨 Created particle canvas');
    }

    // Add active class styles
    if (!document.getElementById('bg-styles')) {
      const style = document.createElement('style');
      style.id = 'bg-styles';
      style.textContent = '.bg-layer.active { opacity: 1; }';
      document.head.appendChild(style);
    }
  }

  initializeBackgroundSystem() {
    console.log(`🌍 Starting background system with theme: ${activeTheme}`);
    
    // First paint immediately
    currentIndex = 0;
    isNight = isNightTime();
    lastPhaseKey = isNight ? 'night' : 'day';
    
    console.log(`📅 Time phase: ${lastPhaseKey} (${isNight ? 'night' : 'day'})`);
    
    setBackgroundImage(getImageSrc(activeTheme, lastPhaseKey, currentIndex), /*immediate*/true)
      .then(() => {
        console.log('🖼️ First background loaded');
        preloadNextImage();
      })
      .catch((err) => {
        console.error('❌ Failed to load first background:', err);
      });

    // Particles
    initializeParticles(activeTheme);

    // Start timers
    scheduleRotation();
    scheduleDayNightWatcher();

    console.log(`🎨 Background system ready: ${activeTheme} theme, ${lastPhaseKey} phase`);
  }

  // Public API methods
  setTheme(theme) {
    const newTheme = sanitizeTheme(theme);
    console.log(`🔄 Setting theme from ${activeTheme} to ${newTheme}`);
    
    if (newTheme === activeTheme) {
      console.log('⚠️ Theme unchanged, skipping');
      return;
    }
    
    settings.theme = newTheme;
    saveSettings();
    
    activeTheme = newTheme;
    currentIndex = 0;
    isNight = isNightTime();
    lastPhaseKey = isNight ? 'night' : 'day';
    
    console.log(`🎨 Applying new theme: ${activeTheme} (${lastPhaseKey})`);
    
    setBackgroundImage(getImageSrc(activeTheme, lastPhaseKey, currentIndex), true)
      .then(() => {
        preloadNextImage();
        console.log(`✅ Theme successfully changed to: ${activeTheme}`);
      })
      .catch((err) => {
        console.error('❌ Failed to apply theme:', err);
      });
    
    initializeParticles(activeTheme, true /* reset */);
  }

  setRotationEnabled(enabled) {
    settings.backgroundRotation = settings.backgroundRotation || {};
    settings.backgroundRotation.enabled = Boolean(enabled);
    saveSettings();
    
    console.log(`🔄 Rotation ${enabled ? 'enabled' : 'disabled'}`);
    
    if (settings.backgroundRotation.enabled) {
      scheduleRotation();
    } else {
      clearRotation();
    }
  }

  setInterval(intervalMs) {
    const interval = Math.max(5000, Number(intervalMs) || 20000);
    settings.backgroundRotation = settings.backgroundRotation || {};
    settings.backgroundRotation.interval = interval;
    saveSettings();
    
    console.log(`⏰ Rotation interval set to ${interval}ms`);
    
    // Restart rotation with new interval
    clearRotation();
    scheduleRotation();
  }

  nextBackground() {
    console.log('⏭️ Manual background advance requested');
    updateBackground();
  }

  getCurrentState() {
    const phase = isNight ? 'night' : 'day';
    const total = THEME_DATA[activeTheme][phase].images.length;
    const idx = (currentIndex % total) + 1;
    const enabled = Boolean(settings.backgroundRotation?.enabled ?? true);
    
    return {
      theme: activeTheme,
      phase,
      index: idx,
      total,
      rotationEnabled: enabled,
      interval: settings.backgroundRotation?.interval ?? 20000
    };
  }
}

// ---- Core Functions ----
function sanitizeTheme(name) {
  const key = String(name || '').toLowerCase();
  if (key in THEME_DATA) return key;
  console.warn('[StudyFlow] Invalid theme; defaulting to autumn:', name);
  return 'autumn';
}

function scheduleRotation() {
  const enabled = Boolean(settings.backgroundRotation?.enabled ?? true);
  if (!enabled) {
    console.log('⏸️ Rotation disabled, not scheduling');
    return;
  }
  const interval = Number(settings.backgroundRotation?.interval ?? 20000);
  clearRotation();
  console.log(`⏰ Scheduling rotation every ${interval}ms`);
  rotationTimer = setInterval(() => {
    updateBackground();
  }, Math.max(5000, interval));
}

function clearRotation() { 
  if (rotationTimer) { 
    clearInterval(rotationTimer); 
    rotationTimer = null;
    console.log('⏹️ Rotation timer cleared');
  } 
}

function scheduleDayNightWatcher() {
  // Check every minute if phase changed
  setInterval(() => {
    const nowNight = isNightTime();
    if (nowNight !== isNight) {
      isNight = nowNight;
      lastPhaseKey = isNight ? 'night' : 'day';
      currentIndex = 0; // reset sequence for the new phase
      console.log(`🌗 Day/night switched to: ${lastPhaseKey}`);
      setBackgroundImage(getImageSrc(activeTheme, lastPhaseKey, currentIndex))
        .then(() => preloadNextImage())
        .catch(() => {});
    }
  }, 60_000);
}

function isNightTime() {
  const h = new Date().getHours();
  // Day: 06:00–17:59, Night: 18:00–05:59
  return !(h >= 6 && h < 18);
}

function getImageSrc(theme, phase, index) {
  const list = THEME_DATA[theme][phase].images;
  const file = list[index % list.length];
  return ASSET_BASE + file;
}

async function updateBackground() {
  const phase = isNight ? 'night' : 'day';
  currentIndex = (currentIndex + 1) % THEME_DATA[activeTheme][phase].images.length;
  const src = getImageSrc(activeTheme, phase, currentIndex);
  
  console.log(`🔄 Updating background: ${activeTheme} ${phase} image ${currentIndex + 1}`);
  
  try {
    await setBackgroundImage(src);
    preloadNextImage();
    console.log(`✅ Background updated successfully`);
  } catch (err) {
    console.warn('[StudyFlow] Failed to set bg; advancing', err);
    // skip to next image
    currentIndex = (currentIndex + 1) % THEME_DATA[activeTheme][phase].images.length;
  }
}

function preloadNextImage() {
  const phase = isNight ? 'night' : 'day';
  const nextIdx = (currentIndex + 1) % THEME_DATA[activeTheme][phase].images.length;
  const src = getImageSrc(activeTheme, phase, nextIdx);
  const img = new Image();
  img.loading = 'eager';
  img.decoding = 'async';
  img.src = src;
  // No-op onload; browser caches for instant swap
}

async function setBackgroundImage(src, immediate = false) {
  console.log(`🖼️ Setting background image: ${src} (immediate: ${immediate})`);
  
  await ensureImageLoadedWithRetry(src);
  
  if (!bgA || !bgB) {
    console.error('❌ Background elements not available');
    return;
  }
  
  const showA = activeLayer === 'a';
  const nextEl = showA ? bgB : bgA;
  const curEl = showA ? bgA : bgB;

  nextEl.style.backgroundImage = `url('${cssUrl(src)}')`;

  if (immediate) {
    curEl.classList.remove('active');
    nextEl.classList.add('active');
    activeLayer = showA ? 'b' : 'a';
    // hint GC to release old image memory
    queueMicrotask(() => { curEl.style.backgroundImage = 'none'; });
    console.log(`✅ Background set immediately: ${activeLayer}`);
    return;
  }

  // Cross-fade
  nextEl.classList.add('active');
  curEl.classList.remove('active');
  activeLayer = showA ? 'b' : 'a';

  console.log(`🔄 Cross-fading to layer ${activeLayer}`);

  // After transition, clear the old background to free memory
  const ms = 900; // transition duration
  await new Promise(r => setTimeout(r, ms + 50));
  curEl.style.backgroundImage = 'none';
}

function cssUrl(u) {
  // Basic escape for quotes and parentheses in URLs
  return String(u).replace(/"/g, '\\"').replace(/\)/g, '\\)');
}

async function ensureImageLoadedWithRetry(src) {
  const maxRetries = 3;
  const attempt = retryMap.get(src) || 0;
  try {
    await loadImage(src);
    retryMap.delete(src);
  } catch (err) {
    if (attempt < maxRetries) {
      const backoff = Math.min(2000 * (attempt + 1), 4000);
      retryMap.set(src, attempt + 1);
      console.warn(`[StudyFlow] Load failed for ${src}. Retry ${attempt+1}/${maxRetries} in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      return ensureImageLoadedWithRetry(src);
    } else {
      console.error(`[StudyFlow] Giving up on ${src} after ${maxRetries} retries.`);
      // Gracefully skip by throwing to caller
      throw err;
    }
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = src;
  });
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    console.log('💾 Settings saved to localStorage');
  } catch (e) {
    console.warn('[StudyFlow] Failed to persist settings', e);
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {
      theme: 'autumn',
      backgroundRotation: { enabled: true, interval: 20000 }
    };
    const parsed = JSON.parse(raw);
    // Ensure structure
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
  if (!particleCanvas) {
    console.warn('⚠️ Particle canvas not available');
    return;
  }
  
  if (reset) cancelAnimationFrame(particleRAF);

  console.log(`✨ Initializing ${theme} particles`);

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

  // Remove old resize listener if it exists
  window.removeEventListener('resize', window.particleResizeHandler);
  
  // Add new resize listener
  window.particleResizeHandler = () => initializeParticles(activeTheme, true);
  window.addEventListener('resize', window.particleResizeHandler);

  // Loop
  const loop = (t) => {
    drawParticles(config);
    particleRAF = requestAnimationFrame(loop);
  };
  particleRAF = requestAnimationFrame(loop);
  
  console.log(`✅ ${theme} particles initialized (${particles.length} particles)`);
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
  console.log('🚀 DOM loaded, initializing background system...');
  
  // Small delay to ensure other scripts are loaded
  setTimeout(() => {
    backgroundManager = new StudyFlowBackgroundManager();
    backgroundManager.init();
    
    // Make globally available
    window.backgroundManager = backgroundManager;
    
    console.log('🎨 StudyFlow Background System ready!');
  }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StudyFlowBackgroundManager };
}