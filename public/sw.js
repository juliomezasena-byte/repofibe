const CACHE_NAME = 'cryptic-trainer-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/profiles/amadeus/commands_meta.json',
  '/profiles/amadeus/flights.json',
  '/profiles/amadeus/scenarios.json',
  '/profiles/amadeus/locations.json',
  '/profiles/amadeus/equipment.json',
  '/profiles/amadeus/curriculum.json'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia network-first: online siempre se sirve lo más reciente
// (y se refresca el caché); el caché solo responde cuando no hay red.
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;

  evt.respondWith(
    fetch(evt.request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(evt.request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(evt.request))
  );
});
