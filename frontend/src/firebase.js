import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "" &&
    firebaseConfig.apiKey !== "YOUR_API_KEY"
  );
};

// Initialize Firebase App safely
let app = null;
let auth = null;

try {
  if (isFirebaseConfigured()) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } else {
    // Fallback stub app for development before keys are placed
    console.info(
      "[Firebase Note] Firebase keys not yet set in frontend/.env. " +
      "Add VITE_FIREBASE_API_KEY etc. to enable live SMS OTP & FCM push."
    );
  }
} catch (e) {
  console.warn("[Firebase Init Error]", e);
}

export { auth };

/**
 * Sets up invisible reCAPTCHA verifier for Phone Auth
 */
export const setupRecaptcha = (containerId = "firebase-recaptcha-container") => {
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Please verify your .env Firebase credentials.");
  }

  // Clear existing verifier if any
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (_) {
      // ignore clear error
    }
    window.recaptchaVerifier = null;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved automatically
    },
    "expired-callback": () => {
      console.warn("[reCAPTCHA Expired] Resetting verifier.");
    }
  });

  return window.recaptchaVerifier;
};

/**
 * Sends a real SMS OTP via Firebase Phone Auth
 * @param {string} rawPhone - 10-digit mobile number or E.164 string
 * @param {string} containerId - Element ID for reCAPTCHA widget
 * @returns {Promise<ConfirmationResult>}
 */
export const sendFirebasePhoneOtp = async (rawPhone, containerId = "firebase-recaptcha-container") => {
  if (!isFirebaseConfigured() || !auth) {
    throw new Error(
      "Firebase configuration missing. Please add VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc. in frontend/.env."
    );
  }

  const verifier = setupRecaptcha(containerId);
  const cleanDigits = String(rawPhone).replace(/\D/g, "");
  
  // Format to international E.164 format (Default +91 for India)
  const e164Phone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, e164Phone, verifier);
    window.confirmationResult = confirmationResult;
    return confirmationResult;
  } catch (err) {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (_) {}
      window.recaptchaVerifier = null;
    }
    throw err;
  }
};

/**
 * Requests browser push notification permission and registers FCM device token
 */
export const registerDevicePushToken = async ({ apiBase, sessionId = null, phone = null, role = "patient" }) => {
  if (!app) return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.info("[FCM] Push messaging is not supported in this browser environment.");
      return null;
    }

    if (!("Notification" in window)) {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.info("[FCM] Push notification permission was not granted:", permission);
      return null;
    }

    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

    const token = await getToken(messaging, { vapidKey });
    if (!token) {
      console.warn("[FCM] No registration token available.");
      return null;
    }

    // Save token to backend
    if (apiBase) {
      try {
        await fetch(`${apiBase}/api/notifications/register-device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fcm_token: token,
            session_id: sessionId,
            phone: phone,
            role: role,
            user_agent: navigator.userAgent
          })
        });
      } catch (err) {
        console.warn("[FCM] Failed to store token on backend:", err);
      }
    }

    return token;
  } catch (err) {
    console.warn("[FCM Token Error]", err);
    return null;
  }
};

/**
 * Listens for foreground push notifications when the tab is actively open
 */
export const listenToForegroundMessages = async (onMessageReceived) => {
  if (!app) return () => {};

  try {
    const supported = await isSupported();
    if (!supported) return () => {};

    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      if (onMessageReceived && typeof onMessageReceived === "function") {
        onMessageReceived(payload);
      }
    });
  } catch (err) {
    console.warn("[FCM Listener Error]", err);
    return () => {};
  }
};
