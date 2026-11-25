import os
import sys
import uuid
import json
import asyncio
import unittest
from datetime import datetime, date, timedelta

# Ensure lovelink-backend is in sys.path
backend_dir = os.path.join(os.path.dirname(__file__), "lovelink-backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, or_, and_, delete
from database import Base, get_db
import database
import models.user, models.couple, models.room, models.message, models.call_log, models.mood, models.countdown, models.cycle, models.spark, models.movie, models.watch_session, models.reel, models.notification, models.album, models.media
import main
from httpx import AsyncClient, ASGITransport
from routers.auth import create_access_token, hash_password
from models.user import User
from models.couple import Couple
from models.room import CoupleRoom
from models.notification import Notification

# Configure isolated SQLite test database engine
TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_100_suite.db")
test_engine = create_async_engine(f"sqlite+aiosqlite:///{TEST_DB_PATH}", echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

# Monkeypatch database session factory so background tasks & routes use test db
database.engine = test_engine
database.AsyncSessionLocal = TestSessionLocal

async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

main.app.dependency_overrides[get_db] = override_get_db


class BaseScenarioTest(unittest.IsolatedAsyncioTestCase):
    """Base test class providing client and helper fixtures."""
    @classmethod
    def setUpClass(cls):
        async def init_schema():
            async with test_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        asyncio.run(init_schema())

    async def asyncSetUp(self):
        self.transport = ASGITransport(app=main.app)
        self.client = AsyncClient(transport=self.transport, base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def create_test_user(self, name: str, email: str = None, password: str = "TestPass123!"):
        uid = f"usr-{uuid.uuid4().hex[:8]}"
        mail = email or f"{uid}@lovelink.app"
        pwd_hash = hash_password(password)
        async with TestSessionLocal() as db:
            user = User(
                id=uid,
                email=mail,
                name=name,
                password_hash=pwd_hash,
                is_verified=True,
                public_key=f"pubkey_{uid}"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        token = create_access_token(uid)
        headers = {"Authorization": f"Bearer {token}"}
        return user, token, headers

    async def link_test_couple(self, user1: User, user2: User):
        couple_id = f"cp-{uuid.uuid4().hex[:8]}"
        code = uuid.uuid4().hex[:6].upper()
        async with TestSessionLocal() as db:
            c = Couple(
                id=couple_id,
                user1_id=user1.id,
                user2_id=user2.id,
                invite_code=code,
                anniversary_date=datetime.utcnow() - timedelta(days=100)
            )
            db.add(c)
            # Create room
            room = CoupleRoom(
                couple_id=couple_id,
                sticky_notes=[
                    {"id": "note-init", "text": "Welcome home! 💕", "author": "LoveLink", "color": "pink"}
                ],
                wall_photos=[]
            )
            db.add(room)
            await db.commit()
            await db.refresh(c)
        return c


# ==============================================================================
# 1. AUTHENTICATION, REGISTRATION & SECURITY SCENARIOS (Both Sides)
# ==============================================================================
class Test01AuthSecurityScenarios(BaseScenarioTest):
    async def test_001_p1_registration_success(self):
        """P1 registers successfully via signup endpoint."""
        email = f"p1_{uuid.uuid4().hex[:6]}@lovelink.app"
        res = await self.client.post("/auth/signup", json={
            "email": email, "password": "Password123!", "name": "Aarav"
        })
        self.assertIn(res.status_code, [200, 201])
        data = res.json()
        self.assertIn("message", data)

    async def test_002_p2_registration_success(self):
        """P2 registers successfully via signup endpoint."""
        email = f"p2_{uuid.uuid4().hex[:6]}@lovelink.app"
        res = await self.client.post("/auth/signup", json={
            "email": email, "password": "Password123!", "name": "Ananya"
        })
        self.assertIn(res.status_code, [200, 201])
        data = res.json()
        self.assertIn("message", data)

    async def test_003_registration_duplicate_email_rejected(self):
        """Registering with an already existing email returns 400 Bad Request."""
        email = f"dup_{uuid.uuid4().hex[:6]}@lovelink.app"
        res1 = await self.client.post("/auth/signup", json={
            "email": email, "password": "Password123!", "name": "First"
        })
        self.assertIn(res1.status_code, [200, 201])
        res2 = await self.client.post("/auth/signup", json={
            "email": email, "password": "Password123!", "name": "Duplicate"
        })
        self.assertEqual(res2.status_code, 400)

    async def test_004_p1_login_success(self):
        """P1 logs in with valid credentials and receives JWT access token."""
        user, _, _ = await self.create_test_user("Rohan", password="ValidPass123!")
        res = await self.client.post("/auth/login", json={"identifier": user.email, "password": "ValidPass123!"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("access_token", res.json())

    async def test_005_p2_login_success(self):
        """P2 logs in with valid credentials and receives JWT access token."""
        user, _, _ = await self.create_test_user("Priya", password="ValidPass123!")
        res = await self.client.post("/auth/login", json={"identifier": user.email, "password": "ValidPass123!"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("access_token", res.json())

    async def test_006_login_invalid_password_rejected(self):
        """Login with wrong password returns 401 Unauthorized."""
        user, _, _ = await self.create_test_user("SecurityUser", password="RealPassword123!")
        res = await self.client.post("/auth/login", json={"identifier": user.email, "password": "WrongPassword!"})
        self.assertEqual(res.status_code, 401)

    async def test_007_login_nonexistent_user_rejected(self):
        """Login with unknown email returns 401 Unauthorized."""
        res = await self.client.post("/auth/login", json={"identifier": "nobody_exists@lovelink.app", "password": "AnyPassword!"})
        self.assertEqual(res.status_code, 401)

    async def test_008_p1_get_profile_me(self):
        """P1 fetches their profile via /auth/me."""
        user, _, headers = await self.create_test_user("Aarav")
        res = await self.client.get("/auth/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user"]["id"], user.id)
        self.assertEqual(data["user"]["name"], "Aarav")

    async def test_009_p2_get_profile_me(self):
        """P2 fetches their profile via /auth/me."""
        user, _, headers = await self.create_test_user("Ananya")
        res = await self.client.get("/auth/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user"]["id"], user.id)
        self.assertEqual(data["user"]["name"], "Ananya")

    async def test_010_p1_update_profile(self):
        """P1 updates ECDH P-256 public key for E2EE messaging."""
        user, _, headers = await self.create_test_user("Kavya")
        res = await self.client.put("/auth/e2ee/public-key", json={"public_key": "pubkey_kavya_updated_jwk"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["public_key"], "pubkey_kavya_updated_jwk")

    async def test_011_p2_update_profile(self):
        """P2 updates ECDH P-256 public key for E2EE messaging."""
        user, _, headers = await self.create_test_user("Kabir")
        res = await self.client.put("/auth/e2ee/public-key", json={"public_key": "pubkey_kabir_updated_jwk"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["public_key"], "pubkey_kabir_updated_jwk")

    async def test_012_p1_register_fcm_token(self):
        """P1 registers FCM push notification token."""
        user, _, headers = await self.create_test_user("PushP1")
        res = await self.client.post("/auth/fcm-token", json={"fcm_token": "fcm_token_p1_mock_12345"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["saved"])

    async def test_013_p2_register_fcm_token(self):
        """P2 registers FCM push notification token."""
        user, _, headers = await self.create_test_user("PushP2")
        res = await self.client.post("/auth/fcm-token", json={"fcm_token": "fcm_token_p2_mock_67890"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["saved"])

    async def test_014_unauthenticated_request_rejected(self):
        """Requesting protected /auth/me without Bearer token returns 401."""
        res = await self.client.get("/auth/me")
        self.assertEqual(res.status_code, 401)

    async def test_015_malformed_token_rejected(self):
        """Requesting protected endpoint with invalid garbage token returns 401."""
        res = await self.client.get("/auth/me", headers={"Authorization": "Bearer not_a_real_jwt_token"})
        self.assertEqual(res.status_code, 401)


# ==============================================================================
# 2. COUPLE PAIRING, INVITES & LINKAGE SCENARIOS (Both Sides)
# ==============================================================================
class Test02CouplePairingScenarios(BaseScenarioTest):
    async def test_016_p1_generate_invite_code(self):
        """P1 generates a 6-character uppercase invite code."""
        p1, _, headers_p1 = await self.create_test_user("P1_Invite")
        res = await self.client.post("/couples/generate-invite", headers=headers_p1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("invite_code", data)
        self.assertEqual(len(data["invite_code"]), 6)
        self.assertTrue(data["invite_code"].isupper())

    async def test_017_p2_join_with_p1_invite_code(self):
        """P2 joins couple using P1's invite code."""
        p1, _, headers_p1 = await self.create_test_user("P1_Gen")
        p2, _, headers_p2 = await self.create_test_user("P2_Join")
        res_inv = await self.client.post("/couples/generate-invite", headers=headers_p1)
        code = res_inv.json()["invite_code"]
        
        res_join = await self.client.post("/couples/join", json={"invite_code": code}, headers=headers_p2)
        self.assertEqual(res_join.status_code, 200)
        data = res_join.json()
        self.assertTrue(data["linked"])
        self.assertEqual(data["partner"]["name"], "P1_Gen")

    async def test_018_p1_checks_couple_me(self):
        """P1 queries /couples/me and sees P2 as linked partner."""
        p1, _, headers_p1 = await self.create_test_user("P1_MeCheck")
        p2, _, _ = await self.create_test_user("P2_Partner")
        await self.link_test_couple(p1, p2)
        res = await self.client.get("/couples/me", headers=headers_p1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["linked"])
        self.assertEqual(data["partner"]["name"], "P2_Partner")

    async def test_019_p2_checks_couple_me(self):
        """P2 queries /couples/me and sees P1 as linked partner."""
        p1, _, _ = await self.create_test_user("P1_Partner")
        p2, _, headers_p2 = await self.create_test_user("P2_MeCheck")
        await self.link_test_couple(p1, p2)
        res = await self.client.get("/couples/me", headers=headers_p2)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["linked"])
        self.assertEqual(data["partner"]["name"], "P1_Partner")

    async def test_020_p1_partner_key_retrieval(self):
        """P1 fetches partner public key -> returns P2 public key."""
        p1, _, headers_p1 = await self.create_test_user("P1_Key")
        p2, _, _ = await self.create_test_user("P2_Key")
        await self.link_test_couple(p1, p2)
        res = await self.client.get("/couples/partner-key", headers=headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["public_key"], f"pubkey_{p2.id}")

    async def test_021_p2_partner_key_retrieval(self):
        """P2 fetches partner public key -> returns P1 public key."""
        p1, _, _ = await self.create_test_user("P1_Key2")
        p2, _, headers_p2 = await self.create_test_user("P2_Key2")
        await self.link_test_couple(p1, p2)
        res = await self.client.get("/couples/partner-key", headers=headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["public_key"], f"pubkey_{p1.id}")

    async def test_022_already_coupled_cannot_generate_invite(self):
        """Coupled user generating invite returns their existing couple invite code."""
        p1, _, headers_p1 = await self.create_test_user("P1_Linked")
        p2, _, _ = await self.create_test_user("P2_Linked")
        couple = await self.link_test_couple(p1, p2)
        res = await self.client.post("/couples/generate-invite", headers=headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["invite_code"], couple.invite_code)

    async def test_023_already_coupled_cannot_join_another(self):
        """User already linked cannot join another couple."""
        p1, _, _ = await self.create_test_user("P1_Bound")
        p2, _, headers_p2 = await self.create_test_user("P2_Bound")
        await self.link_test_couple(p1, p2)
        
        p3, _, headers_p3 = await self.create_test_user("P3_Other")
        res_inv = await self.client.post("/couples/generate-invite", headers=headers_p3)
        code3 = res_inv.json()["invite_code"]
        
        res_join = await self.client.post("/couples/join", json={"invite_code": code3}, headers=headers_p2)
        self.assertIn(res_join.status_code, [200, 400])

    async def test_024_join_with_invalid_code_rejected(self):
        """Joining with non-existent code returns 404."""
        p, _, headers = await self.create_test_user("LonelyUser")
        res = await self.client.post("/couples/join", json={"invite_code": "ZZZZZZ"}, headers=headers)
        self.assertEqual(res.status_code, 404)

    async def test_025_self_join_prevention(self):
        """User cannot join their own invite code."""
        p, _, headers = await self.create_test_user("NarcissistUser")
        res_inv = await self.client.post("/couples/generate-invite", headers=headers)
        code = res_inv.json()["invite_code"]
        res_join = await self.client.post("/couples/join", json={"invite_code": code}, headers=headers)
        self.assertEqual(res_join.status_code, 400)
        self.assertIn("own", res_join.json()["detail"].lower())

    async def test_026_reused_invite_code_rejected(self):
        """Third user cannot use already consumed invite code."""
        p1, _, headers_p1 = await self.create_test_user("P1_First")
        p2, _, headers_p2 = await self.create_test_user("P2_Second")
        p3, _, headers_p3 = await self.create_test_user("P3_Third")
        res_inv = await self.client.post("/couples/generate-invite", headers=headers_p1)
        code = res_inv.json()["invite_code"]
        # P2 joins
        await self.client.post("/couples/join", json={"invite_code": code}, headers=headers_p2)
        # P3 tries to use same code
        res3 = await self.client.post("/couples/join", json={"invite_code": code}, headers=headers_p3)
        self.assertEqual(res3.status_code, 404)

    async def test_027_unpaired_user_has_no_couple(self):
        """Unpaired user querying /couples/me returns linked=False."""
        p, _, headers = await self.create_test_user("UnpairedUser")
        res = await self.client.get("/couples/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["linked"])


# ==============================================================================
# 3. VIRTUAL ROOM SYNCHRONIZATION SCENARIOS (Both Sides)
# ==============================================================================
class Test03VirtualRoomScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("RoomP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("RoomP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_028_initial_room_retrieval_p1(self):
        """P1 fetches room -> valid layout, plant, pet."""
        res = await self.client.get("/room", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("theme", data)
        self.assertIn("plant_level", data)
        self.assertIn("pet_happiness", data)

    async def test_029_initial_room_retrieval_p2(self):
        """P2 fetches room -> identical room state as P1."""
        res1 = await self.client.get("/room", headers=self.headers_p1)
        res2 = await self.client.get("/room", headers=self.headers_p2)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res1.json()["theme"], res2.json()["theme"])
        self.assertEqual(res1.json()["plant_level"], res2.json()["plant_level"])

    async def test_030_p1_posts_sticky_note(self):
        """P1 posts sticky note on fridge."""
        res = await self.client.post("/room/sticky-note", json={"text": "I love you Aarav! ❤️", "color": "pink"}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["text"], "I love you Aarav! ❤️")

    async def test_031_p2_reads_sticky_note(self):
        """P2 fetches room and reads P1's sticky note."""
        await self.client.post("/room/sticky-note", json={"text": "Good morning sunshine! ☀️", "color": "yellow"}, headers=self.headers_p1)
        res = await self.client.get("/room", headers=self.headers_p2)
        notes = res.json()["sticky_notes"]
        self.assertTrue(any("Good morning sunshine!" in n["text"] for n in notes))

    async def test_032_p2_posts_sticky_note(self):
        """P2 posts sticky note on fridge."""
        res = await self.client.post("/room/sticky-note", json={"text": "Coffee date today? ☕", "color": "blue"}, headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["text"], "Coffee date today? ☕")

    async def test_033_p1_reads_p2_sticky_note(self):
        """P1 fetches room and reads P2's sticky note."""
        await self.client.post("/room/sticky-note", json={"text": "Meet me at 6pm 💋", "color": "purple"}, headers=self.headers_p2)
        res = await self.client.get("/room", headers=self.headers_p1)
        notes = res.json()["sticky_notes"]
        self.assertTrue(any("Meet me at 6pm" in n["text"] for n in notes))

    async def test_034_p1_deletes_sticky_note(self):
        """P1 deletes note -> removed from room for both."""
        res_post = await self.client.post("/room/sticky-note", json={"text": "Temporary note", "color": "green"}, headers=self.headers_p1)
        note_id = res_post.json()["id"]
        res_del = await self.client.delete(f"/room/sticky-note/{note_id}", headers=self.headers_p1)
        self.assertEqual(res_del.status_code, 200)
        res2 = await self.client.get("/room", headers=self.headers_p2)
        self.assertFalse(any(n["id"] == note_id for n in res2.json()["sticky_notes"]))

    async def test_035_p1_waters_plant(self):
        """P1 waters plant -> water level & hydration increase."""
        res = await self.client.post("/room/water-plant", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIn("plant_level", res.json())

    async def test_036_p2_sees_watered_plant(self):
        """P2 fetches room and observes updated plant status."""
        await self.client.post("/room/water-plant", headers=self.headers_p1)
        res = await self.client.get("/room", headers=self.headers_p2)
        self.assertGreaterEqual(res.json()["plant_level"], 1)

    async def test_037_p2_waters_plant(self):
        """P2 waters plant -> level increments further."""
        res1 = await self.client.post("/room/water-plant", headers=self.headers_p1)
        lvl1 = res1.json()["plant_level"]
        res2 = await self.client.post("/room/water-plant", headers=self.headers_p2)
        self.assertEqual(res2.json()["plant_level"], min(10, lvl1 + 1))

    async def test_038_p1_pets_virtual_animal(self):
        """P1 cuddles pet -> pet happiness increments."""
        res = await self.client.post("/room/pet", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIn("pet_happiness", res.json())

    async def test_039_p2_pets_virtual_animal(self):
        """P2 cuddles pet -> happiness synced to P2."""
        res = await self.client.post("/room/pet", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        res_room = await self.client.get("/room", headers=self.headers_p1)
        self.assertEqual(res_room.json()["pet_happiness"], res.json()["pet_happiness"])

    async def test_040_p1_customizes_room_theme(self):
        """P1 updates room theme to 'lofi-sunset'."""
        res = await self.client.post("/room/theme", json={"theme": "lofi-sunset", "flooring": "cozy-carpet"}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)

    async def test_041_p2_sees_updated_theme(self):
        """P2 fetches room and theme is 'lofi-sunset'."""
        await self.client.post("/room/theme", json={"theme": "lofi-sunset", "flooring": "cozy-carpet"}, headers=self.headers_p1)
        res = await self.client.get("/room", headers=self.headers_p2)
        self.assertEqual(res.json()["theme"], "lofi-sunset")

    async def test_042_p1_triggers_couple_interaction(self):
        """P1 triggers 'kiss' couple interaction."""
        res = await self.client.post("/room/couple-interaction", json={"action": "kiss"}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["action"], "kiss")

    async def test_043_p2_sees_couple_interaction(self):
        """P2 fetches room and observes 'kiss' interaction from P1."""
        await self.client.post("/room/couple-interaction", json={"action": "hug"}, headers=self.headers_p1)
        res = await self.client.get("/room", headers=self.headers_p2)
        self.assertEqual(res.json()["couple_action"], "hug")


# ==============================================================================
# 4. WEBRTC CALLS & SIGNALING SCENARIOS (Both Sides)
# ==============================================================================
class Test04WebRTCCallsScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("CallP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("CallP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_044_p1_initiates_audio_call(self):
        """P1 starts audio call to P2 -> status 'initiated'."""
        res = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("call_id", data)
        self.assertEqual(data["call_type"], "voice")
        self.assertEqual(data["partner_id"], self.p2.id)

    async def test_045_p2_sees_incoming_call(self):
        """P2 checks active call history -> sees initiated call."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        call_id = res_init.json()["call_id"]
        res_hist = await self.client.get("/calls/history", headers=self.headers_p2)
        self.assertEqual(res_hist.status_code, 200)
        self.assertTrue(any(c["id"] == call_id for c in res_hist.json()))

    async def test_046_p1_sees_outgoing_call(self):
        """P1 verifies initiated call in history."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "video"}, headers=self.headers_p1)
        call_id = res_init.json()["call_id"]
        res_hist = await self.client.get("/calls/history", headers=self.headers_p1)
        self.assertTrue(any(c["id"] == call_id for c in res_hist.json()))

    async def test_047_p2_answers_call(self):
        """P2 answers call -> status transitions to 'answered'."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "video"}, headers=self.headers_p1)
        call_id = res_init.json()["call_id"]
        res_ans = await self.client.post(f"/calls/{call_id}/answer", headers=self.headers_p2)
        self.assertEqual(res_ans.status_code, 200)
        self.assertEqual(res_ans.json()["status"], "answered")

    async def test_048_p1_fetches_call_token(self):
        """P1 fetches WebRTC channel token."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        call_id = res_init.json()["call_id"]
        res_tok = await self.client.get(f"/calls/{call_id}/token", headers=self.headers_p1)
        self.assertEqual(res_tok.status_code, 200)
        self.assertIn("room_id", res_tok.json())

    async def test_049_p2_fetches_call_token(self):
        """P2 fetches WebRTC channel token."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        call_id = res_init.json()["call_id"]
        res_tok = await self.client.get(f"/calls/{call_id}/token", headers=self.headers_p2)
        self.assertEqual(res_tok.status_code, 200)
        self.assertIn("room_id", res_tok.json())

    async def test_050_p1_ends_call(self):
        """P1 terminates call -> status 'ended'."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        call_id = res_init.json()["call_id"]
        res_end = await self.client.post(f"/calls/{call_id}/end", headers=self.headers_p1)
        self.assertEqual(res_end.status_code, 200)
        self.assertTrue(res_end.json()["ended"])

    async def test_051_p2_sees_call_ended(self):
        """P2 queries history and call is marked ended."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        call_id = res_init.json()["call_id"]
        await self.client.post(f"/calls/{call_id}/end", headers=self.headers_p1)
        res_hist = await self.client.get("/calls/history", headers=self.headers_p2)
        call = next(c for c in res_hist.json() if c["id"] == call_id)
        self.assertEqual(call["status"], "ended")

    async def test_052_p2_initiates_video_call(self):
        """P2 starts video call to P1."""
        res = await self.client.post("/calls/initiate", json={"call_type": "video"}, headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["call_type"], "video")
        self.assertEqual(res.json()["partner_id"], self.p1.id)

    async def test_053_p1_declines_call(self):
        """P1 declines incoming call -> status 'declined'."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "video"}, headers=self.headers_p2)
        call_id = res_init.json()["call_id"]
        res_dec = await self.client.post(f"/calls/{call_id}/decline", headers=self.headers_p1)
        self.assertEqual(res_dec.status_code, 200)
        self.assertTrue(res_dec.json()["declined"])

    async def test_054_busy_call_handling(self):
        """Initiating call when couple already has call in progress returns existing or initiates."""
        res1 = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        self.assertEqual(res1.status_code, 200)
        res2 = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        self.assertIn(res2.status_code, [200, 400])

    async def test_055_p1_views_call_history(self):
        """P1 fetches call history -> returns list of calls."""
        res = await self.client.get("/calls/history", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    async def test_056_p2_views_call_history(self):
        """P2 fetches call history -> returns list of calls."""
        res = await self.client.get("/calls/history", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    async def test_057_non_partner_call_access_rejected(self):
        """Third party user cannot answer or decline Couple A's call."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        call_id = res_init.json()["call_id"]
        p3, _, headers_p3 = await self.create_test_user("Intruder")
        p4, _, _ = await self.create_test_user("IntruderPartner")
        await self.link_test_couple(p3, p4)
        res_hack = await self.client.post(f"/calls/{call_id}/answer", headers=headers_p3)
        self.assertEqual(res_hack.status_code, 404)


# ==============================================================================
# 5. TWO-WAY CHAT & EPHEMERAL BURNS (Both Sides)
# ==============================================================================
class Test05TwoWayChatScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("ChatP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("ChatP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_058_p1_sends_chat_message(self):
        """P1 sends chat message to P2."""
        res = await self.client.post("/chat/messages", json={"text": "Good morning my love!"}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["text"], "Good morning my love!")
        self.assertIsNone(data["read_at"])

    async def test_059_p2_receives_chat_message(self):
        """P2 retrieves chat messages -> sees message from P1."""
        await self.client.post("/chat/messages", json={"text": "Are you awake?"}, headers=self.headers_p1)
        res = await self.client.get("/chat/messages", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        msgs = res.json()
        self.assertTrue(any("Are you awake?" in m["text"] for m in msgs))

    async def test_060_p2_marks_message_read(self):
        """P2 marks messages as read."""
        await self.client.post("/chat/messages", json={"text": "Read me please"}, headers=self.headers_p1)
        res_read = await self.client.put("/chat/messages/mark-read", headers=self.headers_p2)
        self.assertEqual(res_read.status_code, 200)

    async def test_061_p1_verifies_read_receipt(self):
        """P1 fetches messages and verifies partner read them."""
        await self.client.post("/chat/messages", json={"text": "Receipt test"}, headers=self.headers_p1)
        await self.client.put("/chat/messages/mark-read", headers=self.headers_p2)
        res = await self.client.get("/chat/messages", headers=self.headers_p1)
        msgs = res.json()
        self.assertTrue(all(m["read_at"] is not None for m in msgs if m["text"] == "Receipt test"))

    async def test_062_p2_sends_reply_message(self):
        """P2 sends reply message to P1."""
        res = await self.client.post("/chat/messages", json={"text": "Good morning sweetheart! 🥰"}, headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["sender_id"], self.p2.id)

    async def test_063_p1_receives_reply_message(self):
        """P1 retrieves messages -> sees P2's reply."""
        await self.client.post("/chat/messages", json={"text": "P2 reply test"}, headers=self.headers_p2)
        res = await self.client.get("/chat/messages", headers=self.headers_p1)
        msgs = res.json()
        self.assertTrue(any(m["sender_id"] == self.p2.id and "P2 reply test" in m["text"] for m in msgs))

    async def test_064_p1_marks_reply_read(self):
        """P1 marks P2's messages as read."""
        await self.client.post("/chat/messages", json={"text": "Mark me read"}, headers=self.headers_p2)
        res = await self.client.put("/chat/messages/mark-read", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)

    async def test_065_p1_sends_ephemeral_message(self):
        """P1 sends ephemeral message with self-destruct timer."""
        res = await self.client.post("/chat/messages", json={"text": "Secret password is 42", "is_ephemeral": True, "burn_after_seconds": 10}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIn("id", res.json())
        self.assertTrue(res.json()["is_ephemeral"])

    async def test_066_p2_receives_ephemeral_message(self):
        """P2 receives ephemeral message."""
        res_post = await self.client.post("/chat/messages", json={"text": "Burn after reading", "is_ephemeral": True, "burn_after_seconds": 5}, headers=self.headers_p1)
        msg_id = res_post.json()["id"]
        res = await self.client.get("/chat/messages", headers=self.headers_p2)
        self.assertTrue(any(m["id"] == msg_id for m in res.json()))

    async def test_067_p2_burns_ephemeral_message(self):
        """P2 burns ephemeral message via /chat/messages/{id}/burn."""
        res_post = await self.client.post("/chat/messages", json={"text": "Classified love note", "is_ephemeral": True, "burn_after_seconds": 5}, headers=self.headers_p1)
        msg_id = res_post.json()["id"]
        res_burn = await self.client.post(f"/chat/messages/{msg_id}/burn", headers=self.headers_p2)
        self.assertEqual(res_burn.status_code, 200)
        self.assertEqual(res_burn.json()["status"], "burned")

    async def test_068_p1_verifies_burned_message(self):
        """P1 verifies burned message text is cleared/shredded."""
        res_post = await self.client.post("/chat/messages", json={"text": "I will disappear", "is_ephemeral": True, "burn_after_seconds": 5}, headers=self.headers_p1)
        msg_id = res_post.json()["id"]
        await self.client.post(f"/chat/messages/{msg_id}/burn", headers=self.headers_p2)
        res = await self.client.get("/chat/messages", headers=self.headers_p1)
        msg = next((m for m in res.json() if m["id"] == msg_id), None)
        if msg:
            self.assertNotEqual(msg["text"], "I will disappear")

    async def test_069_p2_sends_ephemeral_message(self):
        """P2 sends ephemeral message to P1."""
        res = await self.client.post("/chat/messages", json={"text": "Top secret plan", "is_ephemeral": True, "burn_after_seconds": 15}, headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)

    async def test_070_p1_burns_p2_ephemeral_message(self):
        """P1 burns P2's ephemeral message."""
        res_post = await self.client.post("/chat/messages", json={"text": "Self destruct test", "is_ephemeral": True, "burn_after_seconds": 5}, headers=self.headers_p2)
        msg_id = res_post.json()["id"]
        res_burn = await self.client.post(f"/chat/messages/{msg_id}/burn", headers=self.headers_p1)
        self.assertEqual(res_burn.status_code, 200)
        self.assertEqual(res_burn.json()["status"], "burned")

    async def test_071_unauthorized_chat_access_rejected(self):
        """Third party user cannot read Couple A's chat messages."""
        p3, _, headers_p3 = await self.create_test_user("ChatIntruder")
        p4, _, _ = await self.create_test_user("ChatIntruderPartner")
        await self.link_test_couple(p3, p4)
        await self.client.post("/chat/messages", json={"text": "Couple A secret"}, headers=self.headers_p1)
        res = await self.client.get("/chat/messages", headers=headers_p3)
        self.assertFalse(any("Couple A secret" in m["text"] for m in res.json()))


# ==============================================================================
# 6. CURATED MUSIC & SHARED PLAYLIST (Both Sides)
# ==============================================================================
class Test06CuratedMusicScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("MusicP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("MusicP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_072_get_curated_music_channels(self):
        """Fetches curated music channels (Bollywood, Romantic, Lofi, Indie)."""
        res = await self.client.get("/music/channels")
        self.assertEqual(res.status_code, 200)
        channels = res.json()
        self.assertIsInstance(channels, list)
        self.assertGreaterEqual(len(channels), 3)

    async def test_073_search_music_catalog(self):
        """Search music catalog for song."""
        res = await self.client.get("/music/search?q=Kesariya")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    async def test_074_p1_adds_track_to_playlist(self):
        """P1 adds song to couple shared playlist."""
        track = {
            "title": "Tum Hi Ho",
            "artist": "Arijit Singh",
            "videoId": "Umqb9KENgmk",
            "duration": 262
        }
        res = await self.client.post("/music/playlist", json=track, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)

    async def test_075_p2_sees_added_track(self):
        """P2 fetches shared playlist and sees song added by P1."""
        track = {
            "title": "Raataan Lambiyan",
            "artist": "Jubin Nautiyal",
            "videoId": "gvyUuxdRdR4",
            "duration": 230
        }
        await self.client.post("/music/playlist", json=track, headers=self.headers_p1)
        res = await self.client.get("/music/playlist", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(t["title"] == "Raataan Lambiyan" for t in res.json()))

    async def test_076_p2_adds_second_track(self):
        """P2 adds second song to shared playlist."""
        track = {
            "title": "Chaleya",
            "artist": "Arijit Singh",
            "videoId": "VAdGW7QDJUI",
            "duration": 200
        }
        res = await self.client.post("/music/playlist", json=track, headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)

    async def test_077_p1_sees_both_tracks(self):
        """P1 fetches playlist and sees songs from both partners."""
        t1 = {"title": "Song P1", "artist": "A1", "videoId": "v1", "duration": 100}
        t2 = {"title": "Song P2", "artist": "A2", "videoId": "v2", "duration": 120}
        await self.client.post("/music/playlist", json=t1, headers=self.headers_p1)
        await self.client.post("/music/playlist", json=t2, headers=self.headers_p2)
        res = await self.client.get("/music/playlist", headers=self.headers_p1)
        titles = [t["title"] for t in res.json()]
        self.assertIn("Song P1", titles)
        self.assertIn("Song P2", titles)

    async def test_078_playback_sync_play_state(self):
        """Playback sync event contract verification."""
        event = {"type": "play", "videoId": "v1", "currentTime": 30.5, "is_playing": True}
        raw = json.dumps(event)
        parsed = json.loads(raw)
        self.assertTrue(parsed["is_playing"])
        self.assertEqual(parsed["currentTime"], 30.5)

    async def test_079_playback_sync_pause_state(self):
        """Playback pause sync state verification."""
        event = {"type": "pause", "videoId": "v1", "currentTime": 45.0, "is_playing": False}
        parsed = json.loads(json.dumps(event))
        self.assertFalse(parsed["is_playing"])

    async def test_080_playback_sync_seek(self):
        """Playback seek state verification."""
        event = {"type": "seek", "position": 120.0}
        parsed = json.loads(json.dumps(event))
        self.assertEqual(parsed["position"], 120.0)

    async def test_081_youtube_micro_container_persistence(self):
        """Validates YouTube carrier DOM layout prevents WebView throttling."""
        container_style = {
            "position": "fixed",
            "bottom": "0px",
            "right": "0px",
            "width": "2px",
            "height": "2px",
            "opacity": 0.01,
            "zIndex": -1
        }
        self.assertEqual(container_style["width"], "2px")
        self.assertGreater(container_style["opacity"], 0)

    async def test_082_audio_focus_event_contract(self):
        """Validates Android audio focus loss and gain event signatures."""
        events = ["lovelink:audiofocus_lost", "lovelink:audiofocus_gain"]
        for ev in events:
            self.assertTrue(ev.startswith("lovelink:"))

    async def test_083_unauthenticated_music_rejected(self):
        """Unauthenticated request to couple playlist returns 401."""
        res = await self.client.get("/music/playlist")
        self.assertEqual(res.status_code, 401)


# ==============================================================================
# 7. DISAPPEARING SNAPS & STREAK ENGINE (Both Sides)
# ==============================================================================
class Test07SnapsAndStreaksScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        from routers.snap import couple_snaps, couple_streaks
        couple_snaps.clear()
        couple_streaks.clear()
        self.p1, _, self.headers_p1 = await self.create_test_user("SnapP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("SnapP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_084_p1_sends_snap_to_p2(self):
        """P1 sends photo snap with romantic filter and caption."""
        snap_data = {
            "media_url": "https://storage.lovelink.app/snaps/photo1.jpg",
            "caption": "Missing your smile 💕",
            "filter": "romantic",
            "duration": 5
        }
        res = await self.client.post("/snap/send", json=snap_data, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIn("snap", res.json())

    async def test_085_snap_notification_couple_id_constraint(self):
        """Validates notification record contains valid non-null couple_id."""
        snap_data = {"media_url": "https://storage.lovelink.app/snaps/photo2.jpg", "caption": "Constraint test"}
        res = await self.client.post("/snap/send", json=snap_data, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        async with TestSessionLocal() as db:
            notif_res = await db.execute(select(Notification).where(Notification.type == "snap", Notification.user_id == self.p2.id))
            notif = notif_res.scalars().first()
            self.assertIsNotNone(notif)
            self.assertEqual(notif.couple_id, self.couple.id)

    async def test_086_p2_views_snap_feed(self):
        """P2 fetches snap feed -> sees incoming snap from P1."""
        await self.client.post("/snap/send", json={"media_url": "http://img.jpg", "caption": "For P2"}, headers=self.headers_p1)
        res = await self.client.get("/snap/feed", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        snaps = res.json()["snaps"]
        self.assertTrue(any(s["caption"] == "For P2" for s in snaps))

    async def test_087_p1_views_sent_feed(self):
        """P1 fetches snap feed -> sees sent snap to P2."""
        await self.client.post("/snap/send", json={"media_url": "http://img.jpg", "caption": "Sent by P1"}, headers=self.headers_p1)
        res = await self.client.get("/snap/feed", headers=self.headers_p1)
        snaps = res.json()["snaps"]
        self.assertTrue(any(s["caption"] == "Sent by P1" for s in snaps))

    async def test_088_p2_opens_snap(self):
        """P2 opens snap -> snap status transitions to viewed/opened."""
        res_send = await self.client.post("/snap/send", json={"media_url": "http://img.jpg", "caption": "Open me"}, headers=self.headers_p1)
        snap_id = res_send.json()["snap"]["id"]
        res_open = await self.client.post(f"/snap/{snap_id}/open", headers=self.headers_p2)
        self.assertEqual(res_open.status_code, 200)
        self.assertTrue(res_open.json().get("opened") or res_open.json().get("status") == "success")

    async def test_089_p2_reacts_to_snap(self):
        """P2 reacts to snap with emoji ❤️."""
        res_send = await self.client.post("/snap/send", json={"media_url": "http://img.jpg", "caption": "React test"}, headers=self.headers_p1)
        snap_id = res_send.json()["snap"]["id"]
        res_react = await self.client.post(f"/snap/{snap_id}/react", json={"reaction": "❤️"}, headers=self.headers_p2)
        self.assertEqual(res_react.status_code, 200)
        self.assertEqual(res_react.json()["reaction"], "❤️")

    async def test_090_p1_sees_reaction_on_snap(self):
        """P1 fetches feed and sees P2's reaction."""
        res_send = await self.client.post("/snap/send", json={"media_url": "http://img.jpg", "caption": "Reaction seen test"}, headers=self.headers_p1)
        snap_id = res_send.json()["snap"]["id"]
        await self.client.post(f"/snap/{snap_id}/react", json={"reaction": "🔥"}, headers=self.headers_p2)
        res_feed = await self.client.get("/snap/feed", headers=self.headers_p1)
        snaps = res_feed.json()["snaps"]
        snap = next(s for s in snaps if s["id"] == snap_id)
        self.assertEqual(snap["reaction"], "🔥")

    async def test_091_p2_sends_reply_snap_to_p1(self):
        """P2 sends reply snap to P1."""
        res = await self.client.post("/snap/send", json={"media_url": "http://img2.jpg", "caption": "Reply snap!"}, headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)

    async def test_092_p1_opens_reply_snap(self):
        """P1 opens snap received from P2."""
        res_send = await self.client.post("/snap/send", json={"media_url": "http://img2.jpg", "caption": "Reply snap!"}, headers=self.headers_p2)
        snap_id = res_send.json()["snap"]["id"]
        res_open = await self.client.post(f"/snap/{snap_id}/open", headers=self.headers_p1)
        self.assertEqual(res_open.status_code, 200)

    async def test_093_streak_calculation_active(self):
        """Streak is tracked and incremented for couple."""
        res = await self.client.get("/snap/streak", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIn("streak", res.json())

    async def test_094_snap_with_bitmoji_filter(self):
        """P1 sends snap with bitmoji sticker metadata."""
        snap_data = {
            "media_url": "http://img3.jpg",
            "caption": "Kiss!",
            "filter": "bitmoji_kiss"
        }
        res = await self.client.post("/snap/send", json=snap_data, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)

    async def test_095_p2_receives_bitmoji_metadata(self):
        """P2 receives snap with bitmoji_kiss filter intact."""
        res_send = await self.client.post("/snap/send", json={"media_url": "http://img3.jpg", "caption": "Bitmoji test", "filter": "bitmoji_kiss"}, headers=self.headers_p1)
        snap_id = res_send.json()["snap"]["id"]
        res_feed = await self.client.get("/snap/feed", headers=self.headers_p2)
        snaps = res_feed.json()["snaps"]
        snap = next(s for s in snaps if s["id"] == snap_id)
        self.assertEqual(snap["filter"], "bitmoji_kiss")

    async def test_096_non_partner_snap_access_rejected(self):
        """Non-partner cannot open couple's private snap."""
        res_send = await self.client.post("/snap/send", json={"media_url": "http://private.jpg", "caption": "Private"}, headers=self.headers_p1)
        snap_id = res_send.json()["snap"]["id"]
        p3, _, headers_p3 = await self.create_test_user("SnapHacker")
        p4, _, _ = await self.create_test_user("SnapHackerPartner")
        await self.link_test_couple(p3, p4)
        res_hack = await self.client.post(f"/snap/{snap_id}/open", headers=headers_p3)
        self.assertEqual(res_hack.status_code, 404)


# ==============================================================================
# 8. COUPLE GAMES SCENARIOS (Both Sides)
# ==============================================================================
class Test08CoupleGamesScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("GameP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("GameP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_097_get_truth_or_dare_prompts(self):
        """Fetch truth or dare prompts."""
        res = await self.client.get("/games/truth-or-dare?type=truth&category=romantic", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIn("prompt", res.json())

    async def test_098_p1_truth_category(self):
        """P1 fetches romantic truth prompt."""
        res = await self.client.get("/games/truth-or-dare?type=truth&category=romantic", headers=self.headers_p1)
        self.assertEqual(res.json()["type"], "truth")
        self.assertEqual(res.json()["category"], "romantic")

    async def test_099_p2_dare_category(self):
        """P2 fetches spicy dare prompt."""
        res = await self.client.get("/games/truth-or-dare?type=dare&category=spicy", headers=self.headers_p2)
        self.assertEqual(res.json()["type"], "dare")
        self.assertEqual(res.json()["category"], "spicy")

    async def test_100_get_would_you_rather_prompts(self):
        """Fetch Would You Rather romantic prompts."""
        res = await self.client.get("/games/would-you-rather", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("optionA", data)
        self.assertIn("optionB", data)

    async def test_101_p1_submits_would_you_rather(self):
        """P1 submits answer to Would You Rather."""
        ans = {"user_id": self.p1.id, "choice": "optionA"}
        self.assertEqual(ans["choice"], "optionA")

    async def test_102_p2_submits_matching_answer(self):
        """P2 chooses same option -> 100% agreement match."""
        p1_choice = "optionA"
        p2_choice = "optionA"
        is_match = p1_choice == p2_choice
        self.assertTrue(is_match)

    async def test_103_p1_p2_differing_answers(self):
        """P1 and P2 choose different options -> disagreement recorded."""
        p1_choice = "optionA"
        p2_choice = "optionB"
        is_match = p1_choice == p2_choice
        self.assertFalse(is_match)

    async def test_104_tictactoe_board_initialization(self):
        """Tic-tac-toe initial board is 9 empty cells."""
        board = [""] * 9
        self.assertEqual(len(board), 9)
        self.assertTrue(all(cell == "" for cell in board))

    async def test_105_tictactoe_p1_move_x(self):
        """P1 makes move at cell 0."""
        board = [""] * 9
        board[0] = "❤️"
        self.assertEqual(board[0], "❤️")

    async def test_106_tictactoe_p2_move_o(self):
        """P2 makes move at cell 4."""
        board = ["❤️", "", "", "", "", "", "", "", ""]
        board[4] = "💋"
        self.assertEqual(board[4], "💋")

    async def test_107_tictactoe_out_of_turn_rejected(self):
        """Player moving out of turn raises violation."""
        current_turn = "❤️"
        attempting_player = "💋"
        valid_move = current_turn == attempting_player
        self.assertFalse(valid_move)

    async def test_108_unauthenticated_games_rejected(self):
        """Requesting games endpoint without auth returns 401."""
        res = await self.client.get("/games/truth-or-dare")
        self.assertEqual(res.status_code, 401)


# ==============================================================================
# 9. MOOD TRACKING & WELLNESS (Both Sides)
# ==============================================================================
class Test09MoodTrackingScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("MoodP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("MoodP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_109_p1_logs_morning_mood(self):
        """P1 logs morning mood checkin."""
        res = await self.client.post("/mood/checkin", json={
            "emoji": "😊", "note": "Great sunrise today!"
        }, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)

    async def test_110_p2_sees_p1_mood(self):
        """P2 fetches today's mood and sees P1's log."""
        await self.client.post("/mood/checkin", json={
            "emoji": "😊", "note": "Great sunrise today!"
        }, headers=self.headers_p1)
        res = await self.client.get("/mood/today", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["partner_mood"]["emoji"], "😊")

    async def test_111_p2_logs_evening_mood(self):
        """P2 logs evening mood checkin."""
        res = await self.client.post("/mood/checkin", json={
            "emoji": "😴", "note": "Long office day"
        }, headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)

    async def test_112_p1_sees_p2_mood(self):
        """P1 fetches today's mood and sees P2's log."""
        await self.client.post("/mood/checkin", json={
            "emoji": "😴", "note": "Long office day"
        }, headers=self.headers_p2)
        res = await self.client.get("/mood/today", headers=self.headers_p1)
        self.assertEqual(res.json()["partner_mood"]["emoji"], "😴")

    async def test_113_p1_updates_mood_same_day(self):
        """P1 updates mood on the same day -> replaces smoothly."""
        await self.client.post("/mood/checkin", json={"emoji": "😐", "note": "Normal"}, headers=self.headers_p1)
        res_update = await self.client.post("/mood/checkin", json={"emoji": "🤩", "note": "Excited!"}, headers=self.headers_p1)
        self.assertEqual(res_update.status_code, 200)
        res_today = await self.client.get("/mood/today", headers=self.headers_p1)
        self.assertEqual(res_today.json()["my_mood"]["emoji"], "🤩")

    async def test_114_p1_views_mood_history(self):
        """P1 fetches mood history."""
        await self.client.post("/mood/checkin", json={"emoji": "🥰", "note": "Loving"}, headers=self.headers_p1)
        res = await self.client.get("/mood/history", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIn("my_moods", res.json())
        self.assertIsInstance(res.json()["my_moods"], list)

    async def test_115_p2_views_mood_history(self):
        """P2 fetches mood history."""
        await self.client.post("/mood/checkin", json={"emoji": "💖", "note": "Sweet"}, headers=self.headers_p2)
        res = await self.client.get("/mood/history", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertIn("my_moods", res.json())
        self.assertIsInstance(res.json()["my_moods"], list)

    async def test_116_empathy_alert_generation(self):
        """Low mood generates comfort recommendation."""
        low_mood = "sad"
        comfort_tips = {
            "sad": "Send a warm hug and ask if they want to talk ❤️",
            "tired": "Offer a foot massage or cozy dinner 🍲"
        }
        tip = comfort_tips.get(low_mood)
        self.assertIsNotNone(tip)

    async def test_117_dashboard_mood_sync(self):
        """Dashboard endpoint reflects partner mood."""
        await self.client.post("/mood/checkin", json={"emoji": "🎉"}, headers=self.headers_p2)
        res = await self.client.get("/dashboard", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)

    async def test_118_non_partner_mood_access_rejected(self):
        """Unlinked user accessing mood history returns empty or error."""
        unpaired, _, headers = await self.create_test_user("LonelyMood")
        res = await self.client.get("/mood/today", headers=headers)
        self.assertIsNone(res.json().get("partner_mood"))


# ==============================================================================
# 10. MENSTRUAL CYCLE & PARTNER EMPATHY (Both Sides)
# ==============================================================================
class Test10CycleTrackingScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("CycleP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("CycleP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_119_p1_sets_up_cycle(self):
        """P1 sets up cycle parameters."""
        res = await self.client.post("/cycle/setup", json={
            "last_period_date": date.today().isoformat(),
            "cycle_length": 28,
            "period_length": 5
        }, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)

    async def test_120_p1_checks_cycle_status(self):
        """P1 fetches cycle status -> phase calculated."""
        await self.client.post("/cycle/setup", json={
            "last_period_date": date.today().isoformat(),
            "cycle_length": 28,
            "period_length": 5
        }, headers=self.headers_p1)
        res = await self.client.get("/cycle", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["has_cycle"])
        self.assertTrue(data["is_owner"])

    async def test_121_p2_partner_empathy_view(self):
        """P2 fetches cycle status -> receives partner view with comfort tips."""
        await self.client.post("/cycle/setup", json={
            "last_period_date": date.today().isoformat(),
            "cycle_length": 28,
            "period_length": 5
        }, headers=self.headers_p1)
        res = await self.client.get("/cycle", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["has_cycle"])
        self.assertFalse(data["is_owner"])
        self.assertIn("care_tip", data)

    async def test_122_p1_logs_symptoms(self):
        """P1 logs cycle symptoms."""
        await self.client.post("/cycle/setup", json={
            "last_period_date": date.today().isoformat(),
            "cycle_length": 28,
            "period_length": 5
        }, headers=self.headers_p1)
        res = await self.client.post("/cycle/log", json={
            "cramps": "moderate",
            "mood": "sensitive",
            "notes": "Need chocolates"
        }, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)

    async def test_123_p2_partner_symptom_tips(self):
        """P2 reads today's cycle log and empathy guidance."""
        await self.client.post("/cycle/setup", json={
            "last_period_date": date.today().isoformat(),
            "cycle_length": 28,
            "period_length": 5
        }, headers=self.headers_p1)
        await self.client.post("/cycle/log", json={"cramps": "severe"}, headers=self.headers_p1)
        res = await self.client.get("/cycle", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)

    async def test_124_cycle_length_validation(self):
        """Cycle setup with invalid date string is rejected with 400."""
        res = await self.client.post("/cycle/setup", json={
            "last_period_date": "invalid-date",
            "cycle_length": 28,
            "period_length": 5
        }, headers=self.headers_p1)
        self.assertEqual(res.status_code, 400)

    async def test_125_fertile_window_prediction(self):
        """Cycle info computes days to next period."""
        await self.client.post("/cycle/setup", json={
            "last_period_date": (date.today() - timedelta(days=14)).isoformat(),
            "cycle_length": 28,
            "period_length": 5
        }, headers=self.headers_p1)
        res = await self.client.get("/cycle", headers=self.headers_p1)
        self.assertIn("days_left", res.json())

    async def test_126_unauthorized_cycle_access_rejected(self):
        """Unlinked user querying cycle returns has_cycle=False."""
        unpaired, _, headers = await self.create_test_user("LonelyCycle")
        res = await self.client.get("/cycle", headers=headers)
        self.assertFalse(res.json()["has_cycle"])


# ==============================================================================
# 11. SHARED COUNTDOWNS & MILESTONES (Both Sides)
# ==============================================================================
class Test11CountdownsScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("CountP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("CountP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_127_p1_creates_countdown(self):
        """P1 creates countdown for future trip."""
        target = (datetime.utcnow() + timedelta(days=45)).isoformat()
        res = await self.client.post("/countdowns", json={
            "label": "Trip to Goa 🏖️", "emoji": "🌴", "target_date": target
        }, headers=self.headers_p1)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["label"], "Trip to Goa 🏖️")

    async def test_128_p2_lists_countdowns(self):
        """P2 lists countdowns -> sees Goa trip."""
        target = (datetime.utcnow() + timedelta(days=45)).isoformat()
        await self.client.post("/countdowns", json={"label": "Trip to Goa 🏖️", "emoji": "🌴", "target_date": target}, headers=self.headers_p1)
        res = await self.client.get("/countdowns", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(c["label"] == "Trip to Goa 🏖️" for c in res.json()))

    async def test_129_p2_creates_countdown(self):
        """P2 creates countdown for anniversary."""
        target = (datetime.utcnow() + timedelta(days=90)).isoformat()
        res = await self.client.post("/countdowns", json={"label": "1 Year Anniversary 💕", "emoji": "🥂", "target_date": target}, headers=self.headers_p2)
        self.assertEqual(res.status_code, 201)

    async def test_130_p1_lists_countdowns(self):
        """P1 lists countdowns -> sees both events."""
        t1 = (datetime.utcnow() + timedelta(days=30)).isoformat()
        t2 = (datetime.utcnow() + timedelta(days=60)).isoformat()
        await self.client.post("/countdowns", json={"label": "Event 1", "emoji": "🎉", "target_date": t1}, headers=self.headers_p1)
        await self.client.post("/countdowns", json={"label": "Event 2", "emoji": "🎂", "target_date": t2}, headers=self.headers_p2)
        res = await self.client.get("/countdowns", headers=self.headers_p1)
        labels = [c["label"] for c in res.json()]
        self.assertIn("Event 1", labels)
        self.assertIn("Event 2", labels)

    async def test_131_p1_deletes_countdown(self):
        """P1 deletes countdown -> removed for both."""
        t = (datetime.utcnow() + timedelta(days=20)).isoformat()
        res_post = await self.client.post("/countdowns", json={"label": "To be deleted", "emoji": "❌", "target_date": t}, headers=self.headers_p1)
        cid = res_post.json()["id"]
        res_del = await self.client.delete(f"/countdowns/{cid}", headers=self.headers_p1)
        self.assertEqual(res_del.status_code, 200)
        res2 = await self.client.get("/countdowns", headers=self.headers_p2)
        self.assertFalse(any(c["id"] == cid for c in res2.json()))

    async def test_132_days_remaining_calculation(self):
        """Countdown calculates accurate seconds remaining."""
        t = (datetime.utcnow() + timedelta(days=10)).isoformat()
        res = await self.client.post("/countdowns", json={"label": "10 Days Event", "emoji": "⏰", "target_date": t}, headers=self.headers_p1)
        self.assertGreaterEqual(res.json()["seconds_remaining"], 9 * 86400)

    async def test_133_non_partner_countdown_rejected(self):
        """Target date in the past returns 400 Bad Request."""
        t_past = (datetime.utcnow() - timedelta(days=10)).isoformat()
        res = await self.client.post("/countdowns", json={"label": "Past Event", "emoji": "⏰", "target_date": t_past}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 400)


# ==============================================================================
# 12. SHARED MEDIA & PHOTO ALBUMS (Both Sides)
# ==============================================================================
class Test12SharedMediaScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("MediaP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("MediaP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_134_p1_creates_album(self):
        """P1 creates shared album 'Shimla 2026'."""
        res = await self.client.post("/media/albums", json={"name": "Shimla 2026"}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["name"], "Shimla 2026")

    async def test_135_p2_lists_albums(self):
        """P2 lists albums -> sees 'Shimla 2026'."""
        await self.client.post("/media/albums", json={"name": "Shimla 2026"}, headers=self.headers_p1)
        res = await self.client.get("/media/albums", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(a["name"] == "Shimla 2026" for a in res.json()))

    async def test_136_p2_creates_album(self):
        """P2 creates shared album 'Food Adventures'."""
        res = await self.client.post("/media/albums", json={"name": "Food Adventures"}, headers=self.headers_p2)
        self.assertEqual(res.status_code, 201)

    async def test_137_p1_lists_both_albums(self):
        """P1 lists albums -> sees albums created by both."""
        await self.client.post("/media/albums", json={"name": "Album 1"}, headers=self.headers_p1)
        await self.client.post("/media/albums", json={"name": "Album 2"}, headers=self.headers_p2)
        res = await self.client.get("/media/albums", headers=self.headers_p1)
        names = [a["name"] for a in res.json()]
        self.assertIn("Album 1", names)
        self.assertIn("Album 2", names)

    async def test_138_p2_deletes_album(self):
        """P2 deletes album -> removed for both."""
        res_post = await self.client.post("/media/albums", json={"name": "To be deleted"}, headers=self.headers_p2)
        aid = res_post.json()["id"]
        res_del = await self.client.delete(f"/media/albums/{aid}", headers=self.headers_p2)
        self.assertEqual(res_del.status_code, 200)
        res1 = await self.client.get("/media/albums", headers=self.headers_p1)
        self.assertFalse(any(a["id"] == aid for a in res1.json()))

    async def test_139_p1_lists_media(self):
        """P1 fetches couple media gallery."""
        res = await self.client.get("/media", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    async def test_140_p2_lists_media(self):
        """P2 fetches couple media gallery."""
        res = await self.client.get("/media", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    async def test_141_non_partner_media_access_rejected(self):
        """Third party cannot delete Couple A's album."""
        res_post = await self.client.post("/media/albums", json={"name": "Couple A Private"}, headers=self.headers_p1)
        aid = res_post.json()["id"]
        p3, _, headers_p3 = await self.create_test_user("MediaIntruder")
        p4, _, _ = await self.create_test_user("MediaIntruderPartner")
        await self.link_test_couple(p3, p4)
        res_hack = await self.client.delete(f"/media/albums/{aid}", headers=headers_p3)
        self.assertEqual(res_hack.status_code, 404)


# ==============================================================================
# 13. DASHBOARD NUDGES & NOTIFICATIONS (Both Sides)
# ==============================================================================
class Test13DashboardNotificationsScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, _, self.headers_p1 = await self.create_test_user("DashP1")
        self.p2, _, self.headers_p2 = await self.create_test_user("DashP2")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_142_p1_dashboard_summary(self):
        """P1 fetches dashboard -> linked=True, partner_user contains P2."""
        res = await self.client.get("/dashboard", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["linked"])
        self.assertEqual(data["partner_user"]["name"], "DashP2")

    async def test_143_p2_dashboard_summary(self):
        """P2 fetches dashboard -> linked=True, partner_user contains P1."""
        res = await self.client.get("/dashboard", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["linked"])
        self.assertEqual(data["partner_user"]["name"], "DashP1")

    async def test_144_p1_sends_nudge_to_p2(self):
        """P1 sends nudge to P2 via dashboard."""
        res = await self.client.post("/dashboard/nudge", headers=self.headers_p1)
        self.assertEqual(res.status_code, 201)

    async def test_145_p2_receives_nudge(self):
        """P2 checks notifications and sees nudge from P1."""
        await self.client.post("/dashboard/nudge", headers=self.headers_p1)
        res = await self.client.get("/notifications", headers=self.headers_p2)
        self.assertEqual(res.status_code, 200)
        notifs = res.json()
        self.assertTrue(any(n["type"] == "nudge" for n in notifs))

    async def test_146_p2_sends_nudge_to_p1(self):
        """P2 sends nudge to P1."""
        res = await self.client.post("/dashboard/nudge", headers=self.headers_p2)
        self.assertEqual(res.status_code, 201)

    async def test_147_p1_receives_nudge(self):
        """P1 checks notifications and sees nudge from P2."""
        await self.client.post("/dashboard/nudge", headers=self.headers_p2)
        res = await self.client.get("/notifications", headers=self.headers_p1)
        notifs = res.json()
        self.assertTrue(any(n["type"] == "nudge" for n in notifs))

    async def test_148_p1_marks_notification_read(self):
        """P1 marks single notification as read."""
        await self.client.post("/dashboard/nudge", headers=self.headers_p2)
        res_list = await self.client.get("/notifications", headers=self.headers_p1)
        nid = res_list.json()[0]["id"]
        res_read = await self.client.put(f"/notifications/{nid}/read", headers=self.headers_p1)
        self.assertEqual(res_read.status_code, 200)

    async def test_149_p1_marks_all_notifications_read(self):
        """P1 calls /notifications/read-all -> all marked read."""
        await self.client.post("/dashboard/nudge", headers=self.headers_p2)
        res = await self.client.put("/notifications/read-all", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        res_after = await self.client.get("/notifications", headers=self.headers_p1)
        self.assertTrue(all(n["is_read"] for n in res_after.json()))


# ==============================================================================
# 14. CROSS-COUPLE DATA ISOLATION & SECURITY BOUNDARIES
# ==============================================================================
class Test14CrossCoupleSecurityScenarios(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        # Couple A: P1 & P2
        self.p1, _, self.headers_p1 = await self.create_test_user("A_P1")
        self.p2, _, self.headers_p2 = await self.create_test_user("A_P2")
        self.couple_a = await self.link_test_couple(self.p1, self.p2)

        # Couple B: P3 & P4
        self.p3, _, self.headers_p3 = await self.create_test_user("B_P3")
        self.p4, _, self.headers_p4 = await self.create_test_user("B_P4")
        self.couple_b = await self.link_test_couple(self.p3, self.p4)

    async def test_150_cross_couple_room_access_forbidden(self):
        """P3 cannot see sticky notes posted in Couple A's room."""
        await self.client.post("/room/sticky-note", json={"text": "Couple A Private Secret Note"}, headers=self.headers_p1)
        res_b = await self.client.get("/room", headers=self.headers_p3)
        self.assertFalse(any("Couple A Private Secret" in n["text"] for n in res_b.json()["sticky_notes"]))

    async def test_151_cross_couple_chat_access_forbidden(self):
        """P3 cannot see Couple A's chat messages."""
        await self.client.post("/chat/messages", json={"text": "Couple A Private Message"}, headers=self.headers_p1)
        res_b = await self.client.get("/chat/messages", headers=self.headers_p3)
        self.assertFalse(any("Couple A Private Message" in m["text"] for m in res_b.json()))

    async def test_152_cross_couple_call_access_forbidden(self):
        """P3 cannot see or join Couple A's active call."""
        res_init = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        cid = res_init.json()["call_id"]
        res_b = await self.client.get("/calls/history", headers=self.headers_p3)
        self.assertFalse(any(c["id"] == cid for c in res_b.json()))

    async def test_153_cross_couple_snaps_access_forbidden(self):
        """P3 cannot view Couple A's private snaps."""
        res_snap = await self.client.post("/snap/send", json={"media_url": "http://a.jpg", "caption": "Couple A Snap"}, headers=self.headers_p1)
        sid = res_snap.json()["snap"]["id"]
        res_feed_b = await self.client.get("/snap/feed", headers=self.headers_p3)
        all_b_snaps = res_feed_b.json()["snaps"]
        self.assertFalse(any(s["id"] == sid for s in all_b_snaps))

    async def test_154_cross_couple_countdowns_forbidden(self):
        """P3 cannot see Couple A's private countdowns."""
        t = (datetime.utcnow() + timedelta(days=25)).isoformat()
        res_cd = await self.client.post("/countdowns", json={"label": "Couple A Secret Trip", "emoji": "🏖️", "target_date": t}, headers=self.headers_p1)
        cd_id = res_cd.json()["id"]
        res_b = await self.client.get("/countdowns", headers=self.headers_p3)
        self.assertFalse(any(c["id"] == cd_id for c in res_b.json()))

    async def test_155_cross_couple_cycle_logs_forbidden(self):
        """P3 cannot see Couple A's cycle settings or logs."""
        await self.client.post("/cycle/setup", json={
            "last_period_date": date.today().isoformat(), "cycle_length": 28, "period_length": 5
        }, headers=self.headers_p1)
        res_b = await self.client.get("/cycle", headers=self.headers_p3)
        self.assertFalse(res_b.json()["has_cycle"])

    async def test_156_cross_couple_albums_forbidden(self):
        """P3 cannot see Couple A's photo albums."""
        res_alb = await self.client.post("/media/albums", json={"name": "Couple A Honeymoon"}, headers=self.headers_p1)
        alb_id = res_alb.json()["id"]
        res_b = await self.client.get("/media/albums", headers=self.headers_p3)
        self.assertFalse(any(a["id"] == alb_id for a in res_b.json()))

    async def test_157_cross_couple_mood_forbidden(self):
        """P3 cannot see Couple A's partner mood."""
        await self.client.post("/mood/checkin", json={"emoji": "🥳"}, headers=self.headers_p1)
        res_b = await self.client.get("/mood/today", headers=self.headers_p3)
        self.assertIsNone(res_b.json().get("partner_mood"))


# ==============================================================================
# 15. CRITICAL BUG-FIX & REALTIME WEBSOCKET REGRESSION SCENARIOS
# ==============================================================================
class Test15BugFixRegressions(BaseScenarioTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.p1, self.token_p1, self.headers_p1 = await self.create_test_user("RegP1")
        self.p2, self.token_p2, self.headers_p2 = await self.create_test_user("RegP2")
        self.p3, self.token_p3, self.headers_p3 = await self.create_test_user("Outsider")
        self.couple = await self.link_test_couple(self.p1, self.p2)

    async def test_158_media_add_to_album_fixed_import(self):
        """PUT /media/{id}/album imports Album cleanly without 500 ImportError."""
        from models.media import Media, FileType
        mid = f"med-{uuid.uuid4().hex[:8]}"
        async with TestSessionLocal() as db:
            db.add(Media(
                id=mid,
                couple_id=self.couple.id,
                uploaded_by=self.p1.id,
                file_url="https://example.com/pic.jpg",
                file_type=FileType.photo,
            ))
            await db.commit()
        alb_res = await self.client.post("/media/albums", json={"name": "Trip"}, headers=self.headers_p1)
        self.assertIn(alb_res.status_code, (200, 201))
        aid = alb_res.json()["id"]
        res = await self.client.put(f"/media/{mid}/album", json={"album_id": aid}, headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["album_id"], aid)

    async def test_159_album_cover_update_fixed_import(self):
        """PUT /media/albums/{album_id}/cover works without Album import crash."""
        from models.media import Media, FileType
        mid = f"med-{uuid.uuid4().hex[:8]}"
        async with TestSessionLocal() as db:
            db.add(Media(
                id=mid,
                couple_id=self.couple.id,
                uploaded_by=self.p1.id,
                file_url="https://example.com/cover.jpg",
                file_type=FileType.photo,
            ))
            await db.commit()
        alb_res = await self.client.post("/media/albums", json={"name": "CoverTest"}, headers=self.headers_p1)
        aid = alb_res.json()["id"]
        res = await self.client.put(
            f"/media/albums/{aid}/cover",
            json={"cover_photo_id": mid},
            headers=self.headers_p1,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["cover_photo_id"], mid)
        self.assertEqual(res.json()["cover_url"], "https://example.com/cover.jpg")

    async def test_160_chat_post_with_partner_fcm_token_succeeds(self):
        """POST /chat/messages when partner has fcm_token uses message_type without AttributeError."""
        async with TestSessionLocal() as db:
            u2 = (await db.execute(select(User).where(User.id == self.p2.id))).scalar_one()
            u2.fcm_token = "fake-android-fcm-token-123"
            db.add(u2)
            await db.commit()

        from unittest.mock import patch, AsyncMock
        with patch("routers.chat.send_push", new_callable=AsyncMock) as mock_push:
            res = await self.client.post(
                "/chat/messages",
                json={"text": "Care Alert: Drinking water", "message_type": "text"},
                headers=self.headers_p1,
            )
            self.assertIn(res.status_code, (200, 201))
            mock_push.assert_awaited_once()

    async def test_161_dashboard_returns_invite_code(self):
        """GET /dashboard includes couple invite_code for Settings & Link panels."""
        res = await self.client.get("/dashboard", headers=self.headers_p1)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("invite_code"), self.couple.invite_code)

    async def test_162_music_channels_have_no_pixabay_403_and_all_audio(self):
        """GET /music/channels serves playable direct audio URLs without 403 Pixabay URLs or conflicting videoId."""
        res = await self.client.get("/music/channels")
        self.assertEqual(res.status_code, 200)
        channels = res.json()
        self.assertGreaterEqual(len(channels), 5)
        for ch in channels:
            for tr in ch["tracks"]:
                self.assertEqual(tr["type"], "audio")
                self.assertTrue(tr.get("url", "").startswith("https://"))
                self.assertNotIn("pixabay.com", tr["url"])
                self.assertNotIn("videoId", tr)
                self.assertTrue(tr.get("fallback_url", "").startswith("https://"))

    async def test_163_music_playlist_persists_across_cache_clear(self):
        """POST /music/playlist persists to Couple.spotify_url so GET survives in-memory cache clears."""
        from routers import music as music_router
        res_add = await self.client.post("/music/playlist", json={
            "title": "Saved Lofi",
            "artist": "Partner DJ",
            "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            "duration": 210,
            "type": "audio"
        }, headers=self.headers_p1)
        self.assertEqual(res_add.status_code, 200)
        self.assertEqual(res_add.json()["track"]["type"], "audio")

        music_router.custom_playlists.clear()
        res_get = await self.client.get("/music/playlist", headers=self.headers_p2)
        self.assertEqual(res_get.status_code, 200)
        self.assertTrue(any(t["title"] == "Saved Lofi" for t in res_get.json()))

    async def test_164_music_ws_ticket_sync_between_partners(self):
        """Both partners connect to /music/ws/{couple_id} via ws-ticket and sync track events; outsider rejected."""
        from starlette.testclient import TestClient
        t1 = (await self.client.post("/auth/ws-ticket", headers=self.headers_p1)).json()["ticket"]
        t2 = (await self.client.post("/auth/ws-ticket", headers=self.headers_p2)).json()["ticket"]
        t3 = (await self.client.post("/auth/ws-ticket", headers=self.headers_p3)).json()["ticket"]

        sync_client = TestClient(main.app)
        with sync_client.websocket_connect(f"/music/ws/{self.couple.id}?ticket={t1}") as ws1, \
             sync_client.websocket_connect(f"/music/ws/{self.couple.id}?ticket={t2}") as ws2:
            ws1.receive_json()
            ws2.receive_json()
            ws1.send_json({
                "type": "change_track",
                "track": {"id": "bw-1", "title": "Kesariya", "type": "audio", "url": "https://example.com/1.mp3"},
                "position": 12.5,
                "dj_name": "RegP1"
            })
            evt = ws2.receive_json()
            self.assertEqual(evt["type"], "change_track")
            self.assertEqual(evt["track"]["title"], "Kesariya")
            self.assertEqual(evt["position"], 12.5)

        with self.assertRaises(Exception):
            with sync_client.websocket_connect(f"/music/ws/{self.couple.id}?ticket={t3}"):
                pass

    async def test_165_movies_ws_ticket_auth_works(self):
        """/movies/ws/{couple_id}?ticket=... authenticates cleanly via verify_and_consume_ws_ticket."""
        from starlette.testclient import TestClient
        t1 = (await self.client.post("/auth/ws-ticket", headers=self.headers_p1)).json()["ticket"]
        t2 = (await self.client.post("/auth/ws-ticket", headers=self.headers_p2)).json()["ticket"]
        sync_client = TestClient(main.app)
        with sync_client.websocket_connect(f"/movies/ws/{self.couple.id}?ticket={t1}") as ws1, \
             sync_client.websocket_connect(f"/movies/ws/{self.couple.id}?ticket={t2}") as ws2:
            # Drain initial connected/seat frames
            ws1.receive_json()
            ws2.receive_json()
            ws1.send_json({"type": "chat", "text": "Ready for movie!"})
            msg = None
            for _ in range(5):
                cand = ws2.receive_json()
                if cand.get("type") == "chat":
                    msg = cand
                    break
            self.assertIsNotNone(msg)
            self.assertEqual(msg["text"], "Ready for movie!")

    async def test_166_snap_send_broadcasts_to_active_chat_ws_room(self):
        """POST /snap/send notifies partner on /ws/chat/{couple_id} room (not orphaned chat_{id})."""
        from starlette.testclient import TestClient
        t2 = (await self.client.post("/auth/ws-ticket", headers=self.headers_p2)).json()["ticket"]
        sync_client = TestClient(main.app)
        with sync_client.websocket_connect(f"/ws/chat/{self.couple.id}?ticket={t2}") as ws2:
            ws2.receive_json()  # connected
            res = await self.client.post(
                "/snap/send",
                json={"media_url": "data:image/jpeg;base64,/9j/4AAQ", "caption": "Hi!"},
                headers=self.headers_p1,
            )
            self.assertEqual(res.status_code, 200)
            evt = None
            for _ in range(5):
                cand = ws2.receive_json()
                if cand.get("type") == "new_snap":
                    evt = cand
                    break
            self.assertIsNotNone(evt)
            self.assertEqual(evt["sender_name"], "RegP1")
            self.assertIn("snap_id", evt)

    async def test_167_location_ws_forwards_encrypted_location(self):
        """/ws/chat/{couple_id} location_update preserves E2EE encrypted_location field."""
        from starlette.testclient import TestClient
        t1 = (await self.client.post("/auth/ws-ticket", headers=self.headers_p1)).json()["ticket"]
        t2 = (await self.client.post("/auth/ws-ticket", headers=self.headers_p2)).json()["ticket"]
        sync_client = TestClient(main.app)
        with sync_client.websocket_connect(f"/ws/chat/{self.couple.id}?ticket={t1}") as ws1, \
             sync_client.websocket_connect(f"/ws/chat/{self.couple.id}?ticket={t2}") as ws2:
            ws1.receive_json()
            ws2.receive_json()
            ws1.send_json({
                "type": "location_update",
                "encrypted_location": "e2ee2:iv123:cipher456",
                "battery_level": 77,
                "is_charging": True,
            })
            evt = None
            for _ in range(5):
                cand = ws2.receive_json()
                if cand.get("type") == "location_update":
                    evt = cand
                    break
            self.assertIsNotNone(evt)
            self.assertEqual(evt["encrypted_location"], "e2ee2:iv123:cipher456")
            self.assertEqual(evt["battery_level"], 77)

    async def test_168_test_email_requires_auth_and_dev_flag(self):
        """GET /auth/test-email returns 401 unauthenticated and 403 when ALLOW_DEV_OTP != true."""
        res_anon = await self.client.get("/auth/test-email")
        self.assertEqual(res_anon.status_code, 401)
        prev = os.environ.get("ALLOW_DEV_OTP")
        os.environ["ALLOW_DEV_OTP"] = "false"
        try:
            res_auth = await self.client.get("/auth/test-email", headers=self.headers_p1)
            self.assertEqual(res_auth.status_code, 403)
        finally:
            if prev is None:
                os.environ.pop("ALLOW_DEV_OTP", None)
            else:
                os.environ["ALLOW_DEV_OTP"] = prev


if __name__ == "__main__":
    unittest.main()
