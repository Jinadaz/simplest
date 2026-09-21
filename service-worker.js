const CACHE_NAME = 'simplest-v1-cache';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/responsive.css',
  './js/config.js',
  './js/auth.js',
  './js/db.js',
  './js/app.js',
  './js/utils/formatters.js',
  './js/utils/imageCompressor.js',
  './js/utils/whatsapp.js',
  './js/views/dashboard.js',
  './js/views/menu.js',
  './js/views/contacts.js',
  './js/views/orders.js',
  './js/views/kitchen.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests for local static assets
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip Firebase network API calls from service worker cache
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset, fetch fresh version in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* ignore offline error */});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
