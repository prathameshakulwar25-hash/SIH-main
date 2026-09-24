/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications when the Jeevan OPD tab is closed or in background.
 */

importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// Initialize Firebase in Service Worker
// In production, these can match your web app configuration
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Background message received:", payload);

    const title = payload.notification?.title || payload.data?.title || "Jeevan Health Alert";
    const body = payload.notification?.body || payload.data?.body || "Your clinical summary or report has been updated.";
    const clickUrl = payload.data?.click_action || payload.fcmOptions?.link || "/";

    const options = {
      body: body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: clickUrl
      }
    };

    self.registration.showNotification(title, options);
  });
} catch (e) {
  console.warn("[FCM Service Worker] Init note:", e);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
