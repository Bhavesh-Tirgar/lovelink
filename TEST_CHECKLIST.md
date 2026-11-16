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
