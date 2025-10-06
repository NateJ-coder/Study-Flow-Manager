// StudyFlow Service Worker - Basic caching for performance
const CACHE_NAME = 'studyflow-v1';
const CRITICAL_ASSETS = [
  'index.html',
  'calendar.html',
  'assets/css/style.css',
  'assets/css/wooden-buttons.css',
  'assets/css/calendar-page.css',
  'assets/js/core.js',
  'assets/js/core-modern.js',
  'assets/js/timer-module.js',
  'assets/js/animation-frame.js',
  'assets/images/frame.svg',
  'assets/images/summer-day-6.png',
  'assets/images/clock-icon.svg',
  'assets/images/settings-icon.svg',
  'assets/images/calendar-icon.svg'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .catch((error) => {
        console.warn('[SW] Failed to cache some assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Don't cache non-successful responses
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // Cache successful responses for future use
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
              
            return fetchResponse;
          });
      })
      .catch(() => {
        // Fallback for offline scenarios
        if (event.request.destination === 'document') {
          return caches.match('index.html');
        }
      })
  );
});