// src/utils/pushHelper.js
import BASE_URL from "../../backend/server/config";

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

// Subscribe the user and send to server
export async function subscribeUser(publicVapidKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push messaging is not supported.');
  }

  // ✅ Ensure the service worker is ready
  const registration = await navigator.serviceWorker.ready;

  // Subscribe user
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
  });

  const res = await fetch(`${BASE_URL}server/save-subscription.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  if (!res.ok) throw new Error('Failed to save subscription');
  return subscription;
}


// ✅ New: Unsubscribe the user
export async function unsubscribeUser() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;

    // Unsubscribe from browser push manager
    const successful = await subscription.unsubscribe();
    if (!successful) throw new Error('Unsubscribe failed in browser');

    // Notify your server to remove this subscription
    await fetch(`${BASE_URL}server/remove-subscription.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }), // only send endpoint to identify
    });

    return true;
  }

  return false; // no active subscription
}
