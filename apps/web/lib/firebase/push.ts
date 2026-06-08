import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from './client';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Requests notification permission and returns the FCM registration token,
 * or null if the user denies or the browser is unsupported.
 */
export async function requestPushToken(): Promise<string | null> {
  // Skip on server-side rendering
  if (typeof window === 'undefined') return null;

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.ready;
    return await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch {
    return null;
  }
}
