// LabourBook Production Service Worker (PWA + Offline Cache + Push Reminders + Background Sync)
const CACHE_NAME = 'labourbook-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/ic_app_logo.png',
  '/ic_launcher_foreground_img.png'
];

// 1. Install Event (Pre-cache static assets)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event (Clean up old cache versions)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event (Offline-First with Network Fallback)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET requests or Firebase API calls
  if (request.method !== 'GET' || request.url.includes('firestore.googleapis.com') || request.url.includes('identitytoolkit')) {
    return;
  }

  // Network-First with Cache Fallback for HTML documents, Stale-While-Revalidate for static assets
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        return caches.match('/index.html');
      });
    })
  );
});

// 4. Background Sync Support
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-labourbook-data') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGER' });
        });
      })
    );
  }
});

// 5. Periodic Background Sync Support
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'attendance-reminder-sync') {
    event.waitUntil(
      self.registration.showNotification('LabourBook Reminder', {
        body: 'Daily Attendance Reminder: Mark attendance for your staff ⏰',
        icon: '/ic_app_logo.png',
        badge: '/ic_app_logo.png',
        data: { url: '/' }
      })
    );
  }
});

// 6. Push Notifications Support (FCM)
self.addEventListener('push', (event) => {
  let data = {
    title: 'LabourBook Reminder',
    body: 'Attendance ka time hai! ⏰',
    icon: '/ic_app_logo.png'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/ic_app_logo.png',
    badge: '/ic_app_logo.png',
    vibrate: [200, 100, 200],
    data: { url: '/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 7. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
