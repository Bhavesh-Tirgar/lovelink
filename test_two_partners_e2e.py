import os
import sys
import uuid
import asyncio
import unittest

# Ensure lovelink-backend is in sys.path
backend_dir = os.path.join(os.path.dirname(__file__), "lovelink-backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from httpx import AsyncClient, ASGITransport
import main
from database import AsyncSessionLocal
from models.user import User
from models.couple import Couple
from routers.auth import create_access_token, hash_password


class TestTwoPartnersEndToEnd(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Create unique IDs for this test run
        self.p1_id = f"test-p1-{uuid.uuid4().hex[:8]}"
        self.p2_id = f"test-p2-{uuid.uuid4().hex[:8]}"
        self.p1_email = f"{self.p1_id}@lovelink.app"
        self.p2_email = f"{self.p2_id}@lovelink.app"

        # Seed two distinct partner users into the database
        async with AsyncSessionLocal() as db:
            user1 = User(
                id=self.p1_id,
                email=self.p1_email,
                name="Aarav",
                password_hash=hash_password("Pass123!"),
                is_verified=True
            )
            user2 = User(
                id=self.p2_id,
                email=self.p2_email,
                name="Ananya",
                password_hash=hash_password("Pass123!"),
                is_verified=True
            )
            db.add_all([user1, user2])
            await db.commit()

        # Generate authentication tokens
        self.token_p1 = create_access_token(self.p1_id)
        self.token_p2 = create_access_token(self.p2_id)
        self.headers_p1 = {"Authorization": f"Bearer {self.token_p1}"}
        self.headers_p2 = {"Authorization": f"Bearer {self.token_p2}"}

        # Setup AsyncClient
        self.transport = ASGITransport(app=main.app)
        self.client = AsyncClient(transport=self.transport, base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()
        # Clean up created records
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select, or_, delete
            # Delete couple records associated with test users
            couples_res = await db.execute(
                select(Couple).where(
                    or_(
                        Couple.user1_id.in_([self.p1_id, self.p2_id]),
                        Couple.user2_id.in_([self.p1_id, self.p2_id])
                    )
                )
            )
            for c in couples_res.scalars().all():
                await db.delete(c)

            # Delete test users
            users_res = await db.execute(
                select(User).where(User.id.in_([self.p1_id, self.p2_id]))
            )
            for u in users_res.scalars().all():
                await db.delete(u)

            await db.commit()

    async def test_full_two_partner_journey(self):
        """Exhaustively test linking, room persistence, chat, calls, music, games, snaps, and mood between two partners."""
        
        # ──────────────────────────────────────────────────────────────────────────
        # 1. COUPLE LINKING FLOW
        # ──────────────────────────────────────────────────────────────────────────
        # Partner 1 generates invite
        res_invite = await self.client.post("/couples/generate-invite", headers=self.headers_p1)
        self.assertEqual(res_invite.status_code, 200, f"Generate invite failed: {res_invite.text}")
        invite_data = res_invite.json()
        invite_code = invite_data["invite_code"]
        couple_id = invite_data["couple_id"]
        self.assertEqual(len(invite_code), 6)

        # Partner 2 joins using Partner 1's invite code
        res_join = await self.client.post("/couples/join", json={"invite_code": invite_code}, headers=self.headers_p2)
        self.assertEqual(res_join.status_code, 200, f"Join couple failed: {res_join.text}")
        join_data = res_join.json()
        self.assertTrue(join_data["linked"])
        self.assertEqual(join_data["partner"]["name"], "Aarav")

        # Verify Partner 1 queries /couples/me and sees Partner 2 linked
        res_me_p1 = await self.client.get("/couples/me", headers=self.headers_p1)
        self.assertEqual(res_me_p1.status_code, 200)
        self.assertTrue(res_me_p1.json()["linked"])
        self.assertEqual(res_me_p1.json()["partner"]["name"], "Ananya")

        # Verify Partner 2 queries /couples/me and sees Partner 1 linked
        res_me_p2 = await self.client.get("/couples/me", headers=self.headers_p2)
        self.assertEqual(res_me_p2.status_code, 200)
        self.assertTrue(res_me_p2.json()["linked"])
        self.assertEqual(res_me_p2.json()["partner"]["name"], "Aarav")

        # ──────────────────────────────────────────────────────────────────────────
        # 2. VIRTUAL ROOM & PERSISTENCE (Notes, Wall Photos, Plant, Pet, Interactions)
        # ──────────────────────────────────────────────────────────────────────────
        # Partner 1 adds a sticky note
        res_note = await self.client.post("/room/sticky-note", json={"text": "Good morning my love! ☕❤️", "color": "pink"}, headers=self.headers_p1)
        self.assertEqual(res_note.status_code, 200)
        note_id = res_note.json()["id"]

        # Partner 2 fetches room and verifies note exists
        res_room_p2 = await self.client.get("/room", headers=self.headers_p2)
        self.assertEqual(res_room_p2.status_code, 200)
        notes = res_room_p2.json()["sticky_notes"]
        self.assertTrue(any(n["id"] == note_id for n in notes), "Partner 1 note not visible to Partner 2")

        # Partner 1 adds a wall photo
        res_photo = await self.client.post("/room/wall-photo", json={"url": "https://example.com/sunset.jpg", "caption": "Our Sunset Date"}, headers=self.headers_p1)
        self.assertEqual(res_photo.status_code, 200)
        photo_id = res_photo.json()["id"]

        # Partner 2 fetches room and verifies wall photo exists
        res_room_p2 = await self.client.get("/room", headers=self.headers_p2)
        photos = res_room_p2.json()["wall_photos"]
        self.assertTrue(any(p["id"] == photo_id for p in photos), "Partner 1 wall photo not visible to Partner 2")

        # Partner 1 deletes the wall photo
        res_del_photo = await self.client.delete(f"/room/wall-photo/{photo_id}", headers=self.headers_p1)
        self.assertEqual(res_del_photo.status_code, 200)
        self.assertTrue(res_del_photo.json()["deleted"])

        # Partner 2 fetches room and verifies photo is gone
        res_room_p2_after = await self.client.get("/room", headers=self.headers_p2)
        photos_after = res_room_p2_after.json()["wall_photos"]
        self.assertFalse(any(p["id"] == photo_id for p in photos_after), "Deleted photo still visible")

        # Partner 1 waters plant
        res_water = await self.client.post("/room/water-plant", headers=self.headers_p1)
        self.assertEqual(res_water.status_code, 200)
        self.assertGreaterEqual(res_water.json()["plant_level"], 1)

        # Partner 2 cuddles pet
        res_pet = await self.client.post("/room/pet", headers=self.headers_p2)
        self.assertEqual(res_pet.status_code, 200)
        self.assertGreaterEqual(res_pet.json()["pet_happiness"], 50)

        # Partner 1 triggers couple interaction
        res_hug = await self.client.post("/room/couple-interaction", json={"action": "hug"}, headers=self.headers_p1)
        self.assertEqual(res_hug.status_code, 200)
        self.assertEqual(res_hug.json()["action"], "hug")

        # Partner 2 checks room interaction state
        res_room_p2 = await self.client.get("/room", headers=self.headers_p2)
        self.assertEqual(res_room_p2.json()["couple_action"], "hug")

        # ──────────────────────────────────────────────────────────────────────────
        # 3. CHAT & EPHEMERAL SELF-DESTRUCTING MESSAGES
        # ──────────────────────────────────────────────────────────────────────────
        # Partner 1 sends standard message
        res_msg1 = await self.client.post("/chat/messages", json={"text": "Can't wait to see you tonight!", "message_type": "text"}, headers=self.headers_p1)
        self.assertEqual(res_msg1.status_code, 200)
        msg1_id = res_msg1.json()["id"]

        # Partner 2 retrieves chat messages
        res_chat_p2 = await self.client.get("/chat/messages", headers=self.headers_p2)
        self.assertEqual(res_chat_p2.status_code, 200)
        messages_p2 = res_chat_p2.json()
        self.assertTrue(any(m["id"] == msg1_id for m in messages_p2), "Message not delivered to Partner 2")

        # Partner 1 sends ephemeral secret message
        res_eph = await self.client.post("/chat/messages", json={"text": "Secret surprise at 8 PM!", "message_type": "text", "is_ephemeral": True, "burn_after_seconds": 30}, headers=self.headers_p1)
        self.assertEqual(res_eph.status_code, 200)
        eph_id = res_eph.json()["id"]

        # Partner 2 burns the message
        res_burn = await self.client.post(f"/chat/messages/{eph_id}/burn", headers=self.headers_p2)
        self.assertEqual(res_burn.status_code, 200)
        self.assertEqual(res_burn.json()["status"], "burned")

        # Verify message text is burned in chat history
        res_chat_after = await self.client.get("/chat/messages", headers=self.headers_p1)
        burned_msg = next(m for m in res_chat_after.json() if m["id"] == eph_id)
        self.assertIn("[Self-destructed message]", burned_msg["text"])

        # ──────────────────────────────────────────────────────────────────────────
        # 4. WEBRTC CALL INITIATION & ANSWERING
        # ──────────────────────────────────────────────────────────────────────────
        # Partner 1 initiates a voice call
        res_call = await self.client.post("/calls/initiate", json={"call_type": "voice"}, headers=self.headers_p1)
        self.assertEqual(res_call.status_code, 200)
        call_id = res_call.json()["call_id"]
        room_id = res_call.json()["room_id"]
        self.assertTrue(room_id.startswith("ll_"))

        # Partner 2 answers the call
        res_ans = await self.client.post(f"/calls/{call_id}/answer", headers=self.headers_p2)
        self.assertEqual(res_ans.status_code, 200)
        self.assertEqual(res_ans.json()["status"], "answered")
        self.assertEqual(res_ans.json()["room_id"], room_id)

        # Partner 2 verifies token access
        res_tok = await self.client.get(f"/calls/{call_id}/token", headers=self.headers_p2)
        self.assertEqual(res_tok.status_code, 200)
        self.assertEqual(res_tok.json()["status"], "answered")

        # Partner 1 ends call
        res_end = await self.client.post(f"/calls/{call_id}/end", headers=self.headers_p1)
        self.assertEqual(res_end.status_code, 200)
        self.assertTrue(res_end.json()["ended"])

        # ──────────────────────────────────────────────────────────────────────────
        # 5. MUSIC & SHARED PLAYLIST
        # ──────────────────────────────────────────────────────────────────────────
        # Get curated channels
        res_channels = await self.client.get("/music/channels")
        self.assertEqual(res_channels.status_code, 200)
        channels = res_channels.json()
        self.assertGreaterEqual(len(channels), 2)

        # Partner 1 adds a song to the shared couple playlist
        track_payload = {
            "title": "Raataan Lambiyan",
            "artist": "Jubin Nautiyal",
            "url": "https://cdn.pixabay.com/download/audio/tender.mp3",
            "type": "audio",
            "duration": 230
        }
        res_add_song = await self.client.post("/music/playlist", json=track_payload, headers=self.headers_p1)
        self.assertEqual(res_add_song.status_code, 200)

        # Partner 2 fetches couple playlist and verifies song is present
        res_plist = await self.client.get("/music/playlist", headers=self.headers_p2)
        self.assertEqual(res_plist.status_code, 200)
        playlist = res_plist.json()
        self.assertTrue(any(t["title"] == "Raataan Lambiyan" for t in playlist))

        # ──────────────────────────────────────────────────────────────────────────
        # 6. SNAPCHAT-LIKE EPHEMERAL SNAPS & STREAKS
        # ──────────────────────────────────────────────────────────────────────────
        # Partner 1 sends a romantic snap
        snap_payload = {
            "media_url": "https://example.com/test-snap.jpg",
            "caption": "Thinking of you right now! ✨",
            "filter": "romantic",
            "is_view_once": True
        }
        res_snap = await self.client.post("/snap/send", json=snap_payload, headers=self.headers_p1)
        self.assertEqual(res_snap.status_code, 200)
        snap_id = res_snap.json()["snap"]["id"]

        # Partner 2 checks snap feed
        res_feed = await self.client.get("/snap/feed", headers=self.headers_p2)
        self.assertEqual(res_feed.status_code, 200)
        feed_data = res_feed.json()
        self.assertGreaterEqual(feed_data["unread_count"], 1)

        # Partner 2 opens the snap
        res_open = await self.client.post(f"/snap/{snap_id}/open", headers=self.headers_p2)
        self.assertEqual(res_open.status_code, 200)
        self.assertEqual(res_open.json()["snap"]["status"], "opened")

        # Partner 2 reacts to the snap
        res_react = await self.client.post(f"/snap/{snap_id}/react", json={"reaction": "💖"}, headers=self.headers_p2)
        self.assertEqual(res_react.status_code, 200)
        self.assertEqual(res_react.json()["reaction"], "💖")

        # Partner 1 checks daily streak
        res_streak = await self.client.get("/snap/streak", headers=self.headers_p1)
        self.assertEqual(res_streak.status_code, 200)
        self.assertGreaterEqual(res_streak.json()["streak"], 1)

        # ──────────────────────────────────────────────────────────────────────────
        # 7. MOOD CHECKIN & PARTNER VISIBILITY
        # ──────────────────────────────────────────────────────────────────────────
        # Partner 1 checks in mood
        res_mood_in = await self.client.post("/mood/checkin", json={"emoji": "🥰", "note": "Blessed to have you"}, headers=self.headers_p1)
        self.assertEqual(res_mood_in.status_code, 200)

        # Partner 2 views today's mood
        res_mood_today = await self.client.get("/mood/today", headers=self.headers_p2)
        self.assertEqual(res_mood_today.status_code, 200)
        today_data = res_mood_today.json()
        self.assertIsNotNone(today_data["partner_mood"])
        self.assertEqual(today_data["partner_mood"]["emoji"], "🥰")
        self.assertEqual(today_data["partner_mood"]["note"], "Blessed to have you")


if __name__ == "__main__":
    unittest.main()
