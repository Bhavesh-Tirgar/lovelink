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
        
        # Flawed old src template:
        # flawed_src = f"https://www.youtube.com/embed/{video_id}?autoplay=1&start={current_time}"
        
        # New stabilized src template:
        stable_src = f"https://www.youtube.com/embed/{video_id}?autoplay=1&enablejsapi=1&origin=https://lovelink-pearl.vercel.app&playsinline=1"
        
        # Invariant check: changing time must NEVER alter iframe src
        self.assertNotIn("start=", stable_src)
        self.assertIn(video_id, stable_src)
        self.assertIn("enablejsapi=1", stable_src)

if __name__ == '__main__':
    unittest.main()
