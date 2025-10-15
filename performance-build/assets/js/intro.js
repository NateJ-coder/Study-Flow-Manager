// StudyFlow Intro + Preloader
// - Preloads welcome assets
// - Shows a lightweight progress bar
// - Smooth fade + redirect once ready (with a short safety timeout)

(() => {
  const WELCOME_URL = 'welcome.html';
  const OVERLAY_MS = 600;           // keep in sync with --fade-ms in CSS
  const SAFETY_TIMEOUT_MS = 4500;   // maximum time we’ll wait before continuing

  const bar = document.querySelector('.progress .bar');
  const logo = document.getElementById('logo');
  if (logo) logo.classList.add('shimmer');

  const assets = [
    'performance-build/assets/images/welcome-page.png',
    'performance-build/assets/css/welcome.css',
    'performance-build/assets/js/welcome.js',
    'welcome.html'
  ];

  let loaded = 0;
  const setProgress = (n) => {
    const pct = Math.max(0, Math.min(100, Math.round(n)));
    bar.style.width = pct + '%';
    bar.parentElement?.setAttribute('aria-valuenow', String(pct));
  };

  const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
    // give the browser a hint to cache aggressively
    img.decoding = 'async';
    img.fetchPriority = 'high';
  });

  const preload = (url) => {
    // Decide strategy by file type
    if (/\.(png|jpg|jpeg|webp|avif|gif|svg)(\?|$)/i.test(url)) {
      return loadImage(url);
    }
    // CSS/JS/HTML: do a fetch to warm the cache
    return fetch(url, { cache: 'force-cache' }).then(r => {
      // treat 200–299 as success
      if (!r.ok) throw new Error('Preload failed: ' + url);
    });
  };

  const bump = () => {
    loaded += 1;
    setProgress((loaded / assets.length) * 100);
  };

  const preloadAll = Promise.all(
    assets.map(u => preload(u).then(bump).catch((e) => { console.warn(e); bump(); }))
  );

  const safety = new Promise((resolve) => setTimeout(resolve, SAFETY_TIMEOUT_MS));

  Promise.race([Promise.allSettled([preloadAll, safety])]).then(() => {
    // brief hold so the bar can visually reach 100%
    setProgress(100);
    const overlay = document.getElementById('transition');
    overlay?.classList.add('show');
    setTimeout(() => {
      // Replace history so back button won't bounce to intro
      window.location.replace(WELCOME_URL);
    }, OVERLAY_MS);
  });
})();
