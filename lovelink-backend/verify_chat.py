import asyncio
import httpx
from jose import jwt
import websockets

from database import AsyncSessionLocal
from models.user import User
from sqlalchemy import select

async def get_otp_for_email(email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        return user.otp_code

async def authenticate(client, email, name):
    base_url = "http://localhost:8000"
    print(f"\n--- Authenticating {email} ---")
    ret = await client.post(f"{base_url}/auth/login", json={"identifier": email})
    
    if ret.status_code == 404:
        print(f"User {email} not found. Signing up...")
        ret = await client.post(f"{base_url}/auth/signup", json={"email": email, "name": name, "city": "Mumbai", "timezone": "Asia/Kolkata"})
        print("Signup:", ret.json())
    elif ret.status_code != 200:
        ret = await client.post(f"{base_url}/auth/signup", json={"email": email, "name": name, "city": "Mumbai", "timezone": "Asia/Kolkata"})
        print("Fallback Signup:", ret.json())
    else:
        print("Login OTP generated.")

    # Get OTP from DB
    otp = await get_otp_for_email(email)
    print(f"Fetched OTP from DB for {email}: {otp}")
    
    # Verify OTP
    ret = await client.post(f"{base_url}/auth/verify-otp", json={"identifier": email, "otp": otp})
    if ret.status_code != 200:
        ret = await client.post(f"{base_url}/auth/login-verify-otp", json={"identifier": email, "otp": otp})
        
    data = ret.json()
    token = data["access_token"]
    print(f"Successfully authenticated {email}. Token received.")
    return token

async def link_couple(client, token_a, token_b):
    base_url = "http://localhost:8000"
    print("\n--- Linking Couple ---")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # Generate code for A
    ret = await client.post(f"{base_url}/couples/generate-invite", headers=headers_a)
    if ret.status_code == 400 and "already linked" in ret.text:
        print("Already linked!")
        r = await client.get(f"{base_url}/auth/me", headers=headers_a)
        return r.json()["couple_id"]
        
    invite_code = ret.json().get("invite_code")
    print(f"Generated invite code mapping for User A: {invite_code}")
    
    # B joins
    ret = await client.post(f"{base_url}/couples/join", headers=headers_b, json={"invite_code": invite_code})
    print("User B Join response:", ret.json())
    if "couple_id" in ret.json():
        return ret.json()["couple_id"]
    elif "already linked" in ret.text:
        r = await client.get(f"{base_url}/auth/me", headers=headers_a)
        return r.json()["couple_id"]

async def test_websocket_chat(client, couple_id, token_a, token_b):
    print("\n--- Testing WebSocket Chat ---")
    ws_url_a = f"ws://localhost:8000/chat/{couple_id}?token={token_a}"
    ws_url_b = f"ws://localhost:8000/chat/{couple_id}?token={token_b}"
    
    try:
        async with websockets.connect(ws_url_a) as ws_a, websockets.connect(ws_url_b) as ws_b:
            # Read 'connected' messages
            print("WS A:", await ws_a.recv())
            print("WS B:", await ws_b.recv())
            
            # A sends a message via REST
            print("User A sending REST message...")
            req = await client.post("http://localhost:8000/chat/messages", 
                                headers={"Authorization": f"Bearer {token_a}"},
                                json={"text": "Hello User B! Testing Neon integration.", "message_type": "text"})
            print("REST Response:", req.json())
            
            # B should receive it via WS
            b_recv = await ws_b.recv()
            print("WS B Received:", b_recv)
            
            print("\n✅ Real-Time Chat is WORKING flawlessly! 🚀")
            return "SUCCESS"
    except Exception as e:
        print("WebSocket Test Failed:", e)
        return "FAILED"

async def main():
    email_a = "pytest_neon_account_1@example.com"
    email_b = "pytest_neon_account_2@example.com"
    
    async with httpx.AsyncClient(timeout=None) as client:
        token_a = await authenticate(client, email_a, "Bhavesh 1")
        token_b = await authenticate(client, email_b, "Bhavesh 2")
        
        couple_id = await link_couple(client, token_a, token_b)
        print(f"Couple ID: {couple_id}")
        
        res = await test_websocket_chat(client, couple_id, token_a, token_b)
        if res == "SUCCESS":
            with open("test_result.txt", "w") as f:
                f.write(res)

if __name__ == "__main__":
    asyncio.run(main())
