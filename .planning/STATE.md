# Project State — LoveLink 3D Avatar Studio & Couple Interactions

## Current Milestone: Authentic 3D Couple Interactions & Harmonized Skin Tones

### Decisions & Invariants
1. **Skin Tone Matching & Negative UV Texture Wrapping**:
   - `cleanSkinTex` configured with `wrapS = THREE.RepeatWrapping` and `wrapT = THREE.RepeatWrapping` to correctly handle `female_avatar.glb` negative UV coordinates on hand meshes (`u = -0.892, v = -0.955`), eliminating chalky ghost-white hands.
   - Calibrated `SKIN_TONES` palette using luminance compensation. Male displays natural photographic ReadyPlayerMe texture (`boyHex: 0xffffff`) and female rendered tone matches within < 3% color delta (`girlHex: 0xce927b`).
2. **Avatar Eye-Level Height Alignment**:
   - Girl scaled to `1.18` ($y \approx 1.53\text{m}$) and Boy scaled to `0.89` ($y \approx 1.54\text{m}$).
   - Perfectly harmonizes character proportions and eliminates the height disparity.
3. **True Touching Lip-to-Lip Kiss**:
   - Avatars step in to intimate touching proximity ($x = \pm 0.095\text{m}$).
   - Complementary head rotations ($y = \pm 0.48\text{ rad}$, $z = \pm 0.12\text{ rad}$, $x = 0.08\text{ rad}$) align faces directly for intimate lip-to-lip contact without mesh intersection.
4. **Authentic Couple Hug**:
   - Step into touching chest-to-chest embrace ($x = \pm 0.082\text{m} \pm \text{squeeze}$).
   - Full two-arm wrapping: girl wraps around boy's neck and waist; boy wraps around girl's upper back and waist.
   - Heads rest lovingly on each other's shoulders with gentle breathing squeeze motion.
5. **3D Ceramic Coffee Mugs Clink Contact**:
   - Procedural ceramic coffee mugs attached to girl's `LeftHand` and boy's `RightHand`.
   - Forward kinematics calibrated so cup rims physically meet at the exact center $(x = 0, y \approx 1.16\text{m}, z \approx 0.15\text{m})$ with joyful tap recoil.
6. **Graceful Resting Hand Posture**:
   - Wrists rest downward without outward splay (`rotation.set(0.04, \mp 0.02, 0.0)`).
   - Fingers relaxed with soft inward curl without hyperextension.
7. **Full CSP & Worker Protection**:
   - `<meta http-equiv="Content-Security-Policy">` in `lovelink-frontend/public/index.html` + `vercel.json` in repo root and frontend directory.
   - Grants `worker-src 'self' blob:` and `script-src 'self' ... blob:`, completely resolving worker and texture blob blocking on Vercel deployments.

### Task Progress
- [x] Elephant & Debug Mode root cause analysis
- [x] Goldfish architectural review & boundary safety check
- [x] TDD Red Phase: isolated reproduction tests written & failed
- [x] Ralph Loop Green Phase: implemented minimal, verified code fixes
- [x] Production build backpressure verified: `Compiled successfully`
- [x] Atomic git commits pushed to `main` and synced to `security-fixes`
