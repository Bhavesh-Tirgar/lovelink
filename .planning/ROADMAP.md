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
