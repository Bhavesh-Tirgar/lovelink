import time
import secrets
from typing import Optional, Dict

# In-memory ticket store: { ticket_str: {"user_id": str, "expires_at": float} }
_TICKET_STORE: Dict[str, dict] = {}

def create_ws_ticket(user_id: str, ttl_seconds: int = 30) -> str:
    """Generate a high-entropy single-use ticket valid for ttl_seconds."""
    now = time.time()
    # Clean up expired tickets to avoid memory leakage
    expired = [t for t, data in _TICKET_STORE.items() if data["expires_at"] < now]
    for t in expired:
        _TICKET_STORE.pop(t, None)

    ticket = f"wstk_{secrets.token_urlsafe(32)}"
    _TICKET_STORE[ticket] = {
        "user_id": str(user_id),
        "expires_at": now + ttl_seconds
    }
    return ticket

def verify_and_consume_ws_ticket(ticket: str) -> Optional[str]:
    """Verify and immediately burn a single-use ticket. Returns user_id if valid, else None."""
    now = time.time()
    data = _TICKET_STORE.pop(ticket, None)
    if not data:
        return None
    if data["expires_at"] < now:
        return None
    return data["user_id"]
