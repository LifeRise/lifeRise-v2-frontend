/* ─── PWA Types & Helpers ──────────────────────────────────────── */

/** True if the app is running in standalone / installed mode */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS standalone property
    window.navigator.standalone === true
  );
}

/**
 * True when we are running in a browser context where the
 * beforeinstallprompt event CAN fire.
 *
 * NOTE: `"BeforeInstallPromptEvent" in window` is always false — Chrome
 * never exposes that constructor globally. The only reliable check is
 * whether we are on the client at all; the event listener itself will
 * simply never fire on non-supporting browsers (Safari, Firefox).
 */
export function canInstall(): boolean {
  return typeof window !== "undefined";
}

/** Send a message to the active service worker */
export async function sendMessageToSW(type: string, payload?: Record<string, unknown>) {
  const { serviceWorker } = navigator;
  if (!serviceWorker?.controller) return;
  serviceWorker.controller.postMessage({ type, ...payload });
}

/** Tell the waiting SW to skip waiting and activate */
export async function skipWaiting() {
  await sendMessageToSW("SKIP_WAITING");
}

/** Local-storage key for tracking prompt dismissal */
export const INSTALL_DISMISSED_KEY = "liferise_install_dismissed_at";

/** Days to wait before showing the install prompt again */
export const INSTALL_COOLDOWN_DAYS = 7;

export function wasInstallPromptDismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(INSTALL_DISMISSED_KEY);
  if (!raw) return false;
  const dismissedAt = parseInt(raw, 10);
  const cooldownMs = INSTALL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt < cooldownMs;
}

export function dismissInstallPrompt() {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
}
