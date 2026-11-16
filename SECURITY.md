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

## 3. Authentication & Credential Security

- **Passwords**: One-way hashed using **Bcrypt (12 salt rounds)**.
- **One-Time Passwords (OTP)**: 6-digit numeric codes with a 5-minute time-to-live (TTL) delivered via Gmail Secure SMTP over SSL (Port 465).
- **Google OAuth**: Verified server-side via Google's tokeninfo API. Android WebView configured with a Mobile Chrome user-agent override and third-party cookie support to prevent `403 disallowed_useragent` blocks.

---

## 4. Known Limitations & Threat Model

1. **Carrier SMS**: SMS OTP is not connected to a carrier gateway. Email OTP is currently the active, verified channel.
2. **Device Compromise**: If an attacker gains full physical control or root/malware access to an unlocked phone, they may inspect active DOM state or memory.
3. **Metadata**: Message timestamps and message sizes are visible to the network/server, though message contents are 100% encrypted.

---

## 5. Security Roadmap

- [x] **Phase 0**: Secure `.gitignore`, untrack `.env.production`, add `.env.example` templates, audit git history.
- [x] **Phase 1**: Real E2EE with ECDH P-256, IndexedDB non-extractable storage, `e2ee2:` format, 310k iteration PBKDF2 PIN recovery, Safety Code screen, and Secret Notes random salt vault.
- [x] **Phase 2**: Client-side encryption for cycle logs, live location radar (15-min TTL), and mood notes with automated 30-day call log retention pruning.
- [ ] **Phase 3**: Rotating refresh tokens, token revocation, rate limiting on auth endpoints, and lockout protection.
- [ ] **Phase 4**: Restricted CORS origins, WebSocket token authentication and per-connection message rate limits, IDOR authorization checks on all REST routes.
- [ ] **Phase 5**: Lightweight `/health` endpoint and documented external uptime pinger.

---

## 6. Reporting a Vulnerability

If you discover a security issue or vulnerability in LoveLink, please open an issue or contact the repository maintainers directly.
