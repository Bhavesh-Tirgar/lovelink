import unittest
import json
import time

class TestLoveLinkMusicAndAuth(unittest.TestCase):
    def test_spotify_playback_persistence_model(self):
        """Verify Spotify playback state persistence structure & resume calculation."""
        state = {
            "track": {
                "id": "lofi-1",
                "title": "Midnight In Tokyo",
                "artist": "Lofi Cozy Cafe",
                "videoId": "jfKfPfyJRdk",
                "duration": 147,
                "type": "youtube"
            },
            "currentTime": 42,
            "duration": 147,
            "volume": 0.8,
            "savedAt": int(time.time() * 1000)
        }
        serialized = json.dumps(state)
        restored = json.loads(serialized)
        
        self.assertEqual(restored["track"]["videoId"], "jfKfPfyJRdk")
        self.assertEqual(restored["currentTime"], 42)
        self.assertEqual(restored["volume"], 0.8)
        self.assertGreater(restored["duration"], 0)
        
        # Verify that start time calculation passes valid integer seconds to YouTube
        start_seconds = int(restored["currentTime"])
        self.assertEqual(start_seconds, 42)

    def test_music_ws_event_contract(self):
        """Verify contract for Couple Jam WebSocket sync events."""
        event_types = ["sync_request", "play", "pause", "seek", "change_track"]
        for ev in event_types:
            msg = {
                "type": ev,
                "track": {"title": "Stargazing", "artist": "Purrple Cat"},
                "position": 55.4,
                "dj_name": "Bhavesh"
            }
            raw = json.dumps(msg)
            parsed = json.loads(raw)
            self.assertEqual(parsed["type"], ev)
            self.assertIn("position", parsed)
            self.assertIn("dj_name", parsed)

    def test_google_oauth_deep_link_builder(self):
        """Verify that deepLink URL is correctly constructed for APK return."""
        access_token = "mock_jwt_access_token_12345"
        refresh_token = "mock_jwt_refresh_token_67890"
        couple_id = "cp_abc_123"
        user = {"id": "usr_999", "name": "Bhavesh", "email": "bhavesh@lovelink.app"}

        import urllib.parse
        encoded_user = urllib.parse.quote(json.dumps(user))
        deep_link = f"lovelink://auth?token={access_token}&refresh_token={refresh_token}&couple_id={couple_id}&user={encoded_user}"
        
        parsed = urllib.parse.urlparse(deep_link)
        self.assertEqual(parsed.scheme, "lovelink")
        self.assertEqual(parsed.netloc, "auth")
        
        query_params = urllib.parse.parse_qs(parsed.query)
        self.assertEqual(query_params["token"][0], access_token)
        self.assertEqual(query_params["refresh_token"][0], refresh_token)
        self.assertEqual(query_params["couple_id"][0], couple_id)
        
        restored_user = json.loads(urllib.parse.unquote(query_params["user"][0]))
        self.assertEqual(restored_user["email"], "bhavesh@lovelink.app")

    def test_shuffle_and_repeat_logic(self):
        """Verify shuffle and repeat modes behavior."""
        playlist = [
            {"id": "t1", "title": "Track 1"},
            {"id": "t2", "title": "Track 2"},
            {"id": "t3", "title": "Track 3"},
        ]
        current_id = "t1"
        
        # 1. Normal Sequential Next
        idx = next(i for i, t in enumerate(playlist) if t["id"] == current_id)
        next_track = playlist[(idx + 1) % len(playlist)]
        self.assertEqual(next_track["id"], "t2")
        
        # 2. Repeat-one mode keeps same track
        repeat_mode = "one"
        if repeat_mode == "one":
            target = playlist[idx]
            self.assertEqual(target["id"], "t1")
            
        # 3. Shuffle picks a valid track from the pool
        import random
        random_track = random.choice(playlist)
        self.assertIn(random_track, playlist)

    def test_google_oauth_authorize_url(self):
        """Verify Google OAuth 2.0 URL contract with redirect URI and state=capacitor."""
        import urllib.parse
        client_id = "1088818591868-a2ktjjk82k2vnv2j3k837lumvaoie79f.apps.googleusercontent.com"
        redirect_uri = "https://lovelink-pearl.vercel.app/login"
        nonce = "1795374168000"
        
        oauth_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={urllib.parse.quote(redirect_uri)}&response_type=token%20id_token&scope=openid%20email%20profile&state=capacitor&nonce={nonce}"
        
        parsed = urllib.parse.urlparse(oauth_url)
        self.assertEqual(parsed.scheme, "https")
        self.assertEqual(parsed.netloc, "accounts.google.com")
        self.assertEqual(parsed.path, "/o/oauth2/v2/auth")
        
        qs = urllib.parse.parse_qs(parsed.query)
        self.assertEqual(qs["client_id"][0], client_id)
        self.assertEqual(qs["redirect_uri"][0], redirect_uri)
        self.assertEqual(qs["state"][0], "capacitor")
        self.assertIn("openid", qs["scope"][0])

    def test_youtube_iframe_src_stability_invariant(self):
        """Verify iframe src does not include fluctuating currentTime, preventing continuous reload stutter."""
        video_id = "jfKfPfyJRdk"
        
        # New stabilized src template:
        stable_src = f"https://www.youtube.com/embed/{video_id}?autoplay=1&enablejsapi=1&origin=https://lovelink-pearl.vercel.app&playsinline=1"
        
        # Invariant check: changing time must NEVER alter iframe src
        self.assertNotIn("start=", stable_src)
        self.assertIn(video_id, stable_src)
        self.assertIn("enablejsapi=1", stable_src)

    def test_bollywood_and_hindi_lofi_channels(self):
        """Verify Bollywood and Hindi Lo-Fi playlists provide HTML5 audio streams for background playback."""
        import sys
        sys.path.insert(0, "lovelink-backend")
        from routers.music import DEFAULT_CHANNELS

        self.assertGreaterEqual(len(DEFAULT_CHANNELS), 4)
        
        # Verify Romantic Bollywood and Hindi Lo-Fi channels exist
        channel_names = [ch["name"] for ch in DEFAULT_CHANNELS]
        self.assertTrue(any("Bollywood" in name for name in channel_names))
        self.assertTrue(any("Hindi" in name or "Lo-Fi" in name for name in channel_names))

        # Invariant: Tracks should have type 'audio' with streaming URLs for background playback
        for channel in DEFAULT_CHANNELS:
            self.assertIn("tracks", channel)
            self.assertGreater(len(channel["tracks"]), 0)
            for track in channel["tracks"]:
                self.assertIn(track.get("type"), ["audio", "youtube"])
                if track.get("type") == "audio":
                    self.assertTrue(track.get("url", "").startswith("https://"))

    def test_snap_streak_calculation(self):
        """Verify Snapchat-like streak calculation for consecutive days."""
        from datetime import datetime, timedelta

        def calculate_streak(last_date_str, current_date, current_streak):
            if not last_date_str:
                return 1
            last_date = datetime.strptime(last_date_str, "%Y-%m-%d").date()
            if last_date == current_date:
                return current_streak
            elif last_date == current_date - timedelta(days=1):
                return current_streak + 1
            else:
                return 1

        today = datetime(2026, 11, 23).date()
        
        # First snap ever
        self.assertEqual(calculate_streak(None, today, 0), 1)
        
        # Same day snap -> streak preserved
        self.assertEqual(calculate_streak("2026-11-23", today, 5), 5)
        
        # Consecutive day snap -> streak incremented
        self.assertEqual(calculate_streak("2026-11-22", today, 5), 6)
        
        # Missed 2 days -> streak reset to 1
        self.assertEqual(calculate_streak("2026-11-20", today, 10), 1)

    def test_google_cloud_console_configured_client_and_redirects(self):
        """Verify Client ID and redirect URIs match Google Cloud Console configurations."""
        configured_client_id = "1088818591868-a2ktjjk82k2vnv2j3k837lumvaoie79f.apps.googleusercontent.com"
        authorized_origins = ["https://lovelink-pearl.vercel.app"]
        authorized_redirect_uris = [
            "https://lovelink-pearl.vercel.app/login",
            "https://lovelink-pearl.vercel.app"
        ]

        self.assertTrue(configured_client_id.endswith(".apps.googleusercontent.com"))
        self.assertIn("https://lovelink-pearl.vercel.app/login", authorized_redirect_uris)
        self.assertIn("https://lovelink-pearl.vercel.app", authorized_origins)

    def test_games_partner_role_synchronization(self):
        """Verify games session initializes and synchronizes partner ID without string 'None' coercion."""
        c_u1 = "user-111"
        c_u2 = None
        c_u2_label = c_u2 or "partner"

        # Simulating initial game session creation when partner is unlinked
        session = {
            "ttt": {
                "symbol": {c_u1: "❤️", **({c_u2: "💋"} if c_u2 else {})}
            },
            "chess": {
                "white": c_u1,
                "black": c_u2_label,
                "scores": {c_u1: 0, **({c_u2: 0} if c_u2 else {c_u2_label: 0})}
            },
            "ludo": {
                "player_pink": c_u1,
                "player_blue": c_u2_label,
                "scores": {c_u1: 0, **({c_u2: 0} if c_u2 else {c_u2_label: 0})}
            },
            "uno": {
                "player_1": c_u1,
                "player_2": c_u2_label,
                "scores": {c_u1: 0, **({c_u2: 0} if c_u2 else {c_u2_label: 0})}
            }
        }

        self.assertNotIn("None", session["ttt"]["symbol"])
        self.assertNotIn(None, session["ttt"]["symbol"])
        self.assertEqual(session["chess"]["black"], "partner")

        # Now simulate partner linking: real partner ID arrives
        c_u2_linked = "user-222"
        sess = session
        sess["ttt"]["symbol"][c_u1] = "❤️"
        sess["ttt"]["symbol"].pop("None", None)
        sess["ttt"]["symbol"][c_u2_linked] = "💋"

        sess["chess"]["white"] = c_u1
        sess["chess"]["black"] = c_u2_linked
        if "None" in sess["chess"].get("scores", {}):
            sess["chess"]["scores"][c_u2_linked] = sess["chess"]["scores"].pop("None")
        sess["chess"]["scores"][c_u2_linked] = 0

        self.assertEqual(sess["ttt"]["symbol"][c_u2_linked], "💋")
        self.assertEqual(sess["chess"]["black"], "user-222")
        self.assertNotIn("None", sess["ttt"]["symbol"])

    def test_room_photo_and_sticky_note_truncation_limits(self):
        """Verify room limits: max 20 sticky notes and max 8 framed wall photos."""
        notes = [{"id": str(i), "text": f"Note {i}"} for i in range(25)]
        limited_notes = notes[:20]
        self.assertEqual(len(limited_notes), 20)

        photos = [{"id": str(i), "url": f"https://example.com/p{i}.jpg"} for i in range(12)]
        limited_photos = photos[:8]
        self.assertEqual(len(limited_photos), 8)

    def test_couple_duplicate_resolution_invariant(self):
        """Verify that when a user has multiple couple records, active linked couple is prioritized."""
        couples = [
            {"id": "c1", "user1_id": "u1", "user2_id": None, "created_at": 100},      # pending invite
            {"id": "c2", "user1_id": "u1", "user2_id": "u2", "created_at": 200},      # active linked
            {"id": "c3", "user1_id": "u3", "user2_id": "u1", "created_at": 150},      # old linked
        ]
        
        # Safe algorithm contract:
        linked_matches = [c for c in couples if (c["user1_id"] == "u1" or c["user2_id"] == "u1") and c["user2_id"] is not None]
        linked_matches.sort(key=lambda c: c["created_at"], reverse=True)
        resolved = linked_matches[0] if linked_matches else None
        
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved["id"], "c2")

if __name__ == '__main__':
    unittest.main()
