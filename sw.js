const CACHE_NAME = 'diary-cache-v1'; 

// Файлы, которые будут скачаны для работы без интернета
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.png'
];

// Установка
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Активация и удаление старого кэша (важно при смене версии)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
// Перехват запросов (кэшируем только свои файлы, API OpenRouter не трогаем)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Если это запрос к стороннему API (например, OpenRouter), пропускаем его мимо кэша
  if (url.origin !== location.origin) {
    return;
  }

  // Для файлов приложения: сначала сеть, при сбое — кэш
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
