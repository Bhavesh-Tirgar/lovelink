# 💖 LoveLink — Streamlining & UI Decluttering Roadmap (v2.0)

## Master Invariants & Delivered Changes
1. **7 Deadweight Features Cut**: Our Universe, Heartbeat Touch, Daily Questions, Love Notes, Coupons, Bucket List, Comfort Box.
2. **Dashboard Stripped Clean**: Removed Mood Check-in and Nudge button; Hero Days Together + Partner Status/Time + Recent Memories Preview.
3. **4 Core Navigation Tabs**: 🏠 Home, 💬 Chat, 🏡 Studio, ✨ Hub.
4. **Studio Transformed**: Replaced heavy Three.js with official Libmoji / Friendmoji 2D/3D couple scenes (Couch Cuddle, Warm Hug, Coffee Toast, Spoon, Hand Hold, Kiss, High-Five).
5. **Chat Calling**: Direct 📞 Voice & 📹 Video call triggers inside Chat header; in-chat keyword search; long-press emoji reactions (`❤️`, `😂`, `🥺`, `🔥`, `😮`, `💋`).
6. **Hub Organized**: Categorized into 🎮 Play, 🌸 Care, 📸 Memories, 📍 Safety.
7. **Refined Dark Luxury**: Obsidian, slate, rose-gold accents, Spotify-style mini-player, sound FX with mute toggle.
8. **6 Critical Bug Fortifications**:
   - Render 504 cold-start auto-retry with warm progress screen in `api.js`.
   - Mobile sleep WebSocket infinite backoff with Visibility API listener in `useWebSocket.js`.
   - E2EE 6-digit Recovery PIN modal on device switch or cleared cookies.
   - WebRTC 5-second carrier NAT fallback to ZegoCloud relay.
   - Client UUID deduplication + message ticks (clock -> sent -> delivered).
   - Capacitor Android hardware back button hierarchical navigation stack.
9. **6 Real-Time Mutual Synchronization Rules**:
   - Chat live typing indicators & glowing presence ring.
   - Watch Room 2-second adaptive video buffer tolerance + Watch Cam floating reaction bubble.
   - Listen Together synced music player.
   - Doodle Board real-time continuous stroke coordinate streaming.
   - Games persistent board state in PostgreSQL (match pauses on disconnect) + Solo Bot practice mode.
   - Snap Map 15-second battery-balanced radar sync with auto km/miles.
   - Studio Libmoji instant mutual scene transition with floating hearts.
10. **Storage & Polish**: 10MB/50MB upload limits, Email OTP + Recovery PIN password reset, /scratch archival.

---

## Phases & Tasks

### Phase 1: Pruning Deadweight & Workspace Archival
- [x] Compress `/scratch` into `scratch_archive.zip` and remove loose scratch directory.
- [x] Delete frontend dead files: `OurUniverse.jsx`, `HeartbeatTouch.jsx`, `DailyQuestion.jsx`, `Notes.jsx`, `WriteNote.jsx`, `Coupons.jsx`, `CreateCoupon.jsx`, `BucketList.jsx`, `ComfortBox.jsx`.
- [x] Delete backend dead files: `routers/universe.py`, `models/universe.py`, `routers/notes.py`, `models/note.py`, `routers/coupons.py`, `models/coupon.py`, `routers/bucket_list.py`, `models/bucket_list.py`, `routers/comfort.py`, `models/comfort.py`, `routers/questions.py`, `models/question.py`.
- [x] Clean up `main.py` router mounts and lifespan DDL.
- [x] Clean up `database.py` socket resolution monkey patch.
- [x] Update `App.js` routes.

### Phase 2: NavigationDock & Hub Page
- [x] Rewrite `NavigationDock.jsx` with 4 core tabs (Home, Chat, Studio, Hub).
- [x] Build `lovelink-frontend/src/pages/Hub.jsx` with categorized sections (Play, Care, Memories, Safety).
- [x] Connect routes and verify tab transitions.

### Phase 3: Dashboard Redesign (Refined Dark Luxury)
- [x] Clean up `Dashboard.jsx`: remove Daily Questions, Mood check-in, Nudge button, and embedded SnapMap.
- [x] Build Hero Days Together card, partner time/city header, recent memories preview strip, and quick action shortcuts.
- [x] Implement Settings & Profile modal with Bitmoji ID input, sound effects toggle, and logout.

### Phase 4: Libmoji / Friendmoji Couple Studio
- [x] Build `libmoji.js` utility for Friendmoji couple comic templates.
- [x] Redesign `CozyRoom.jsx` with high-res Friendmoji scenes (Couch Cuddle, Hug, Coffee Toast, Spoon, Hand Hold, Kiss, High-Five).
- [x] Provide Bitmoji Avatar ID configuration modal + presets with WebSocket sync.

### Phase 5: Real-Time Sync, Bug Fortifications & Calling
- [x] Implement the Real-Time Sync rules (Typing indicators, 2s video sync, Watch Cam bubble, Doodle live stroke streaming, persistent game state + Solo Bot mode, 15s radar interval, mutual studio transition).
- [x] Implement in-chat keyword search & long-press message reactions (❤️, 😂, 🥺, 🔥, 😮, 💋).
- [x] Implement the Bug Guards (Cold Start retry in `api.js`, Visibility WebSocket reconnect in `useWebSocket.js`).
- [x] Add direct 📞 Voice & 📹 Video call buttons into `Chat.jsx` header.
- [x] Run full frontend production build backpressure (`react-scripts build` passed: -216.44 kB gzipped).
- [x] Run backend verification and syntax checks (`python -m compileall` passed: 0 errors).
