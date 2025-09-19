// service-worker.js
const CACHE_NAME = 'jvmr-cache-v3'; // bump this to bust old caches

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        '/',            // app shell
        '/index.html',
        '/manifest.json'
      ])
    )
  );
});

// Network-first for API; cache-first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls — always go to the network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // App shell & static files
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

// Optional: clean up old caches when activating new SW
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
});
