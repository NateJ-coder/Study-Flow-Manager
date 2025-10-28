// RainManager: schedules a 45-minute "rain mode" every 2 hours
// Adds classes to <html>, locks settings, snapshots settings, applies an eco profile,
// starts a CSS-based rain layer, throttles preloads, and respects prefers-reduced-motion.
(function () {
  const RAIN_DURATION_MS = 45 * 60 * 1000; // 45 minutes
  const RAIN_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
  const SNAPSHOT_KEY = 'sf_user_settings_snapshot_v1';
  const DISABLE_KEY = 'sf_rain_disabled';

  let rainTimer = null;
  let rainStopTimeout = null;

  function prefersReducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function isDisabled() {
    try { return localStorage.getItem(DISABLE_KEY) === '1'; } catch (e) { return false; }
  }

  function snapshotUserSettings() {
    try {
      const snap = window.getUserSettings ? window.getUserSettings() : (window.appSettings ? window.appSettings : null);
      if (snap) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
    } catch (e) { console.warn('rain: snapshot failed', e); }
  }

  function restoreUserSettings() {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (window.setUserSettings) {
        window.setUserSettings(obj);
      }
  // Also update appSettings in-memory if present
  try { if (window.appSettings && typeof window.appSettings === 'object') Object.assign(window.appSettings, obj); } catch(e){}
      try { if (typeof window.applySettings === 'function') window.applySettings(); } catch (e) {}
    } catch (e) { console.warn('rain: restore failed', e); }
  }

  function applyEcoProfile() {
    try {
      const defaults = window.appSettings || {};
      const profile = Object.assign({}, defaults, {
        disableTickingGlow: true,
        // increase slideshow interval to reduce network and CPU churn
        slideshowInterval: Math.max(60, (defaults.slideshowInterval || 30)),
      });
      if (window.setUserSettings) window.setUserSettings(profile);
      if (window.appSettings && typeof window.appSettings === 'object') Object.assign(window.appSettings, profile);
      try { if (typeof window.applySettings === 'function') window.applySettings(); } catch (e) {}
    } catch (e) { console.warn('rain: applyEcoProfile failed', e); }
  }

  function lockSettingsRoot() {
    try {
      const roots = document.querySelectorAll('[data-settings-root]');
      roots.forEach(r => r.setAttribute('data-locked', 'true'));
    } catch (e) { /* ignore */ }
  }

  function unlockSettingsRoot() {
    try {
      const roots = document.querySelectorAll('[data-settings-root]');
      roots.forEach(r => r.removeAttribute('data-locked'));
    } catch (e) { /* ignore */ }
  }

  function startRainOnce() {
    if (prefersReducedMotion()) return;
    if (isDisabled()) return;
    // Already running?
    if (document.documentElement.classList.contains('sf-rain')) return;

    // Snapshot user settings
    snapshotUserSettings();

    // Apply class states
    document.documentElement.classList.add('sf-rain', 'sf-wet');

    // Lock settings UI
    lockSettingsRoot();

    // Set preload eco throttle
    document.documentElement.setAttribute('data-preload-eco', '1');

    // Apply lightweight eco profile
    applyEcoProfile();

    // Create overlay to prevent interactions and provide controls
    let overlay = document.getElementById('sf-settings-lock');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sf-settings-lock';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="sf-lock-inner">
          <div class="sf-lock-msg">Rain mode active — studying in the rain for 45 minutes.</div>
          <button id="sf-rain-accessibility-pause" class="btn">Accessibility: Pause rain</button>
        </div>
      `;
      document.body.appendChild(overlay);

      const btn = document.getElementById('sf-rain-accessibility-pause');
      if (btn) btn.addEventListener('click', () => {
        try {
          localStorage.setItem(DISABLE_KEY, '1');
        } catch (e) {}
        stopRain();
      });
    }

    // Create rain layer
    let layer = document.getElementById('sf-rain-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'sf-rain-layer';
      document.body.appendChild(layer);

      // Create a number of drops
      const drops = 40;
      for (let i = 0; i < drops; i++) {
        const d = document.createElement('div');
        d.className = 'drop';
        // random horizontal position and delay
        d.style.left = Math.floor(Math.random() * 100) + 'vw';
        d.style.animationDelay = (Math.random() * 3) + 's';
        d.style.opacity = String(0.6 + Math.random() * 0.4);
        layer.appendChild(d);
      }
    }

    // Schedule stop after duration
    rainStopTimeout = setTimeout(() => {
      stopRain();
    }, RAIN_DURATION_MS);
  }

  function stopRain() {
    // Remove classes and restore settings
    document.documentElement.classList.remove('sf-rain');
    document.documentElement.classList.remove('sf-wet');
    document.documentElement.removeAttribute('data-preload-eco');

    // Clear timer
    if (rainStopTimeout) { clearTimeout(rainStopTimeout); rainStopTimeout = null; }

    // Unlock settings UI
    unlockSettingsRoot();

    // Remove overlay and rain layer
    try { const overlay = document.getElementById('sf-settings-lock'); if (overlay) overlay.remove(); } catch (e) {}
    try { const layer = document.getElementById('sf-rain-layer'); if (layer) layer.remove(); } catch (e) {}

    // Restore user settings snapshot
    restoreUserSettings();
  }

  function scheduleRain() {
    if (prefersReducedMotion()) return;
    if (isDisabled()) return;
    // Start immediately once per page load if none has run in this session
    if (!window._sf_rain_scheduled_once) {
      window._sf_rain_scheduled_once = true;
      // Delay a bit to avoid colliding with initial paint
      setTimeout(() => startRainOnce(), 5 * 1000);
    }
    // Schedule recurring every 2 hours
    if (!rainTimer) rainTimer = setInterval(() => startRainOnce(), RAIN_INTERVAL_MS);
  }

  // Start scheduling on load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    scheduleRain();
  } else {
    window.addEventListener('DOMContentLoaded', scheduleRain, { once: true });
  }

  // Expose controls
  try { window.RainManager = { start: startRainOnce, stop: stopRain, isDisabled: isDisabled }; } catch (e) {}
})();
