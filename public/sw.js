// public/sw.js

self.addEventListener('push', function (event) {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/logo/logo3.png',
    badge: '/logo/logo3.png',
    sound: '/sounds/notification.wav',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
      url: data.url 
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Listener 'notificationclick' yang sudah diperbaiki
self.addEventListener('notificationclick', function(event) {
  const targetPath = event.notification.data.url;
  event.notification.close();

  // Buat URL lengkap (misal: http://localhost:3000/queue/3)
  const fullUrl = self.location.origin + targetPath;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Cari tab yang sudah terbuka dengan URL yang sama persis
      for (const client of clientList) {
        if (client.url === fullUrl && 'focus' in client) {
          // Jika ditemukan, fokus ke tab tersebut dan hentikan proses.
          return client.focus();
        }
      }
      // Jika tidak ada tab yang sama persis yang ditemukan, buka tab baru.
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
