# 🛡️ LoveLink Security Policy & Architecture

## Security Overview
LoveLink employs a zero-trust, client-side cryptographic architecture designed to protect intimate couple communications from surveillance, database breaches, and unauthorized server access.

---

## 1. Cryptographic Specifications (Phase 1 Real E2EE)

### Device Keys & Identity
- **Algorithm**: ECDH over NIST P-256 (secp256r1).
- **Storage**: The private key is stored as a **non-extractable** `CryptoKey` inside the client's browser IndexedDB (`lovelink_crypto_db`). Once imported, the private key cannot be exported or extracted by client scripts.
- **Public Key Exchange**: Exported as JSON Web Key (JWK) format and stored in the `users.public_key` database column.

### Shared Secret Derivation
- When two linked partners communicate, each device fetches the partner's public key from `/couples/partner-key`.
- The shared secret is derived using `window.crypto.subtle.deriveKey` (ECDH) into a **256-bit AES-GCM** key.
- **Zero Server Exposure**: The server only acts as a public key registry. The private keys and the derived AES-GCM shared key never leave client memory.

### Message Encodings
- **Version 2 (`e2ee2:`)**:
  - Format: `e2ee2:<base64-iv>:<base64-ciphertext>`
  - Uses the 256-bit AES-GCM key derived via ECDH.
  - Initialized with a cryptographically secure 12-byte random IV (`window.crypto.getRandomValues`).
- **Legacy Fallback (`e2ee:`)**:
  - Legacy format used for backward-compatible decryption of historical messages.
  - Automatically recognized by `isE2EEMessage` and decrypted using the legacy couple key.

### Key Backup & Cloud Recovery
- Users can create an encrypted backup of their private key bundle so that a new device can restore encrypted chat history.
- The exported private key JWK is wrapped using the user's secret Recovery PIN:
  - **Key Derivation**: PBKDF2 with **310,000 iterations** of SHA-256.
  - **Salt**: 16 cryptographically random bytes.
  - **Cipher**: AES-GCM 256 with a 12-byte random IV.
- The server stores only the wrapped ciphertext bundle in `users.encrypted_private_key`. The server never receives or processes the PIN.

### Safety Code (Anti-MITM Verification)
- Each couple can verify their connection using the **Safety Code** modal in Chat.
- Computes the SHA-256 digest of both partners' sorted canonical public keys.
- Renders:
  - **12-digit code**: `XXXX - XXXX - XXXX`
  - **4 visual emojis**: Generated from fingerprint bytes.
- If both partners see identical numbers and emojis, the communication channel is proven free from Man-in-the-Middle (MITM) attacks.

### Secret Notes Vault
- **Key Derivation**: PBKDF2 with **310,000 iterations** of SHA-256.
- **Salt**: Dedicated 16-byte random salt generated per note (`v2:<b64Salt>:<b64Ciphertext>`).
- **Cipher**: AES-GCM 256.

---

## 2. Sensitive Data Protection (Phase 2)

### 🌸 Menstrual & Cycle Logs
- Symptom logs (flow, cramps, cravings, energy levels, personal diary notes) are serialized into a JSON payload on the client, encrypted via `encryptText` into ciphertext, and saved in `cycle_logs.encrypted_payload`.
- When encrypted payload is supplied, all plaintext database columns are set to `NULL` so the server stores zero sensitive medical data.
- The client decrypts the payload on-the-fly via `decryptText`.

### 📍 Live Location Radar & Battery
- GPS coordinates are encrypted client-side (`encryptText(JSON.stringify({ lat, lng, speed, heading }))`) before transmission via WebSocket and HTTP.
- **No Location History**: The server maintains only the most recent status point in memory (`couple_status_store`). No historical breadcrumbs or tracks are written to disk.
- **15-Minute TTL Expiration**: In-memory location coordinates expire and are automatically cleared after 15 minutes of inactivity.

### 😊 Mood Check-in Notes
- Mood notes and feelings are encrypted using the client-side E2EE key (`e2ee2:` format) before being submitted to `/mood/checkin`.
- Decrypted locally upon rendering.

### ⏳ Data Retention & Automated Pruning
- An hourly background maintenance task (`prune_stale_sensitive_data`) enforces strict retention policies:
  - **Call Logs**: Raw signaling and call logs older than 30 days are automatically deleted from the `calls` table.
  - **Location Points**: Stale location entries older than 15 minutes are purged.

---

---

## 3. Authentication & Credential Security (Phase 3 Hardened)

### 🔑 JWT Access & Rotating Refresh Tokens
- **Access Tokens**: Short-lived (30 minutes). Encoded using HMAC-SHA256 with strong environment-configured `SECRET_KEY`.
- **Refresh Tokens**: Long-lived (30 days) cryptographically random 64-byte URL-safe strings (`secrets.token_urlsafe(64)`).
- **Hashed Database Storage**: Only SHA-256 hashes of refresh tokens are stored in the database (`refresh_tokens.token_hash`). If the database is compromised, plaintext refresh tokens cannot be recovered.
- **Strict Single-Use Rotation**: Every `/auth/refresh` request revokes the presented refresh token and issues a brand-new token pair. Replaying an old refresh token is immediately rejected.
- **Revocation & Logout**:
  - `/auth/logout`: Revokes the current session's refresh token.
  - `/auth/logout-all`: Revokes all active refresh tokens for the authenticated user across all devices.
  - Password Reset: Automatically revokes all existing refresh tokens.

### 📱 Token Storage Architecture & Trade-Offs
- **Web vs Mobile Environment**:
  - LoveLink runs across a decoupled frontend (`lovelink-pearl.vercel.app`), a hosted FastAPI backend (`lovelink-backend.onrender.com`), and an Android APK built with Capacitor.
  - Cross-domain `httpOnly` cookies between separate domains (Vercel and Render) face aggressive third-party cookie blocking on modern mobile WebViews and Safari ITP.
  - Inside the Capacitor Android APK, requests originate from `http://localhost` or `capacitor://localhost`, where cookie jars are frequently cleared during background OS memory eviction.
  - **Selected Approach**: Access and refresh tokens are managed via the Axios API client with an automatic 401 refresh interceptor and stored in isolated client storage. On 401, pending requests are queued while `/auth/refresh` seamlessly acquires a new access token without user disruption.

### 🔢 One-Time Passwords (OTP)
- **Generation**: Cryptographically secure 6-digit codes generated using `secrets.randbelow(900000) + 100000`.
- **Hash-Only Storage**: The server stores only the SHA-256 hash (`user.otp_code = hash_otp(raw_otp)`). The raw OTP is never stored in the database.
- **5-Minute TTL Expiration**: Codes expire and are wiped after 5 minutes.
- **Brute-Force & Attempt Limiting**: Maximum 5 attempts allowed. If 5 incorrect codes are entered, the OTP is immediately destroyed and the user must request a new code.
- **Constant-Time Verification**: Verification uses `hmac.compare_digest` to prevent timing attacks.
- **Immediate Invalidation**: Once verified, the OTP is instantly set to `NULL` to prevent replay attacks.
- **Rate-Limiting & Cooldown**: A 30-second cooldown is enforced between OTP requests (`otp_sent_at`).

### 🛡️ Login Hardening & Account Lockout
- **Account Lockout**: 5 consecutive failed password attempts trigger a **15-minute temporary lockout** (`locked_until`).
- **Timing Attack Mitigation**: When a non-existent identifier is submitted, constant-time dummy password hashing runs to equalize response time.
- **Anti-Enumeration**: Login, OTP verification, and password reset endpoints return generic error messages ("Invalid email or password", "If this account exists, a code has been sent") to prevent user enumeration.

### 🌐 Cryptographic Google OAuth Verification
- Google ID tokens are verified server-side using the official `google-auth` library (`google.oauth2.id_token.verify_oauth2_token`).
- Verifies cryptographic signature using Google's live public keys, validates token audience (Client ID), issuer (`accounts.google.com`), and expiry timestamp. Raw unverified claims and external HTTP tokeninfo proxies are no longer trusted.

---

## 4. API & WebSocket Security Architecture (Phase 4 Hardened)

### 🌐 Strict CORS Lockdown
- **No Wildcard `*`**: CORS is strictly locked down. Untrusted origins are never granted access or reflected in credentials headers.
- **Allowed Origins**:
  - Production Vercel: `https://lovelink-pearl.vercel.app`, `https://lovelink.vercel.app`
  - Vercel Previews: Regex-matched `^https://lovelink(-[a-zA-Z0-9_-]+)?\.vercel\.app$`
  - Capacitor Mobile Apps: `capacitor://localhost`, `https://localhost`, `http://localhost`
  - Local Dev: `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`
- **Header Restrictions**: Only standard headers are allowed (`Authorization`, `Content-Type`, `Accept`, `Origin`, `X-Requested-With`).
- **Safe Exception Handlers**: `HTTPException`, `RequestValidationError`, and global exception handlers only attach CORS headers if the caller\'s origin is in the verified allowlist, eliminating origin reflection vulnerabilities.

### 🔌 WebSocket Zero-Trust Security
- **Authentication Handshake**: Every WebSocket connection (`/chat/{couple_id}`, `/games/ws/{couple_id}`, `/movies/ws/{couple_id}`, `/music/ws/{couple_id}`) requires an authenticated single-use ticket or JWT token.
- **Couple Authorization**: Verified against the database before accepting traffic (`user_id in [couple.user1_id, couple.user2_id]`). Connections attempting to access a foreign `couple_id` are instantly terminated with `code=4003 Forbidden`.
- **Frame Size Limits**: Incoming WebSocket messages are strictly capped at **64 KB** (`65,536` bytes). Payloads exceeding this limit trigger immediate closure with `code=1009 Message Too Big` to prevent buffer overflow and memory exhaustion.
- **Per-Connection Rate Limiting**: Enforces a sliding-window limit of **30 messages/second**. Connection flooding triggers immediate disconnection with `code=1008 Policy Violation`.

### 🛡️ IDOR & Authorization Defense
- Every REST endpoint that manipulates resources by ID (`calls`, `movies`, `media`, `notes`, `coupons`, `bucket_list`, `countdowns`, `cycle`) strictly joins or verifies against `couple_id == current_user.couple_id`.
- Modifying a URL identifier (such as `call_id`, `movie_id`, `album_id`, `media_id`) from another couple returns `404 Not Found` without disclosing the existence of foreign resources.

### 🔒 Frontend Security Headers (Vercel & Public HTML)
- **Content-Security-Policy (CSP)**: Locked to `'self'`, Google Identity Services, Firebase, YouTube embeds, and backend APIs.
- **X-Content-Type-Options**: `nosniff` (prevents MIME type sniffing).
- **X-Frame-Options**: `SAMEORIGIN` (mitigates clickjacking).
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
- **Permissions-Policy**: Restricted to `camera=(self), microphone=(self), geolocation=(self)`.

## 5. Known Limitations & Threat Model

1. **Carrier SMS**: SMS OTP is not connected to a carrier gateway. Email OTP is currently the active, verified channel.
2. **Device Compromise**: If an attacker gains full physical control or root/malware access to an unlocked phone, they may inspect active DOM state or memory.
3. **Metadata**: Message timestamps and message sizes are visible to the network/server, though message contents are 100% encrypted.

---

## 6. Security Roadmap

- [x] **Phase 0**: Secure `.gitignore`, untrack `.env.production`, add `.env.example` templates, audit git history.
- [x] **Phase 1**: Real E2EE with ECDH P-256, IndexedDB non-extractable storage, `e2ee2:` format, 310k iteration PBKDF2 PIN recovery, Safety Code screen, and Secret Notes random salt vault.
- [x] **Phase 2**: Client-side encryption for cycle logs, live location radar (15-min TTL), and mood notes with automated 30-day call log retention pruning.
- [x] **Phase 3**: Rotating refresh tokens, token revocation, rate limiting on auth endpoints, and lockout protection.
- [x] **Phase 4**: Restricted CORS origins, WebSocket token authentication and per-connection message rate limits, IDOR authorization checks on all REST routes.
- [ ] **Phase 5**: Lightweight `/health` endpoint and documented external uptime pinger.

---

## 7. Reporting a Vulnerability

If you discover a security issue or vulnerability in LoveLink, please open an issue or contact the repository maintainers directly.
