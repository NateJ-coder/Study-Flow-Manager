// StudyFlow living-scene overlay — injects the soft day/night light glow
// (see scene.css) behind the timer/calendar background art. Self-contained,
// no dependencies, safe no-op if #bg-container isn't on the page.
(function () {
  function isNight() {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  }

  function init() {
    const host = document.getElementById('bg-container');
    if (!host) return;

    const glow = document.createElement('div');
    glow.className = 'sf-scene-glow ' + (isNight() ? 'sf-scene-glow--night' : 'sf-scene-glow--day');
    glow.setAttribute('aria-hidden', 'true');
    host.appendChild(glow);

    // Re-check every few minutes in case a session spans the day/night
    // boundary (or the very rare case it's left open for hours).
    setInterval(function () {
      glow.className = 'sf-scene-glow ' + (isNight() ? 'sf-scene-glow--night' : 'sf-scene-glow--day');
    }, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
