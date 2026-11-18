# Project State — LoveLink 3D Avatar Studio & Couple Interactions

## Current Milestone: Real 3D Boy Pants, Anatomical Female Hands, Harmonized Skin Tones & Expressive Emotes

### Decisions & Invariants
1. **Male 3D Tailored Long Pants vs Casual Shorts**:
   - Tailored 3D cylinder leg extensions (`createBoyPantExtensions`) bridge the male shorts hem ($y = 0.63\text{m}$) down to the top of footwear ($y = 0.16\text{m}$) with realistic calf curvature.
   - Dynamically bound to the selected `bottomItem.material` and toggled with `isPants !== false`.
   - Offers real long pants (Indigo Denim Jeans, Jet Black Slacks, Espresso Chinos, Slate Gray Trousers, Linen Slacks, Charcoal Cargos, Tailored Khaki, Utility Pants, Cyber Carbon) while preserving resort shorts.
2. **Female Left Hand Anatomical Flexion (Eliminating "Ghost Claw")**:
   - Fixed the sign negation bug in `curlFingers`: in `female_avatar.glb`, positive `rotation.x` curls fingers naturally forward into the palm for BOTH hands.
   - Reversed the previous negative rotation on the left hand that caused backward hyperextension, giving both hands graceful, relaxed, human resting posture.
3. **Harmonized Melanin Human Skin Tones**:
   - Harmonized `SKIN_TONES` palette using luminance and chromaticity compensation between the male photographic texture (`boyHex: 0xffffff`) and female cartoon texture (`girlHex: 0xa9a9be`).
   - Ensures boy and girl match 100% in tone, warmth, and saturation across all 6 presets (`fair_warm`, `golden_honey`, `warm_almond`, `bronze`, `chestnut`, `espresso`).
4. **Relaxed Portrait Couple Spacing**:
   - Spacing set to $x = \pm 0.43\text{m}$ in idle, providing a comfortable 10cm clear space between inner hands.
   - Completely prevents inner hands from clipping into each other or creating a confusing overlapping "double-hand ghost" artifact.
5. **Expressive Human Emotes**:
   - **Kiss**: Avatars step in to intimate contact ($x = \pm 0.085\text{m}$). Girl tilts head lovingly up ($+0.12\text{ rad}$), boy leans gently down ($-0.04\text{ rad}$), and both turn faces ($\pm 0.52\text{ rad}$) for authentic lip-to-lip contact.
   - **Hug**: Authentic close embrace ($x = \pm 0.075\text{m} \pm \text{squeeze}$). Girl wraps left arm over shoulder and right around waist; boy wraps right across upper back and left around waist. Heads rest lovingly on partner's shoulder with rhythmic breathing squeeze.
   - **Coffee Toast**: 3D ceramic mugs attached to inner hands (girl LeftHand, boy RightHand) meet at center $(x = 0, y = 1.15\text{m}, z = 0.25\text{m})$ with joyful tap recoil.
6. **Decluttered Studio UI**:
   - Stripped useless viewport clutter: raw GLB upload button, 360 spin auto-rotate, and duplicate snapshot button.
   - Preserves a clean, minimal top bar (`Real 3D WebGL`, `Wardrobe`, `Customize 3D`).
   - Boy only controls boy wardrobe, girl only controls girl wardrobe.
7. **Production Build Cleanliness**:
   - Zero unused imports or state (`setLocalMyGlb`, `RotateCw`, `Upload`, `Camera`), passing `react-scripts build` under `CI=true`.

### Task Progress
- [x] Elephant & Debug Mode root cause analysis
- [x] Goldfish architectural review & boundary safety check
- [x] TDD Red Phase: isolated reproduction tests written & failed
- [x] Ralph Loop Green Phase: implemented minimal, verified code fixes
- [x] Production build backpressure verified: `Compiled successfully`
- [x] Atomic git commit pushed to `main` and synced to `security-fixes`
