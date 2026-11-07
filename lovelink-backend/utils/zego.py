import json
import time
import random

def generate_zego_token(
    app_id: int,
    server_secret: str,
    user_id: str,
    room_id: str,
    expire_seconds: int = 3600
) -> str:
    try:
        from utils.zego_token import generate_token04

        # ZEGOCLOUD Token04 requires room privileges in payload
        # Key 1: Login room privilege (1 = Enable, 0 = Disable)
        # Key 2: Publish stream privilege (1 = Enable, 0 = Disable)
        payload_dict = {
            "room_id": str(room_id),
            "privilege": {
                1: 1,  # Enable login room
                2: 1   # Enable publish stream
            },
            "stream_id_list": None
        }
        payload_json = json.dumps(payload_dict)

        token_info = generate_token04(
            int(app_id),
            str(user_id),
            str(server_secret),
            expire_seconds,
            payload_json
        )
        if token_info.error_code != 0:
            raise Exception(f"Zego token generation failed: {token_info.error_message} (code {token_info.error_code})")
            
        return token_info.token
    except Exception as e:
        raise Exception(f"Failed to generate Zego token: {e}")
