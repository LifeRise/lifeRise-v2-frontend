import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain: authDomain ?? undefined,
    projectId,
    messagingSenderId: messagingSenderId ?? undefined,
    appId,
  };
}

const config = getFirebaseConfig();

let firebaseApp: FirebaseApp | null = null;
if (config) {
  try {
    const existing = getApps().find(
      (a) => a.name === '[DEFAULT]' && a.options.projectId === config.projectId
    );
    firebaseApp = existing ?? initializeApp(config);
  } catch {
    // Browser extensions may initialize Firebase with bad config.
    // Swallow so push notifications gracefully degrade to no-op.
    firebaseApp = null;
  }
}

export { firebaseApp };
export const isFirebaseConfigured = !!firebaseApp;

/** Returns the Messaging instance or null when Firebase is not configured or the browser does not support FCM. */
export async function getFirebaseMessaging() {
  // Skip on server-side rendering
  if (typeof window === 'undefined') return null;
  if (!firebaseApp || !firebaseApp.options.projectId) return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
  } catch {
    return null;
  }
  try {
    return getMessaging(firebaseApp);
  } catch {
    return null;
  }
}
