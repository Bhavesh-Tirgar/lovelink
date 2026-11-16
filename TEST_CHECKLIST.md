# 🧪 LoveLink Security & Functionality Test Checklist

Follow these step-by-step instructions to manually verify the security fixes and core functionality.

---

## 1. Authentication & Sign-In Verification

- [ ] **Email & Password Login**:
  - Open `/login`.
  - Enter registered email and password.
  - Verify successful authentication and redirection to `/dashboard` (or `/link` if unlinked).
- [ ] **Email OTP Flow**:
  - Open `/login` -> Click *"Login with OTP instead"*.
  - Enter registered email and click *"Send OTP"*.
  - Verify receipt of a 6-digit code via email within 30 seconds.
  - Enter the 6 digits and verify successful login.
- [ ] **Google OAuth Sign-In**:
  - Open `/login` -> Click *"Continue with Google"*.
  - Verify the Google authentication prompt appears without a `403 disallowed_useragent` error.
  - Complete Google login and verify account creation/login.

---

## 2. Real E2EE Chat & Cryptographic Verification

- [ ] **Key Generation & Storage**:
  - Open DevTools -> **Application** tab -> **IndexedDB** -> `lovelink_crypto_db` -> `keys`.
  - Verify `lovelink_ecdh_private_key` exists as a `CryptoKey` with `extractable: false`.
  - Verify `lovelink_ecdh_public_jwk` exists with `{ crv: "P-256", kty: "EC", x: "...", y: "..." }`.
- [ ] **Message Encryption (`e2ee2:` format)**:
  - Open Chat between Partner A and Partner B.
  - Send a test message (e.g. *"Hello Love"*).
  - Open DevTools -> **Network** tab -> Filter **WS** (WebSockets).
  - Inspect the outgoing WebSocket frame:
    - Verify `content` begins with **`e2ee2:`** followed by base64-encoded IV and ciphertext.
    - Confirm plaintext does **NOT** appear anywhere in the network frame or database.
- [ ] **Message Decryption Across Devices**:
  - Log in as Partner B on a separate browser or incognito window.
  - Verify that Partner B sees the message decrypted as *"Hello Love"*.
- [ ] **Backward Compatibility**:
  - Verify that older messages prefixed with `e2ee:` remain fully readable and decrypted.

---

## 3. Safety Code (Anti-MITM Verification)

- [ ] **Fingerprint Matching**:
  - In Chat header, click the **`E2EE Verified`** button.
  - Verify the modal opens displaying:
    - 4 romantic emojis (e.g. `💖 🌟 🔒 🕊️`)
    - 12-digit fingerprint (`XXXX - XXXX - XXXX`)
  - Compare with Partner B's screen:
    - Both partners must see the **exact same** 12 digits and 4 emojis.

---

## 4. Key Backup & New-Phone Restoration

- [ ] **Creating a Backup**:
  - In the Safety Code modal, click *"Set Up Recovery PIN"*.
  - Enter a 6-digit PIN (e.g. `123456`) and click *"Save Encrypted Backup"*.
  - Verify toast notification: *"E2EE Recovery Backup saved! 🔐"*.
- [ ] **Restoring on a New Device**:
  - Open an Incognito window or clear browser IndexedDB.
  - Log in with your account.
  - Call `restorePrivateKeyFromBackup("123456", backupBundle)`.
  - Verify the private key is restored in IndexedDB and chat decryption works seamlessly.

---

## 5. Secret Notes Vault (310k Iterations & Salt)

- [ ] **Writing an Encrypted Note**:
  - Navigate to `/notes/write`.
  - Check *"Keep Secret & Encrypted in Vault"*.
  - Enter your PIN and write a secret message.
  - Send the note.
- [ ] **Decryption with Random Salt**:
  - In `/notes`, locate the secret note.
  - Enter the PIN to unlock.
  - Verify the note decrypts cleanly.
  - Inspect the network payload: verify `secret_ciphertext` starts with `v2:` followed by the unique 16-byte random salt.


---

## 6. Phase 2: Sensitive Data Protection Verification

- [ ] **Cycle Logs Encryption**:
  - Open `/cycle`.
  - Log daily symptoms (e.g., flow: medium, cramps: mild, note: *"feeling tender"*).
  - Open DevTools -> **Network** tab -> Inspect request to `/cycle/log`.
  - Verify `encrypted_payload` is present and contains `e2ee2:...` (or `e2ee:...`).
  - Verify that the server database row in `cycle_logs` stores `encrypted_payload` while plaintext columns are `NULL`.
  - Refresh the page and verify symptoms are decrypted and rendered accurately.
- [ ] **Live Location Encryption & TTL Expiration**:
  - Open `/map`.
  - In DevTools -> **Network** tab -> Inspect WebSocket frames or POST `/dashboard/status`.
  - Verify `encrypted_location` contains ciphertext.
  - Verify partner marker updates accurately on partner's map.
  - Wait 15 minutes (or simulate TTL): verify that the server clears stale GPS coordinates from memory (`latitude: null, longitude: null, is_stale: true`).
- [ ] **Mood Note Encryption**:
  - On `/dashboard`, choose an emoji and type a private mood note.
  - Submit check-in.
  - In DevTools -> **Network** tab -> Inspect POST `/mood/checkin`:
    - Verify `note` field transmits ciphertext (`e2ee2:...` or `e2ee:...`).
  - Verify partner's dashboard decrypts and displays the mood note.
- [ ] **Call Log Retention Pruning**:
  - Verify backend scheduler job `prune_stale_sensitive_data` is registered.
  - Query `calls` table: verify call records older than 30 days are automatically deleted.

---

## 7. Phase 3: Auth Hardening & Token Rotation Verification

- [ ] **Access & Refresh Token Issuance**:
  - Perform login or verify OTP.
  - Open DevTools -> **Application** tab -> **Local Storage**.
  - Verify both `token` (30-min access token) and `refresh_token` (64-character token) are present.
- [ ] **Transparent Token Refresh on 401**:
  - In DevTools -> **Console**, invalidate the access token manually:
    `localStorage.setItem('token', 'invalid_expired_token')`
  - Navigate to `/notes` or trigger any API call.
  - In DevTools -> **Network** tab:
    - Observe the initial 401 response.
    - Observe automatic request to `POST /auth/refresh` sending `{ refresh_token: "..." }`.
    - Observe 200 response with new `access_token` and rotated `refresh_token`.
    - Observe the original request being retried and succeeding without user interruption or page reload.
- [ ] **Refresh Token Rotation & Single-Use Enforcement**:
  - Attempt to send the old, used `refresh_token` to `POST /auth/refresh` via Postman or curl.
  - Verify the server rejects it with `401 Invalid refresh token`.
- [ ] **User Logout & Token Revocation**:
  - In the navigation dock, click **Logout**.
  - Inspect DevTools -> **Network** tab: verify `POST /auth/logout` is called with the current `refresh_token`.
  - Verify local storage is cleared and redirected to `/login`.
  - In the database, verify the corresponding row in `refresh_tokens` has `revoked = true`.
- [ ] **OTP 5-Attempt Lockout & Invalidation**:
  - Request an OTP on `/login`.
  - Enter an incorrect OTP 5 times.
  - On the 5th attempt, verify error: *"Too many failed attempts. This OTP has been invalidated for your security. Please request a new one."*
  - In the database, verify `user.otp_code` has been wiped to `NULL`.
- [ ] **Login Lockout Protection**:
  - On `/login`, enter an existing email with an incorrect password 5 times.
  - On the 5th attempt, verify the account is locked for 15 minutes.
  - Attempt a 6th login: verify error: *"Account temporarily locked due to repeated failed attempts. Please try again in 15 minutes."*
- [ ] **Generic Error Anti-Enumeration**:
  - Submit login with a non-existent email address.
  - Verify response returns `401 Invalid email or password` (no revelation that the email does not exist).

---

## 8. Phase 4: API, WebSocket & IDOR Security Verification

- [ ] **CORS Origin Restriction**:
  - Send an `OPTIONS` preflight request with an untrusted origin:
    `curl -I -X OPTIONS http://localhost:8000/auth/me -H "Origin: https://evil-site.com"`
  - Verify that `Access-Control-Allow-Origin` is **NOT** present or does not permit `https://evil-site.com`.
  - Send request with `Origin: https://lovelink-pearl.vercel.app`:
    Verify `Access-Control-Allow-Origin: https://lovelink-pearl.vercel.app` is returned.
- [ ] **WebSocket Unauthorized Couple Access**:
  - Connect to WebSocket for another couple (e.g. `/ws/foreign-couple-uuid?token=<my_token>`).
  - Verify the WebSocket handshake is immediately rejected with close code `4003 Forbidden`.
- [ ] **WebSocket 64KB Frame Limit**:
  - Send a payload larger than 64KB over the WebSocket connection.
  - Verify the server terminates the connection with code `1009 Message exceeds 64KB size limit`.
- [ ] **IDOR Protection Across Routes**:
  - Attempt to fetch or answer another couple's call: `GET /calls/{foreign_call_id}/token`.
  - Verify server returns `404 Not Found` (never leaks data).
  - Attempt to stream another couple's movie: `GET /movies/{foreign_movie_id}/stream`.
  - Verify server rejects with `404 Not Found`.
- [ ] **Frontend Security Headers**:
  - Inspect response headers for `lovelink-pearl.vercel.app`:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: SAMEORIGIN`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Content-Security-Policy`

---

## 9. Phase 5: Reliability & Storage Safeguards Verification

- [ ] **Lightweight `/health` Endpoint**:
  - Run `curl -i http://localhost:8000/health`:
    - Verify response status: `HTTP/1.1 200 OK`.
    - Verify body: `{"status":"ok","service":"LoveLink Backend API"}`.
    - Confirm zero database queries are executed.
- [ ] **External Uptime Pinger Configuration**:
  - Verify external pinger (UptimeRobot / cron-job.org) can hit `https://<backend-url>/health` every 10 minutes.
- [ ] **Neon PostgreSQL Storage Verification**:
  - Verify `Media`, `Movie`, `Message`, and `LoveNote` tables only store URL strings (`VARCHAR`/`TEXT`), with no `BYTEA` or binary blobs.
  - Upload a test photo in Chat or Albums: verify the file is stored in Cloudflare R2 / filesystem, and the database only stores the URL string.
