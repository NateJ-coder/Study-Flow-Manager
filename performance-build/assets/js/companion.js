// StudyFlow Corner Companion
// A small, self-contained, purely decorative cat + steaming mug + yarn-ball
// scene that sits in the bottom-left corner. It:
//   - never blocks clicks/taps outside its own small hit-area
//   - respects prefers-reduced-motion (renders nothing if set)
//   - can be turned off from Settings ("Corner companion") and remembers
//     that choice via SF_PREFS (localStorage, shared across pages)
//   - hides itself during Sleep Mode and reappears when the app wakes
//   - has no hard dependencies (works even if GSAP or prefs.js fail to load)
(function () {
  const DISABLE_KEY = 'sf_companion_disabled';
  const TOGGLE_ID = 'enable-corner-cat';

  // Falls back to a no-persistence stub if prefs.js didn't load for some
  // reason, so this feature degrades gracefully instead of hard-failing.
  const PREFS = window.SF_PREFS || {
    getBool: function (key, fallback) { return fallback; },
    setBool: function () { /* no-op — can't persist without SF_PREFS */ }
  };

  function prefersReducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  function isDisabled() { return PREFS.getBool(DISABLE_KEY, false); }
  function setDisabled(disabled) { PREFS.setBool(DISABLE_KEY, disabled); }

  const REDUCED_MOTION = prefersReducedMotion();

  const SVG_MARKUP = `
    <svg viewBox="0 0 156 108" role="img" aria-label="A little cat napping beside a steaming mug and a ball of yarn">
      <g class="sf-mug">
        <ellipse cx="21" cy="97" rx="14" ry="3.5" fill="#3a2c22" opacity="0.22"></ellipse>
        <path d="M31 85c6 0 6 9 0 9" fill="none" stroke="#c9793f" stroke-width="4" stroke-linecap="round"></path>
        <rect x="10" y="80" width="21" height="16" rx="4" fill="#c9793f"></rect>
        <rect x="10" y="80" width="21" height="4" rx="2" fill="var(--accent-color, #64ffda)" opacity="0.85"></rect>
        <g class="sf-mug-steam">
          <path d="M15 79c-3-4 3-6 0-11" fill="none" stroke="#fff7ea" stroke-width="2" stroke-linecap="round" opacity="0.6"></path>
        </g>
        <g class="sf-mug-steam">
          <path d="M21 79c-3-5 3-7 0-12" fill="none" stroke="#fff7ea" stroke-width="2" stroke-linecap="round" opacity="0.6"></path>
        </g>
        <g class="sf-mug-steam">
          <path d="M27 79c-3-4 3-6 0-11" fill="none" stroke="#fff7ea" stroke-width="2" stroke-linecap="round" opacity="0.6"></path>
        </g>
      </g>
      <g class="sf-yarn">
        <circle cx="124" cy="82" r="15" fill="#3a8f82" opacity="0.95"></circle>
        <path d="M111 82c8-9 20-9 27 0" fill="none" stroke="#bff2e8" stroke-width="1.4" opacity="0.8"></path>
        <path d="M110 86c9 6 20 6 29 0" fill="none" stroke="#bff2e8" stroke-width="1.4" opacity="0.8"></path>
        <path d="M113 72c5 10 5 18 0 24" fill="none" stroke="#bff2e8" stroke-width="1.4" opacity="0.6"></path>
        <path d="M135 72c-5 10-5 18 0 24" fill="none" stroke="#bff2e8" stroke-width="1.4" opacity="0.6"></path>
      </g>
      <g class="sf-cat-tail">
        <path d="M48 88c-14-2-20-16-11-27" fill="none" stroke="#c88a52" stroke-width="9" stroke-linecap="round"></path>
      </g>
      <g class="sf-cat-body">
        <ellipse cx="70" cy="76" rx="30" ry="23" fill="#d9a066"></ellipse>
        <ellipse cx="70" cy="86" rx="17" ry="10" fill="#f4dcb4"></ellipse>
        <g class="sf-cat-paw">
          <ellipse cx="90" cy="83" rx="9" ry="7" fill="#d9a066"></ellipse>
        </g>
        <circle cx="66" cy="40" r="21" fill="#d9a066"></circle>
        <g class="sf-cat-ear-left">
          <polygon points="50,30 57,10 65,28" fill="#d9a066"></polygon>
          <polygon points="53,27 57,15 62,26" fill="#f2b7a3"></polygon>
        </g>
        <g class="sf-cat-ear-right">
          <polygon points="70,26 78,9 85,29" fill="#d9a066"></polygon>
          <polygon points="73,25 78,14 82,27" fill="#f2b7a3"></polygon>
        </g>
        <ellipse cx="66" cy="48" rx="12" ry="9" fill="#f4dcb4"></ellipse>
        <g class="sf-cat-eyes">
          <ellipse class="sf-cat-eye" cx="59" cy="40" rx="2.4" ry="3" fill="#2a2016"></ellipse>
          <ellipse class="sf-cat-eye" cx="73" cy="40" rx="2.4" ry="3" fill="#2a2016"></ellipse>
        </g>
        <polygon points="66,45 63,48 69,48" fill="#e8879a"></polygon>
        <path d="M54 48c-6 1-10 3-13 6M78 48c6 1 10 3 13 6M54 51c-6 2-10 5-12 8M78 51c6 2 10 5 12 8"
              stroke="#5a4331" stroke-width="0.7" fill="none" opacity="0.55" stroke-linecap="round"></path>
        <path d="M44 26c2-6 8-10 14-9M88 26c-2-6-8-10-14-9" stroke="#a9784a" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"></path>
      </g>
    </svg>
  `;

  let rootEl = null;
  let hitEl = null;
  let sleeping = false;
  let destroyed = false;
  const timers = new Set();

  function schedule(fn, minMs, maxMs) {
    const delay = minMs + Math.random() * (maxMs - minMs);
    const id = setTimeout(function () {
      timers.delete(id);
      fn();
    }, delay);
    timers.add(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
  }

  function blinkLoop() {
    if (destroyed || sleeping || !rootEl) return;
    const eyes = rootEl.querySelector('.sf-cat-eyes');
    if (eyes) {
      eyes.classList.add('is-blinking');
      setTimeout(function () { eyes && eyes.classList.remove('is-blinking'); }, 240);
    }
    schedule(blinkLoop, 2800, 6500);
  }

  function earTwitchLoop() {
    if (destroyed || sleeping || !rootEl) return;
    const ear = rootEl.querySelector(Math.random() < 0.5 ? '.sf-cat-ear-left' : '.sf-cat-ear-right');
    if (ear) {
      ear.classList.add('is-twitch');
      setTimeout(function () { ear && ear.classList.remove('is-twitch'); }, 520);
    }
    schedule(earTwitchLoop, 7000, 15000);
  }

  function autoPlayLoop() {
    if (destroyed || sleeping || !rootEl) return;
    playSwat();
    schedule(autoPlayLoop, 13000, 24000);
  }

  let playCooldown = false;
  function playSwat() {
    if (!rootEl || playCooldown) return;
    playCooldown = true;
    rootEl.classList.add('is-playing');
    setTimeout(function () {
      rootEl && rootEl.classList.remove('is-playing');
      playCooldown = false;
    }, 900);
  }

  function onActivate(e) {
    e.preventDefault();
    playSwat();
  }

  function build() {
    const el = document.createElement('div');
    el.className = 'sf-companion';
    el.innerHTML =
      '<button type="button" class="sf-companion__hit" aria-label="Play with the corner companion"></button>' +
      SVG_MARKUP;
    document.body.appendChild(el);

    const hit = el.querySelector('.sf-companion__hit');
    hit.addEventListener('click', onActivate);
    hit.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') onActivate(e);
    });

    rootEl = el;
    hitEl = hit;

    // Fade in on the next frame so the entrance transition actually runs.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('is-ready'); });
    });

    if (!REDUCED_MOTION) {
      schedule(blinkLoop, 1500, 3500);
      schedule(earTwitchLoop, 4000, 9000);
      schedule(autoPlayLoop, 9000, 16000);
    }
  }

  function teardown() {
    clearTimers();
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
    rootEl = null;
    hitEl = null;
  }

  function wireToggle() {
    const toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) return;
    toggle.checked = !isDisabled();
    toggle.addEventListener('change', function () {
      setDisabled(!toggle.checked);
      if (toggle.checked) {
        if (!rootEl && !REDUCED_MOTION) build();
      } else {
        teardown();
      }
    });
  }

  function init() {
    wireToggle();
    if (isDisabled() || REDUCED_MOTION) return;
    build();
  }

  window.addEventListener('sleepModeEntered', function () {
    sleeping = true;
    clearTimers();
    if (rootEl) rootEl.classList.add('is-sleeping');
  });

  window.addEventListener('sleepModeExited', function () {
    sleeping = false;
    if (!rootEl || isDisabled()) return;
    rootEl.classList.remove('is-sleeping');
    if (!REDUCED_MOTION) {
      schedule(blinkLoop, 1500, 3500);
      schedule(earTwitchLoop, 4000, 9000);
      schedule(autoPlayLoop, 9000, 16000);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
