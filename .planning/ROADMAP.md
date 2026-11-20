### Phase 4: Friendmoji Couple Comic Engine
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

### Phase 10: Purge Sliced Images & Crude Cylinders — Full Restoration of Real 3D GLB Humanoid Avatars
- [x] Task 10.1: Permanently delete `SnapchatBitmojiStage.jsx` and `Bitmoji3DStage.jsx`.
- [x] Task 10.2: Re-mount `Real3DAvatarStage.jsx` directly as primary 3D visualizer.
- [x] Task 10.3: Compile production build and push to `origin main`.

### Phase 11: True Cel-Shaded 3D Snapchat Bitmojis, Ambient Synced Music & Obsidian UI Overhaul
- [x] Task 11.1: Transform 3D avatars with `MeshToonMaterial`, 3-tone gradient ramp, toon rim highlights, youthful proportions (head bone 1.18x), rosy cheeks, and close couple proximity (±0.22m).
- [x] Task 11.2: Interactive 3D Wardrobe & Emote Drawer in `CozyRoom.jsx` with live WebSocket partner sync for all couple poses.
- [x] Task 11.3: Ambient Floating Music Player with Synthetic BPM Pulse Engine, Audio Visualizer & existing `/music/ws/{couple_id}` sync with autoplay unlock safeguard.
- [x] Task 11.4: App-Wide Obsidian Dark Luxury UI Revamp (`Layout.jsx`, `NavigationDock.jsx`, `Dashboard.jsx`) with mobile-optimized glass surfaces.
- [x] Task 11.5: Production build verification (`react-scripts build` passed with 0 errors).
- [x] Task 11.6: Atomic Git commit and push to `main` for live OTA deployment.

### Phase 12: Genuine Three.js WebGL 3D Snapchat Couple Studio & App-Wide UI Overhaul
- [x] Task 12.1: Permanently purged 2D PNG/JPG image cutouts from `SnapchatBitmojiStage.jsx`; mounted genuine Three.js WebGL 3D Canvas with 360° `OrbitControls`, studio lighting, and illuminated obsidian 3D circular podium.
- [x] Task 12.2: Cute proportional couple scale ($1.515\text{ m}$ Neha vs $1.56\text{ m}$ Bhavesh) with trendy streetwear wardrobe, hiding all corporate banker suits/ties/glasses from female avatar.
- [x] Task 12.3: Implemented working physical skeletal & transform bone animations for all 6 emotes: Toast Coffee (clinking mugs with recoil), Romantic Kiss (lip-to-lip + floating hearts), Warm Hug (embrace + squeeze breathing), Couch Cuddle (3D couch + snuggle), Dance Party (133 BPM beat bounce & hip sway), Wave Hello (14Hz waving oscillation).
- [x] Task 12.4: App-wide Obsidian Dark Luxury UI overhaul across `Dashboard.jsx`, `CozyRoom.jsx`, `Chat.jsx`, `Hub.jsx`, and `NavigationDock.jsx`.
- [x] Task 12.5: Production build verified (`react-scripts build` passed: 0 errors, 0 warnings; `python -m compileall` passed: 0 errors).
- [x] Task 12.6: Atomic commit and push to `origin main`.
