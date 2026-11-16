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

## 2. Authentication & Credential Security

- **Passwords**: One-way hashed using **Bcrypt (12 salt rounds)**.
- **One-Time Passwords (OTP)**: 6-digit numeric codes with a 5-minute time-to-live (TTL) delivered via Gmail Secure SMTP over SSL (Port 465).
- **Google OAuth**: Verified server-side via Google's tokeninfo API. Android WebView configured with a Mobile Chrome user-agent override and third-party cookie support to prevent `403 disallowed_useragent` blocks.

---

## 3. Known Limitations & Threat Model

1. **Carrier SMS**: SMS OTP is not connected to a carrier gateway. Email OTP is currently the active, verified channel.
2. **Device Compromise**: If an attacker gains full physical control or root/malware access to an unlocked phone, they may inspect active DOM state or memory.
3. **Metadata**: Message timestamps and message sizes are visible to the network/server, though message contents are 100% encrypted.

---

## 4. Security Roadmap

- [x] **Phase 0**: Secure `.gitignore`, untrack `.env.production`, add `.env.example` templates, audit git history.
- [x] **Phase 1**: Real E2EE with ECDH P-256, IndexedDB non-extractable storage, `e2ee2:` format, 310k iteration PBKDF2 PIN recovery, Safety Code screen, and Secret Notes random salt vault.
- [ ] **Phase 2**: Client-side encryption for cycle logs and live location with automatic location point TTL cleanup.
- [ ] **Phase 3**: Rotating refresh tokens, token revocation, rate limiting on auth endpoints, and lockout protection.
- [ ] **Phase 4**: Restricted CORS origins, WebSocket token authentication and per-connection message rate limits, IDOR authorization checks on all REST routes.
- [ ] **Phase 5**: Lightweight `/health` endpoint and documented external uptime pinger.

---

## 5. Reporting a Vulnerability

If you discover a security issue or vulnerability in LoveLink, please open an issue or contact the repository maintainers directly.
