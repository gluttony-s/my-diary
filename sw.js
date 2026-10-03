const CACHE_NAME = 'diary-cache-v4'; 

// Файлы приложения для кэширования (работа офлайн)
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Активация и удаление устаревшего кэша
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

// Перехват сетевых запросов
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Важно: сторонние запросы (например, к API ИИ) пропускаем мимо кэша напрямую в сеть
  if (url.origin !== location.origin) {
    return;
  }

  // Для локальных файлов: сначала сеть, при сбое — кэш
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
