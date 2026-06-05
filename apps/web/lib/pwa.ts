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

/* ─── Engagement Milestones for install prompt gating ─────────── */

const MILESTONES_KEY = "liferise_engagement_milestones";

export interface EngagementMilestones {
  pagesVisited: string[];
  actionsCompleted: string[];
  sessions: number;
  firstSessionAt: number | null;
}

function getMilestones(): EngagementMilestones {
  if (typeof window === "undefined") {
    return { pagesVisited: [], actionsCompleted: [], sessions: 0, firstSessionAt: null };
  }
  try {
    const raw = localStorage.getItem(MILESTONES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return { pagesVisited: [], actionsCompleted: [], sessions: 0, firstSessionAt: null };
}

function setMilestones(m: EngagementMilestones) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MILESTONES_KEY, JSON.stringify(m));
}

/** Track a page visit (deduplicated) */
export function trackPageVisit(path: string) {
  const m = getMilestones();
  if (!m.pagesVisited.includes(path)) {
    m.pagesVisited.push(path);
  }
  // Session tracking: if first visit or >30min since last activity, count as new session
  const now = Date.now();
  if (!m.firstSessionAt || now - m.firstSessionAt > 30 * 60 * 1000) {
    m.sessions += 1;
    m.firstSessionAt = now;
  }
  setMilestones(m);
}

/** Track a primary action (booking, go online, view analytics, etc.) */
export function trackAction(action: string) {
  const m = getMilestones();
  if (!m.actionsCompleted.includes(action)) {
    m.actionsCompleted.push(action);
  }
  setMilestones(m);
}

/**
 * Whether the user has crossed engagement thresholds that justify
 * showing the install prompt:
 *  - visited >2 distinct sub-pages, OR
 *  - completed at least 1 primary action, OR
 *  - returned for a 2nd+ session
 */
export function hasEngagementForInstall(): boolean {
  const m = getMilestones();
  return (
    m.pagesVisited.length > 2 ||
    m.actionsCompleted.length >= 1 ||
    m.sessions >= 2
  );
}
