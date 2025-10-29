// Simple PWA service worker for StudyFlow
const CACHE = 'sf-v1';
const STATIC_ASSETS = [
  '/Study-Flow-Manager/performance-build/assets/css/welcome.css',
  '/Study-Flow-Manager/performance-build/assets/css/timer.css',
  '/Study-Flow-Manager/performance-build/assets/css/calendar.css',
  '/Study-Flow-Manager/performance-build/assets/js/welcome.js',
  '/Study-Flow-Manager/performance-build/assets/js/timer.js',
  '/Study-Flow-Manager/performance-build/assets/js/calendar.js',
  '/Study-Flow-Manager/performance-build/assets/js/config.js',
  '/Study-Flow-Manager/performance-build/assets/images/welcome-page.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Do not interfere with non-GET requests or cross-origin requests
  try {
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== self.location.origin) {
      // For non-GET or cross-origin, just let the browser handle it normally
      return;
    }
  } catch (e) {
    // If URL parsing fails, don't attempt to cache - let default network behavior run
    return;
  }

  // HTML pages: network-first
  if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(req).then(res => {
        // Only cache full successful (200) responses
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => {
            try { c.put(req, copy); } catch (e) { /* swallow caching errors */ }
          });
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Other assets: cache-first
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      // Only cache full successful (200) responses from same-origin GETs
      try {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => { try { c.put(req, copy); } catch(e){} });
        }
      } catch(e) { /* ignore caching errors */ }
      return res;
    }).catch(() => caches.match(req)))
  );
});
