import os
import firebase_admin
from firebase_admin import credentials, messaging
import logging

logger = logging.getLogger(__name__)

# Path to the Firebase service account key file
_CRED_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase_credentials.json")

def init_firebase():
    """Initializes the Firebase Admin SDK from local credentials file."""
    if not firebase_admin._apps:
        if os.path.exists(_CRED_FILE):
            try:
                cred = credentials.Certificate(_CRED_FILE)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized successfully from file.")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        else:
            logger.warning(f"Firebase credentials file not found at {_CRED_FILE}. Push notifications disabled.")


async def send_push(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """Sends a push notification to a specific FCM token."""
    if not firebase_admin._apps:
        logger.warning("Firebase not initialized. Cannot send push notification.")
        return False
        
    if not fcm_token:
        return False

    if data is None:
        data = {}

    try:
        # FCM data payloads must contain string values only
        str_data = {str(k): str(v) for k, v in data.items()}
        
        message = messaging.Message(
            notification=messaging.Notification(
                title=title, 
                body=body
            ),
            data=str_data,
            token=fcm_token,
        )
        response = messaging.send(message)
        logger.info(f"Successfully sent FCM message: {response}")
        return True
    except Exception as e:
        logger.error(f"Push notification failed: {e}")
        return False
