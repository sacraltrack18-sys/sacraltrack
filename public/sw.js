// Этот файл отключает сервис-воркер
self.addEventListener('install', function(e) {
  // Пропускаем фазу ожидания и сразу переходим к активации
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  // Удаляем все кеши, связанные с предыдущими сервис-воркерами
  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      // Отменяем регистрацию сервис-воркера
      return self.registration.unregister();
    })
  );
});
