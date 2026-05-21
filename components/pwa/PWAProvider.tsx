"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  isStandalone,
  canInstall,
  skipWaiting,
  wasInstallPromptDismissedRecently,
} from "@/lib/pwa";

interface PWAContextValue {
  /** The deferred beforeinstallprompt event, if captured */
  deferredPrompt: Event | null;
  /** Whether the browser supports installation AND the prompt hasn't been dismissed */
  canShowInstall: boolean;
  /** Whether the app is already installed (standalone) */
  isInstalled: boolean;
  /** Trigger the native install dialog */
  triggerInstall: () => Promise<void>;
  /** Dismiss the install prompt */
  dismissInstall: () => void;
  /** Whether a new service worker is waiting */
  updateAvailable: boolean;
  /** Accept the waiting update and reload */
  acceptUpdate: () => void;
}

const PWAContext = createContext<PWAContextValue | null>(null);

export function usePWA() {
  const ctx = useContext(PWAContext);
  if (!ctx) throw new Error("usePWA must be used within PWAProvider");
  return ctx;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandalone());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(() => wasInstallPromptDismissedRecently());
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  /* ── Detect installed state ─────────────────────────────────── */
  useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  /* ── Capture beforeinstallprompt ────────────────────────────── */
  useEffect(() => {
    if (!canInstall()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  /* ── Service Worker registration & update detection ─────────── */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const onControllerChange = () => {
      // A new service worker has taken control.
      // We NO LONGER auto-reload here — the user must explicitly tap
      // "Update" in the UpdateToast to avoid wiping mid-workflow state.
    };

    const checkForUpdates = () => {
      if (!registration) return;
      registration.update().catch(() => {
        // Silently fail if offline
      });
    };

    const listenForWaiting = (reg: ServiceWorkerRegistration) => {
      // If there's already a waiting SW, show update
      if (reg.waiting) {
        waitingWorkerRef.current = reg.waiting;
        setUpdateAvailable(true);
      }

      // Listen for new installations that go into waiting
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version waiting
            waitingWorkerRef.current = newWorker;
            setUpdateAvailable(true);
          }
        });
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        listenForWaiting(reg);

        // Check for updates on load and when navigating
        checkForUpdates();
        window.addEventListener("focus", checkForUpdates);
      })
      .catch(() => {
        // SW registration failed (e.g. in dev mode without HTTPS)
      });

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("focus", checkForUpdates);
    };
  }, []);

  /* ── Actions ────────────────────────────────────────────────── */
  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    // prompt() returns a Promise<{outcome, platform}> in Chrome 76+
    // @ts-expect-error BeforeInstallPromptEvent API not in TS lib
    const { outcome } = await deferredPrompt.prompt();
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    setDeferredPrompt(null);
    setDismissed(true);
    import("@/lib/pwa").then(({ dismissInstallPrompt }) => dismissInstallPrompt());
  }, []);

  const acceptUpdate = useCallback(() => {
    setUpdateAvailable(false);
    skipWaiting();
    // Reload only when the user explicitly accepts the update.
    // This prevents data loss during mid-workflow interactions.
    window.location.reload();
  }, []);

  const canShowInstall =
    Boolean(deferredPrompt) &&
    !isInstalled &&
    !dismissed &&
    canInstall();

  return (
    <PWAContext.Provider
      value={{
        deferredPrompt,
        canShowInstall,
        isInstalled,
        triggerInstall,
        dismissInstall,
        updateAvailable,
        acceptUpdate,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}
