// Service Worker - Caching for performance

const CACHE_NAME = 'studyflow-v1';
const STATIC_ASSETS = [
  './',
  './welcome.html',
  './index.html',
  './calendar.html',
  './settings.html',
  './assets/css/core.css',
  './assets/css/timer.css',
  './assets/css/calendar.css',
  './assets/css/settings.css',
  './assets/js/core.js',
  './assets/js/timer.js',
  './assets/js/calendar.js',
  './assets/js/settings.js',
  './assets/js/particles.js',
  './assets/images/frame.svg',
  './assets/images/clock-icon.svg',
  './assets/images/calendar-icon.svg',
  './assets/images/settings-icon.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Cache successful responses for future use
            if (fetchResponse.ok && event.request.method === 'GET') {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return fetchResponse;
          });
      })
      .catch(() => {
        // Offline fallback for HTML pages
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});