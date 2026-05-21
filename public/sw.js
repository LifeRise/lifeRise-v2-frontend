/*
  LifeRise Solutions — Service Worker
  Versioned cache strategy with automatic update support.
  Bump BUILD_ID below for each production release.
*/
const BUILD_ID = "20260521-002";
const CACHE_NAME = `liferise-${BUILD_ID}`;
const SHELL_ROUTES = [
  "/",
  "/login",
  "/offline",
  "/resident",
  "/resident/services",
  "/resident/bookings",
  "/resident/events",
  "/resident/favorites",
  "/resident/notifications",
  "/resident/profile",
  "/vendor",
  "/vendor/schedule",
  "/vendor/queue",
  "/vendor/earnings",
  "/vendor/services",
  "/vendor/profile",
  "/manager",
  "/manager/analytics",
  "/manager/residents",
  "/manager/vendors",
  "/manager/announcements",
  "/manager/settings",
];

const OFFLINE_FALLBACK = "/offline";

/* ─── Install ──────────────────────────────────────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ROUTES))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate ─────────────────────────────────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ─── Messages from client ─────────────────────────────────────── */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ─── Fetch ────────────────────────────────────────────────────── */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const { request } = event;
  const isNavigation = request.mode === "navigate";

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
              return fallback || new Response("Offline", { status: 503, statusText: "Service Unavailable" });
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
