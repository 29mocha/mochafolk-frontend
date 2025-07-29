// public/sw.js
console.log('MochaFolk Service Worker loaded');

// Handle push notifications
self.addEventListener('push', function (event) {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  const data = event.data.json();
  console.log('Push data:', data);
  
  const options = {
    body: data.body,
    icon: '/logo/logo3.png',
    badge: '/logo/logo3.png',
    // PENTING: 'sound' property tidak didukung di web push notifications
    // Suara akan dihandle melalui postMessage ke client
    vibrate: [300, 100, 400, 100, 300], // Pola vibrasi yang lebih jelas
    requireInteraction: true, // Notification tidak hilang otomatis
    tag: 'mochafolk-queue', // Tag untuk menggroupkan notifikasi
    renotify: true, // Jika ada notifikasi dengan tag sama, replace dan notify lagi
    actions: [
      {
        action: 'view',
        title: '👀 Lihat Antrian'
      },
      {
        action: 'dismiss',
        title: '❌ Tutup'
      }
    ],
    data: {
      url: data.url,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    Promise.all([
      // Tampilkan notification
      self.registration.showNotification(data.title, options),
      // Kirim pesan ke semua client aktif untuk putar suara
      notifyClientsToPlaySound()
    ])
  );
});

// Fungsi untuk memberitahu client aktif agar putar suara
function notifyClientsToPlaySound() {
  return self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window'
  }).then(clients => {
    console.log(`Sending sound notification to ${clients.length} clients`);
    
    clients.forEach(client => {
      client.postMessage({
        type: 'PLAY_NOTIFICATION_SOUND',
        timestamp: Date.now()
      });
    });
    
    return Promise.resolve();
  });
}

// Handle notification click dengan action support
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();
  
  // Handle different actions
  if (event.action === 'dismiss') {
    console.log('Notification dismissed by user');
    return;
  }
  
  // Default action atau 'view' action
  const targetPath = event.notification.data.url;
  const fullUrl = self.location.origin + targetPath;
  
  console.log('Opening URL:', fullUrl);
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      console.log(`Found ${clientList.length} open tabs`);
      
      // Cari tab yang sudah terbuka dengan URL yang cocok
      for (const client of clientList) {
        // Check if URL contains the queue path (more flexible matching)
        if (client.url.includes('/queue/') && client.url.includes(targetPath.split('/')[2])) {
          console.log('Found matching tab, focusing...');
          return client.focus();
        }
      }
      
      // Jika tidak ada tab yang cocok, buka tab baru
      console.log('No matching tab found, opening new window...');
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    }).catch(error => {
      console.error('Error handling notification click:', error);
    })
  );
});

// Handle background sync (untuk future enhancement)
self.addEventListener('sync', function(event) {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'queue-check') {
    event.waitUntil(checkQueueStatus());
  }
});

// Future enhancement: Check queue status in background
function checkQueueStatus() {
  // Implementasi future untuk cek status antrian secara background
  return Promise.resolve();
}

// Handle service worker installation
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  // Skip waiting untuk langsung activate
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    // Claim all clients untuk langsung kontrol semua tab
    self.clients.claim().then(() => {
      console.log('Service Worker activated and claimed all clients');
    })
  );
});

// Handle messages dari client (untuk debugging atau commands)
self.addEventListener('message', function(event) {
  console.log('Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});