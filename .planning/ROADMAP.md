go
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

### Phase 6: Snapchat-Style Friendmoji Couple Engine & Live Wardrobe
- [x] Task 6.1: Clean Action-Outfit registry and theme resolver in `RomanticCoupleScene.jsx` & `libmoji.js`.
- [x] Task 6.2: Replace flat tilted cardboard PNG hacks with dedicated high-fidelity SVG couple scenes (`couch`, `hug`, `kiss`, `hand_hold`, `spoon`, `toast`).
- [x] Task 6.3: Implement live working wardrobe styling (6 styles: Varsity, Date Night Velvet, Silk Pajamas, Royal Kurta/Lehenga, Summer Resort, Obsidian Stealth) affecting both avatars.
- [x] Task 6.4: Integrate live couple presence banner into `Dashboard.jsx`.
- [x] Task 6.5: Fortify `routers/room.py` with action whitelist validation (`ALLOWED_ACTIONS`) and socket broadcasting.
- [x] Task 6.6: Production build backpressure (`react-scripts build`) + backend compilation verification.

### Phase 7: Genuine Snapchat 3D Cartoon Bitmojis, Full-Song YouTube Engine & Complete UI Overhaul
- [x] Task 7.1: Build `Bitmoji3DStage.jsx` in Three.js with Pixar/Snapchat stylized cartoon Bitmojis (big glossy eyes, smooth toon skin, modular streetwear, physical contact animations for kiss, hug, dance, toast).
- [x] Task 7.2: Integrate `Bitmoji3DStage.jsx` into `CozyRoom.jsx` with full action buttons & live WebSocket partner sync.
- [x] Task 7.3: Fortify `MusicContext.jsx` & `FloatingMusicPlayer.jsx` with embedded YouTube Iframe audio engine for 100% full songs without 30s cutoffs.
- [x] Task 7.4: Overhaul app UI across Dashboard, Room, Chat, Hub & NavigationDock for Web and Android APK.
- [x] Task 7.5: Run full frontend build (`react-scripts build`) & backend verification (`compileall`).
- [x] Task 7.6: Atomic Git commit and push to `origin main` to trigger GitHub Actions Android APK build.

### Phase 8: Authentic Snapchat Profile 3D Bitmojis & Complete Gimmick Removal
- [x] Task 8.1: Eliminate all tacky gimmicks (yellow Snapchat cards, ghost icons, fake streaks, canned speech bubbles).
- [x] Task 8.2: Build `SnapchatBitmojiStage.jsx` with high-resolution authentic 3D Bitmoji couple models on Refined Dark Luxury obsidian stage.
- [x] Task 8.3: Implement realistic physical contact movements for Kiss, Warm Hug, Coffee Toast, Velvet Couch Cuddle, and Slow Dance.
- [x] Task 8.4: Add 3D perspective parallax depth with gyroscopic / pointer response and floor reflection grid.
- [x] Task 8.5: Compile frontend bundle with 0 errors and 0 warnings.
- [x] Task 8.6: Atomic commit & push to `origin main` to trigger OTA Android APK update.
