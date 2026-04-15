const CACHE_NAME = 'shopping-list-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './firebase-config.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Patrick+Hand&display=swap'
];

// Install: pré-carregar assets no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: limpar caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Firebase vai direto para a rede; o resto usa cache
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Nunca interceptar chamadas Firebase (banco de dados em tempo real)
  if (
    url.includes('firebaseio.com') ||
    url.includes('firebasejs') ||
    url.includes('firebase.googleapis.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para todo o resto: cache primeiro, rede como fallback
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
