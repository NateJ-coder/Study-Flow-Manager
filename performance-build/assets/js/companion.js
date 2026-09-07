// StudyFlow Corner Companion
// A small, self-contained, purely decorative cat + yarn-ball animation
// that sits in the bottom-left corner. It:
//   - never blocks clicks/taps outside its own small hit-area
//   - respects prefers-reduced-motion (renders nothing if set)
//   - can be turned off from Settings ("Corner cat companion") and
//     remembers that choice (localStorage, shared across pages)
//   - hides itself during Sleep Mode and reappears when the app wakes
//   - has no external dependencies (works even if GSAP fails to load)
(function () {
  const DISABLE_KEY = 'sf_companion_disabled';
  const TOGGLE_ID = 'enable-corner-cat';

  function prefersReducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  function isDisabled() {
    try { return localStorage.getItem(DISABLE_KEY) === '1'; }
    catch (e) { return false; }
  }

  function setDisabled(disabled) {
    try {
      if (disabled) localStorage.setItem(DISABLE_KEY, '1');
      else localStorage.removeItem(DISABLE_KEY);
    } catch (e) { /* localStorage unavailable — ignore, feature just won't persist */ }
  }

  const REDUCED_MOTION = prefersReducedMotion();

  const SVG_MARKUP = `
    <svg viewBox="0 0 132 108" role="img" aria-label="A little cat napping and playing with a ball of yarn">
      <g class="sf-yarn">
        <circle cx="100" cy="82" r="15" fill="#3a8f82" opacity="0.95"></circle>
        <path d="M87 82c8-9 20-9 27 0" fill="none" stroke="#bff2e8" stroke-width="1.4" opacity="0.8"></path>
        <path d="M86 86c9 6 20 6 29 0" fill="none" stroke="#bff2e8" stroke-width="1.4" opacity="0.8"></path>
        <path d="M89 72c5 10 5 18 0 24" fill="none" stroke="#bff2e8" stroke-width="1.4" opacity="0.6"></path>
        <path d="M111 72c-5 10-5 18 0 24" fill="none" stroke="#bff2e8" stroke-width="1.4" opacity="0.6"></path>
      </g>
      <g class="sf-cat-tail">
        <path d="M24 88c-14-2-20-16-11-27" fill="none" stroke="#c88a52" stroke-width="9" stroke-linecap="round"></path>
      </g>
      <g class="sf-cat-body">
        <ellipse cx="46" cy="76" rx="30" ry="23" fill="#d9a066"></ellipse>
        <ellipse cx="46" cy="86" rx="17" ry="10" fill="#f4dcb4"></ellipse>
        <g class="sf-cat-paw">
          <ellipse cx="66" cy="83" rx="9" ry="7" fill="#d9a066"></ellipse>
        </g>
        <circle cx="42" cy="40" r="21" fill="#d9a066"></circle>
        <g class="sf-cat-ear-left">
          <polygon points="26,30 33,10 41,28" fill="#d9a066"></polygon>
          <polygon points="29,27 33,15 38,26" fill="#f2b7a3"></polygon>
        </g>
        <g class="sf-cat-ear-right">
          <polygon points="46,26 54,9 61,29" fill="#d9a066"></polygon>
          <polygon points="49,25 54,14 58,27" fill="#f2b7a3"></polygon>
        </g>
        <ellipse cx="42" cy="48" rx="12" ry="9" fill="#f4dcb4"></ellipse>
        <g class="sf-cat-eyes">
          <ellipse class="sf-cat-eye" cx="35" cy="40" rx="2.4" ry="3" fill="#2a2016"></ellipse>
          <ellipse class="sf-cat-eye" cx="49" cy="40" rx="2.4" ry="3" fill="#2a2016"></ellipse>
        </g>
        <polygon points="42,45 39,48 45,48" fill="#e8879a"></polygon>
        <path d="M30 48c-6 1-10 3-13 6M54 48c6 1 10 3 13 6M30 51c-6 2-10 5-12 8M54 51c6 2 10 5 12 8"
              stroke="#5a4331" stroke-width="0.7" fill="none" opacity="0.55" stroke-linecap="round"></path>
        <path d="M20 26c2-6 8-10 14-9M64 26c-2-6-8-10-14-9" stroke="#a9784a" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"></path>
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
      '<button type="button" class="sf-companion__hit" aria-label="Play with the corner cat"></button>' +
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
