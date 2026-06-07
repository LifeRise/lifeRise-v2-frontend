/*
  LifeRise Solutions — Service Worker
  Versioned cache strategy with automatic update support.
  Bump BUILD_ID below for each production release.
*/
const BUILD_ID = '20260529-001';
const CACHE_NAME = `liferise-${BUILD_ID}`;
const SHELL_ROUTES = [
  '/',
  '/login',
  '/offline',
  '/resident',
  '/resident/services',
  '/resident/bookings',
  '/resident/events',
  '/resident/favorites',
  '/resident/notifications',
  '/resident/profile',
  '/vendor',
  '/vendor/schedule',
  '/vendor/queue',
  '/vendor/earnings',
  '/vendor/services',
  '/vendor/profile',
  '/manager',
  '/manager/analytics',
  '/manager/residents',
  '/manager/vendors',
  '/manager/announcements',
  '/manager/settings',
];

const OFFLINE_FALLBACK = '/offline';

/* ─── Install ──────────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ROUTES))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate ─────────────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

/* ─── Messages from client ─────────────────────────────────────── */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ─── Fetch ────────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP schemes (chrome-extension, blob, data, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Skip API calls to the backend — never cache those
  if (url.hostname === 'localhost' && url.port === '8080') return;
  if (url.hostname === 'localhost' && url.port === '8081') return;
  if (url.hostname === 'localhost' && url.port === '8082') return;

  const isNavigation = request.mode === 'navigate';

  if (isNavigation) {
    // Network-first for HTML pages so updates are always visible
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cache with fresh shell
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Graceful offline fallback for uncached routes
            return caches.match(OFFLINE_FALLBACK).then((fallback) => {
              return (
                fallback ||
                new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
              );
            });
          });
        })
    );
  } else {
    // Cache-first for static assets (images, fonts, JS, CSS)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
  }
});

/* ─── Background Push Notifications ───────────────────────────── */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'LifeRise', body: event.data.text() };
  }

  const title = payload.notification?.title ?? payload.title ?? 'LifeRise';
  const options = {
    body: payload.notification?.body ?? payload.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data ?? {},
    tag: payload.data?.booking_id ?? 'liferise-general',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/resident';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
