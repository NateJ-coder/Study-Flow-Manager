// assets/js/background-manager.js
/**
 * SmartBackgroundManager
 * Season-aware, time-of-day aware slideshow + theme particles
 * - Season selected in UI (summer | autumn | winter)
 * - Shuffles within that season
 * - Day ↔ Night auto-switch at 06:00 / 18:00 in the user's chosen timezone
 * - Uses THEME_DATA (declared in core.js) for image lists
 * - Respects window.timerSettings.slideshowTime (min 20s)
 * - Lightweight canvas particles (snow / leaves)
 */

(function () {
  // ---------- tiny helpers ----------
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const nowInTZ = (tz) => new Date(new Date().toLocaleString("en-US", { timeZone: tz }));

  class SmartBackgroundManager {
    constructor() {
      // required DOM
      this.bgEl = document.getElementById('bg-container');
      if (!this.bgEl) {
        console.error('SmartBackgroundManager: #bg-container not found.');
        return;
      }

      // THEME_DATA is exposed by core.js
      this.themeData = window.THEME_DATA || {};
      // settings come from timer.html (updated via Settings modal)
      this.settings = window.timerSettings || {};
      // fallbacks
      this.settings.theme = this.settings.theme || 'summer';
      this.settings.timezone = this.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.settings.slideshowTime = clamp(parseInt(this.settings.slideshowTime || 20, 10), 20, 3600);

      // slideshow state
      this.season = this.settings.theme;          // 'summer' | 'autumn' | 'winter'
      this.timeOfDay = 'day';                     // 'day' | 'night'
      this.indices = [];                          // shuffled index order for current image set
      this.cursor = 0;                            // current position in indices
      this.rotationTimer = null;
      this.timeCheckTimer = null;

      // particles
      this.particles = null;

      this._init();
    }

    // ---------- public API ----------
    setSeason(season) {
      if (!this.themeData[season]) {
        console.warn(`SmartBackgroundManager: unknown season "${season}"`);
        return;
      }
      this.season = season;
      document.body.classList.remove('summer-theme', 'autumn-theme', 'winter-theme');
      document.body.classList.add(`${season}-theme`);
      this._rebuildImageOrder(true);
      this._applySeasonParticles();
    }

    setTimezone(tz) {
      this.settings.timezone = tz;
      // force a time check immediately
      this._checkTimeAndMaybeFlip(true);
    }

    setIntervalSeconds(sec) {
      const safe = clamp(parseInt(sec || 20, 10), 20, 3600);
      this.settings.slideshowTime = safe;
      this._restartRotation();
    }

    // ---------- internal ----------
    _init() {
      // 1) establish initial day/night by timezone
      this._checkTimeAndMaybeFlip(true);

      // 2) build shuffled order and paint first background
      this._rebuildImageOrder(true);

      // 3) start timers
      this._restartRotation();
      this._startTimeWatcher();

      // 4) particles
      this._installParticleCanvas();
      this._applySeasonParticles();

      // expose for integration
      window.backgroundManager = this;
      console.log('✅ SmartBackgroundManager ready:', {
        season: this.season,
        timeOfDay: this.timeOfDay,
        tz: this.settings.timezone,
        images: this._images().length
      });
    }

    _restartRotation() {
      if (this.rotationTimer) clearInterval(this.rotationTimer);
      const ms = this.settings.slideshowTime * 1000;
      this.rotationTimer = setInterval(() => this._next(), ms);
    }

    _startTimeWatcher() {
      if (this.timeCheckTimer) clearInterval(this.timeCheckTimer);
      // check once per minute to flip day/night exactly at 06:00 / 18:00
      this.timeCheckTimer = setInterval(() => this._checkTimeAndMaybeFlip(false), 60_000);
    }

    _checkTimeAndMaybeFlip(force) {
      const t = nowInTZ(this.settings.timezone);
      const hour = t.getHours();
      const newTOD = (hour >= 6 && hour < 18) ? 'day' : 'night';
      if (force || newTOD !== this.timeOfDay) {
        const old = this.timeOfDay;
        this.timeOfDay = newTOD;
        this._rebuildImageOrder(true);
        if (!force) console.log(`🌗 Time-of-day changed: ${old} → ${newTOD} @ ${this.settings.timezone}`);
      }
    }

    _images() {
      const seasonCfg = this.themeData[this.season] || {};
      const bucket = (this.timeOfDay === 'day' ? seasonCfg.day : seasonCfg.night) || {};
      const imgs = bucket.images || [];
      return imgs.slice();
    }

    _rebuildImageOrder(paintFirst) {
      const imgs = this._images();
      if (!imgs.length) return;

      // shuffle new order; keep some variety by reshuffling fully
      const order = shuffle(imgs.map((_, i) => i));
      this.indices = order;
      this.cursor = 0;

      if (paintFirst) {
        const first = imgs[this.indices[this.cursor]];
        this._setBackground(first, true /* immediate */);
      }
    }

    _next() {
      const imgs = this._images();
      if (!imgs.length) return;

      this.cursor = (this.cursor + 1) % this.indices.length;
      if (this.cursor === 0) {
        // reshuffle each cycle for fresh order
        this.indices = shuffle(this.indices);
      }
      const next = imgs[this.indices[this.cursor]];
      this._setBackground(next, false);
    }

    _setBackground(url, immediate) {
      if (!this.bgEl) return;
      if (immediate) {
        this.bgEl.style.transition = 'none';
        this.bgEl.style.opacity = '1';
        this.bgEl.style.backgroundImage = `url('${url}')`;
        // restore transition after one tick
        requestAnimationFrame(() => {
          this.bgEl.style.transition = 'opacity 1s ease-in-out';
        });
        return;
      }
      // fade
      this.bgEl.style.opacity = '0';
      setTimeout(() => {
        this.bgEl.style.backgroundImage = `url('${url}')`;
        this.bgEl.style.opacity = '1';
      }, 150);
    }

    // ---------- particles ----------
    _installParticleCanvas() {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'theme-particles';
      Object.assign(this.canvas.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '1',          // above bg, below UI card
        pointerEvents: 'none'
      });
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      const onResize = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', onResize);
      onResize();
    }

    _applySeasonParticles() {
      // stop previous loop if any
      if (this.particles && this.particles.stop) this.particles.stop();

      if (this.season === 'winter') {
        this.particles = snowSystem(this.canvas, this.ctx);
      } else if (this.season === 'summer') {
        this.particles = leavesSystem(this.canvas, this.ctx, { hue: 110, sat: 45, light: 55, size: [2, 4] }); // green small leaves
      } else {
        this.particles = leavesSystem(this.canvas, this.ctx, { hue: 30, sat: 60, light: 55, size: [3, 6] });   // autumn leaves
      }
      this.particles.start();
    }
  }

  // -------- particle engines (low-poly dots/leaves) --------
  function snowSystem(canvas, ctx) {
    let raf = 0;
    const flakes = [];
    const density = Math.round((canvas.width * canvas.height) / 26000); // scale by screen
    for (let i = 0; i < density; i++) {
      flakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.4 + Math.random() * 0.9,
        drift: Math.random() * Math.PI * 2
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      for (const f of flakes) {
        f.drift += 0.01;
        f.x += f.vx + Math.sin(f.drift) * 0.2;
        f.y += f.vy;
        if (f.y > canvas.height + 5) { f.y = -5; f.x = Math.random() * canvas.width; }
        if (f.x < -5) f.x = canvas.width + 5;
        if (f.x > canvas.width + 5) f.x = -5;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    return {
      start() { cancelAnimationFrame(raf); draw(); },
      stop() { cancelAnimationFrame(raf); }
    };
  }

  function leavesSystem(canvas, ctx, opts) {
    let raf = 0;
    const hue = opts?.hue ?? 30;
    const sat = opts?.sat ?? 60;
    const light = opts?.light ?? 55;
    const [minS, maxS] = opts?.size ?? [3, 6];

    const leaves = [];
    const density = Math.round((canvas.width * canvas.height) / 22000);
    for (let i = 0; i < density; i++) {
      leaves.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: minS + Math.random() * (maxS - minS),
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        vx: -0.4 + Math.random() * 0.8,
        vy: 0.5 + Math.random() * 1.0,
        wob: Math.random() * Math.PI * 2
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.85;
      for (const L of leaves) {
        L.wob += 0.02;
        L.x += L.vx + Math.sin(L.wob) * 0.6;
        L.y += L.vy;
        if (L.y > canvas.height + 8) { L.y = -8; L.x = Math.random() * canvas.width; }
        if (L.x < -8) L.x = canvas.width + 8;
        if (L.x > canvas.width + 8) L.x = -8;

        // low-poly "leaf": rotated diamond
        const c = `hsl(${hue} ${sat}% ${light}%)`;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(L.x, L.y - L.s);
        ctx.lineTo(L.x + L.s, L.y);
        ctx.lineTo(L.x, L.y + L.s);
        ctx.lineTo(L.x - L.s, L.y);
        ctx.closePath();
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    return {
      start() { cancelAnimationFrame(raf); draw(); },
      stop() { cancelAnimationFrame(raf); }
    };
  }

  // boot on DOM ready
  document.addEventListener('DOMContentLoaded', () => new SmartBackgroundManager());
})();