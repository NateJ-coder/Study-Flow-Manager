// StudyFlow Intro + Preloader (performance-tuned)
(() => {
  const WELCOME_URL = 'performance-build/assets/pages/welcome.html';
  const OVERLAY_MS = 600;           // match CSS --fade-ms
  const SAFETY_TIMEOUT_MS = 2500;   // faster: don't wait forever

  const bar  = document.querySelector('.progress .bar');
  const logo = document.getElementById('logo');

  // Gentle shimmer class removed to cut paint work during load.
  // Add pointer tilt for more "life" without heavy DOM.
  const applyTilt = (x, y) => {
    const rx = ((y / window.innerHeight) - 0.5) * -6; // -3..3deg
    const ry = ((x / window.innerWidth)  - 0.5) *  6; // -3..3deg
    document.documentElement.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    document.documentElement.style.setProperty('--ry', ry.toFixed(2) + 'deg');
  };
  window.addEventListener('pointermove', (e) => applyTilt(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerleave', () => applyTilt(window.innerWidth/2, window.innerHeight/2), { passive: true });

  const setProgress = (n) => {
    const pct = Math.max(0, Math.min(100, Math.round(n)));
    bar.style.width = pct + '%';
    bar.parentElement?.setAttribute('aria-valuenow', String(pct));
  };

  // Keep the preload list tight — just what the first fold needs
  const assets = [
    'performance-build/assets/images/optimized/studyflow-logo-768.webp',
    'performance-build/assets/css/welcome.css',
    'performance-build/assets/js/welcome.js',
  'performance-build/assets/pages/welcome.html'
  ];

  let loaded = 0;
  const bump = () => { loaded += 1; setProgress((loaded / assets.length) * 100); };

  const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve; img.onerror = reject;
    img.src = url; img.fetchPriority = 'high';
  });

  const preload = (url) => /\.(webp|png|jpg|jpeg|gif|avif|svg)(\?|$)/i.test(url)
    ? loadImage(url)
    : fetch(url, { cache: 'force-cache' }).then(r => { if (!r.ok) throw new Error('Preload failed: '+url); });

  const preloadAll = Promise.all(assets.map(u => preload(u).then(bump).catch((e)=>{console.warn(e); bump();})));
  const safety = new Promise((r) => setTimeout(r, SAFETY_TIMEOUT_MS));

  Promise.race([Promise.allSettled([preloadAll, safety])]).then(() => {
    setProgress(100);
    const overlay = document.getElementById('transition');
    overlay?.classList.add('show');
    setTimeout(() => window.location.replace(WELCOME_URL), OVERLAY_MS);
  });
})();
