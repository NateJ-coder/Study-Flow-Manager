(function () {
  const A = (window.SF_CONFIG && window.SF_CONFIG.AUDIO) || {};
  const paths = {
    click: A.CLICK || '/Study-Flow-Manager/performance-build/assets/audio/click.mp3',
    splash: A.SPLASH || '/Study-Flow-Manager/performance-build/assets/audio/splash.mp3',
    rain: A.RAIN || '/Study-Flow-Manager/performance-build/assets/audio/rain.mp3',
    drawing: A.DRAWING || '/Study-Flow-Manager/performance-build/assets/audio/drawing.mp3'
  };

  let unlocked = false;
  const unlock = () => { unlocked = true; window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });

  const cache = new Map();
  function getAudio(name, loop=false) {
    const key = name + (loop ? ':loop' : '');
    if (cache.has(key)) return cache.get(key);
    const el = new Audio(paths[name] || paths.click);
    el.preload = 'auto';
    el.loop = !!loop;
    cache.set(key, el);
    return el;
  }

  function play(name, vol = 0.35) {
    if (!unlocked) return; // respect autoplay policies until first gesture
    try {
      const el = getAudio(name, false);
      el.currentTime = 0;
      el.volume = vol;
      el.play().catch(() => {});
    } catch {}
  }

  let lastClickAt = 0;
  function globalClickSfx(e) {
    const target = e.target.closest('button,a,[role="button"],.btn');
    if (!target) return;
    const now = performance.now();
    if (now - lastClickAt < 100) return;
    lastClickAt = now;
    play('click', 0.25);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', globalClickSfx, { passive: true });
  });

  let rainEl = null;
  function loopRain(on, vol = 0.22) {
    if (!unlocked) return;
    try {
      if (on) {
        rainEl = getAudio('rain', true);
        rainEl.volume = vol;
        rainEl.play().catch(()=>{});
      } else if (rainEl) {
        rainEl.pause();
        try { rainEl.currentTime = 0; } catch(e) {}
      }
    } catch {}
  }

  window.AudioManager = { play, loopRain };
})();
