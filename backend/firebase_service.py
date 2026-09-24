"""
Firebase Admin & Cloud Messaging Service
Handles server-side Firebase ID token verification (Phone Auth)
and Firebase Cloud Messaging (FCM) web push notifications.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from config import settings

logger = logging.getLogger("jeevan_firebase")
logger.setLevel(logging.INFO)

_firebase_initialized = False

def init_firebase() -> bool:
    """Initialize Firebase Admin SDK if credentials exist."""
    global _firebase_initialized
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Check if already initialized by another module
        if firebase_admin._apps:
            _firebase_initialized = True
            return True

        app_options = {}
        if settings.FIREBASE_PROJECT_ID:
            app_options["projectId"] = settings.FIREBASE_PROJECT_ID

        # --- Method 1: Inline JSON from environment variable (best for Render/cloud deployments) ---
        inline_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        if inline_json:
            try:
                # Try as raw JSON string first
                try:
                    service_account_dict = json.loads(inline_json)
                except json.JSONDecodeError:
                    # Try as base64-encoded JSON (alternative encoding)
                    import base64
                    service_account_dict = json.loads(base64.b64decode(inline_json).decode("utf-8"))

                cred = credentials.Certificate(service_account_dict)
                firebase_admin.initialize_app(cred, app_options or None)
                _firebase_initialized = True
                logger.info("[Firebase] Initialized Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT_JSON env variable")
                return True
            except Exception as json_err:
                logger.warning(f"[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {json_err}")

        # --- Method 2: Service account JSON file ---
        cred_path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
        # Check relative to backend directory if not absolute
        if not os.path.isabs(cred_path):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidate = os.path.join(base_dir, cred_path)
            if os.path.exists(candidate):
                cred_path = candidate

        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, app_options or None)
            _firebase_initialized = True
            logger.info(f"[Firebase] Initialized Firebase Admin SDK from file: {cred_path}")
            return True

        # --- Method 3: GOOGLE_APPLICATION_CREDENTIALS environment variable ---
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            firebase_admin.initialize_app()
            _firebase_initialized = True
            logger.info("[Firebase] Initialized Firebase Admin from GOOGLE_APPLICATION_CREDENTIALS")
            return True

        logger.warning(
            "[Firebase Note] No service account credentials found. "
            "Set FIREBASE_SERVICE_ACCOUNT_JSON (paste your service account JSON contents) "
            "in Render environment variables, or place 'firebase-service-account.json' in the backend directory."
        )
        return False
    except Exception as e:
        logger.warning(f"[Firebase Init Note] Could not initialize Firebase Admin SDK: {e}")
        return False

# Initialize on import
init_firebase()


def is_firebase_ready() -> bool:
    return _firebase_initialized


def verify_firebase_id_token(id_token: str) -> Tuple[bool, Optional[Dict[str, Any]], str]:
    """
    Verifies a Firebase ID token sent from the client.
    Returns: (is_valid, decoded_token_dict, error_or_detail_message)
    """
    if not id_token:
        return False, None, "ID token is empty."

    # In dev/mock testing without live credentials
    if id_token.startswith("dev_test_token_"):
        phone = id_token.replace("dev_test_token_", "")
        if not phone.startswith("+"):
            phone = f"+91{phone}"
        return True, {
            "uid": f"dev_user_{phone}",
            "phone_number": phone,
            "dev_mode": True
        }, "Verified via local dev simulation"

    if not _firebase_initialized:
        # Try initializing once more in case file was recently added
        if not init_firebase():
            return False, None, (
                "Firebase Admin is not configured on this server. "
                "Please place 'firebase-service-account.json' in backend directory."
            )

    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(id_token)
        return True, decoded, "Token verified successfully"
    except Exception as e:
        return False, None, f"Firebase token verification failed: {str(e)}"


def send_fcm_push(
    fcm_token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    icon: Optional[str] = "/favicon.ico"
) -> Tuple[bool, str]:
    """
    Sends a Web Push notification to an individual device via Firebase Cloud Messaging.
    """
    if not fcm_token:
        return False, "FCM token is empty"

    if not _firebase_initialized:
        if not init_firebase():
            logger.info(f"[SIMULATED FCM PUSH] To: {fcm_token[:15]}... | Title: {title} | Body: {body}")
            return True, "Simulated push notification dispatched (add firebase-service-account.json for live dispatch)"

    try:
        from firebase_admin import messaging

        # Ensure all data values are strings (required by FCM)
        string_data = {str(k): str(v) for k, v in (data or {}).items()}

        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon=icon or "/favicon.ico",
                    badge="/favicon.ico"
                ),
                fcm_options=messaging.WebpushFCMOptions(
                    link=string_data.get("click_action", "/")
                )
            ),
            data=string_data,
            token=fcm_token
        )

        response = messaging.send(message)
        logger.info(f"[Firebase FCM] Push delivered successfully to {fcm_token[:10]}... Message ID: {response}")
        return True, response
    except Exception as e:
        logger.error(f"[Firebase FCM Error] Failed to send push notification: {e}")
        return False, str(e)


def send_fcm_multicast(
    fcm_tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None
) -> Tuple[int, int]:
    """
    Sends a push notification to multiple device tokens.
    Returns: (success_count, failure_count)
    """
    clean_tokens = [t for t in fcm_tokens if t and isinstance(t, str)]
    if not clean_tokens:
        return 0, 0

    if not _firebase_initialized:
        if not init_firebase():
            logger.info(f"[SIMULATED FCM MULTICAST] {len(clean_tokens)} devices | Title: {title}")
            return len(clean_tokens), 0

    try:
        from firebase_admin import messaging

        string_data = {str(k): str(v) for k, v in (data or {}).items()}
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=string_data,
            tokens=clean_tokens
        )
        batch_response = messaging.send_each_for_multicast(message)
        return batch_response.success_count, batch_response.failure_count
    except Exception as e:
        logger.error(f"[Firebase FCM Multicast Error] {e}")
        return 0, len(clean_tokens)
