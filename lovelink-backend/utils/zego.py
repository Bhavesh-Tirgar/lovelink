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
        # token04.py returns a TokenInfo object
        token_info = generate_token04(
            int(app_id),
            user_id,
            server_secret,
            expire_seconds,
            ""  # optional payload
        )
        if token_info.error_code != 0:
            raise Exception(f"Zego token generation failed: {token_info.error_message}")
            
        return token_info.token
    except Exception as e:
        raise Exception(f"Failed to generate Zego token: {e}")
