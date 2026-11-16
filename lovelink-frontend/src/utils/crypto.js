/**
 * LoveLink Real End-to-End Encryption (E2EE v2) & Secret Safe Vault
 *
 * Cryptographic Architecture:
 * 1. Device Identity: ECDH P-256 keypair per device.
 *    - Private Key: Stored non-extractable in browser IndexedDB.
 *    - Public Key: Uploaded in JWK format to the server.
 * 2. Shared Key Agreement:
 *    - Each partner derives an identical 256-bit AES-GCM shared secret via ECDH deriveKey.
 *    - The server never sees the private keys or the derived AES-GCM key.
 * 3. Message Format:
 *    - New ECDH messages: "e2ee2:<base64-iv>:<base64-ciphertext>"
 *    - Legacy messages: "e2ee:<base64-iv>:<base64-ciphertext>" (backward compatible fallback)
 * 4. Key Backup & Restore:
 *    - Wrapped with user Recovery PIN using PBKDF2 (310,000 iterations, SHA-256, 16-byte random salt) + AES-GCM.
 * 5. Secret Notes Safe:
 *    - PBKDF2 with 310,000 iterations, random 16-byte salt per note, formatted as "v2:<salt>:<ciphertext>".
 */

import { getIdbItem, setIdbItem } from './idb';
import api from '../api';

const IDB_PRIVATE_KEY_KEY = 'lovelink_ecdh_private_key';
const IDB_PUBLIC_JWK_KEY = 'lovelink_ecdh_public_jwk';

// In-memory runtime cache for the derived ECDH shared key
let cachedSharedKey = null;
let cachedPartnerKeyStr = null;

// Memory cache for legacy couple key (for reading old e2ee: messages)
const legacyKeyCache = new Map();

// Visual emojis for Safety Code verification
const SAFETY_EMOJIS = [
    '💖', '🌟', '🔒', '🕊️', '🌹', '💎', '🌙', '✨',
    '🍀', '🔥', '🌸', '🎁', '🧸', '🌈', '⚡', '🪐'
];

/**
 * Base64 & Buffer conversion utilities
 */
export function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Check if a string is E2EE encrypted (either legacy e2ee: or modern e2ee2:)
 */
export function isE2EEMessage(str) {
    return typeof str === 'string' && (str.startsWith('e2ee2:') || str.startsWith('e2ee:'));
}

/**
 * ── 1. ECDH DEVICE KEYPAIR GENERATION & INITIALIZATION ───────────────────────
 */

/**
 * Gets or generates this device's ECDH P-256 keypair.
 * If a new keypair is generated, uploads public key to backend.
 */
export async function initDeviceE2EEKey(pinForBackup = null) {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        console.warn('[E2EE] Web Crypto API not available');
        return null;
    }

    try {
        let privateKey = await getIdbItem(IDB_PRIVATE_KEY_KEY);
        let publicJwk = await getIdbItem(IDB_PUBLIC_JWK_KEY);

        if (privateKey && publicJwk) {
            return { privateKey, publicJwk, isNew: false };
        }

        // Generate a new ECDH P-256 keypair
        // We set extractable: true initially so we can export public JWK and optionally wrap with user PIN
        const keyPair = await window.crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );

        // Export public key as JWK
        const exportedPublicJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
        const exportedPrivateJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

        // If a PIN is supplied during init, create and upload the wrapped backup bundle
        if (pinForBackup) {
            await createAndUploadKeyBackup(pinForBackup, exportedPrivateJwk);
        }

        // Import private key back as NON-EXTRACTABLE into IndexedDB for maximum security
        const nonExtractablePrivateKey = await window.crypto.subtle.importKey(
            'jwk',
            exportedPrivateJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            false, // non-extractable
            ['deriveKey', 'deriveBits']
        );

        await setIdbItem(IDB_PRIVATE_KEY_KEY, nonExtractablePrivateKey);
        await setIdbItem(IDB_PUBLIC_JWK_KEY, exportedPublicJwk);

        // Upload public key to server
        try {
            await api.put('/auth/e2ee/public-key', {
                public_key: JSON.stringify(exportedPublicJwk)
            });
        } catch (apiErr) {
            console.warn('[E2EE] Could not upload public key to server immediately:', apiErr);
        }

        return { privateKey: nonExtractablePrivateKey, publicJwk: exportedPublicJwk, isNew: true };
    } catch (err) {
        console.error('[E2EE] Device key initialization failed:', err);
        return null;
    }
}

/**
 * Gets the current device public key JWK from IndexedDB
 */
export async function getLocalPublicKeyJWK() {
    return await getIdbItem(IDB_PUBLIC_JWK_KEY);
}

/**
 * Gets the current device private key (CryptoKey) from IndexedDB
 */
export async function getLocalPrivateKey() {
    return await getIdbItem(IDB_PRIVATE_KEY_KEY);
}

/**
 * ── 2. SHARED ECDH KEY DERIVATION ─────────────────────────────────────────────
 */

/**
 * Derives the shared 256-bit AES-GCM key between the two partners using ECDH.
 */
export async function getSharedEcdhKey(forceRefresh = false) {
    if (cachedSharedKey && !forceRefresh) {
        return cachedSharedKey;
    }

    try {
        const localPrivateKey = await getLocalPrivateKey();
        if (!localPrivateKey) {
            return null;
        }

        // Fetch partner's public key from the backend
        const res = await api.get('/couples/partner-key');
        const { linked, public_key: partnerKeyRaw } = res.data;

        if (!linked || !partnerKeyRaw) {
            return null;
        }

        // If partner key hasn't changed and we have a cached key, return it
        if (cachedSharedKey && cachedPartnerKeyStr === partnerKeyRaw && !forceRefresh) {
            return cachedSharedKey;
        }

        const partnerJwk = typeof partnerKeyRaw === 'string' ? JSON.parse(partnerKeyRaw) : partnerKeyRaw;

        // Import partner's public key
        const partnerPublicKey = await window.crypto.subtle.importKey(
            'jwk',
            partnerJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            false,
            []
        );

        // Derive shared AES-GCM 256 key via ECDH
        const sharedKey = await window.crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: partnerPublicKey,
            },
            localPrivateKey,
            {
                name: 'AES-GCM',
                length: 256,
            },
            false, // non-extractable derived key
            ['encrypt', 'decrypt']
        );

        cachedSharedKey = sharedKey;
        cachedPartnerKeyStr = partnerKeyRaw;
        return sharedKey;
    } catch (err) {
        console.warn('[E2EE] Could not derive shared ECDH key yet (partner might not be initialized):', err);
        return null;
    }
}

/**
 * ── 3. LEGACY COUPLE KEY (FOR BACKWARD COMPATIBLE DECRYPTION) ────────────────
 */

export async function deriveLegacyCoupleKey(coupleId) {
    if (!coupleId) return null;
    if (legacyKeyCache.has(coupleId)) {
        return legacyKeyCache.get(coupleId);
    }

    try {
        const enc = new TextEncoder();
        const baseKeyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(`lovelink_couple_secret_${coupleId}`),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const salt = enc.encode(`salt_lovelink_couple_e2ee_${coupleId}_2026`);

        const cryptoKey = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256',
            },
            baseKeyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        legacyKeyCache.set(coupleId, cryptoKey);
        return cryptoKey;
    } catch (err) {
        console.error('[E2EE] Legacy key derivation error:', err);
        return null;
    }
}

/**
 * ── 4. CHAT ENCRYPTION & DECRYPTION (e2ee2: & e2ee:) ─────────────────────────
 */

/**
 * Encrypts a message using real ECDH shared secret (e2ee2: format).
 * Falls back to legacy key if partner has not yet uploaded an ECDH key.
 */
export async function encryptText(plainText, coupleId) {
    if (!plainText) return plainText;

    try {
        const sharedKey = await getSharedEcdhKey();

        if (sharedKey) {
            // Modern Real E2EE (e2ee2:)
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const enc = new TextEncoder();
            const encoded = enc.encode(plainText);

            const ciphertext = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                sharedKey,
                encoded
            );

            return `e2ee2:${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
        }

        // Fallback: Legacy coupleId key (e2ee:)
        if (coupleId) {
            const legacyKey = await deriveLegacyCoupleKey(coupleId);
            if (legacyKey) {
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const enc = new TextEncoder();
                const ciphertext = await window.crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv },
                    legacyKey,
                    enc.encode(plainText)
                );
                return `e2ee:${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
            }
        }

        return plainText;
    } catch (err) {
        console.error('[E2EE] Encryption failed, falling back to plaintext:', err);
        return plainText;
    }
}

/**
 * Decrypts an incoming message.
 * Supports both modern "e2ee2:" (ECDH) and legacy "e2ee:" (PBKDF2) formats.
 */
export async function decryptText(cipherString, coupleId) {
    if (!cipherString || typeof cipherString !== 'string') return cipherString;
    if (!isE2EEMessage(cipherString)) return cipherString;

    try {
        const parts = cipherString.split(':');
        if (parts.length !== 3) return cipherString;

        const [version, b64Iv, b64Cipher] = parts;
        const iv = new Uint8Array(base64ToBuffer(b64Iv));
        const ciphertext = base64ToBuffer(b64Cipher);

        if (version === 'e2ee2') {
            // Modern ECDH decryption
            const sharedKey = await getSharedEcdhKey();
            if (!sharedKey) {
                return '🔒 [Waiting for partner E2EE key]';
            }

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                sharedKey,
                ciphertext
            );
            return new TextDecoder().decode(decryptedBuffer);
        } else if (version === 'e2ee') {
            // Legacy decryption
            if (!coupleId) return cipherString;
            const legacyKey = await deriveLegacyCoupleKey(coupleId);
            if (!legacyKey) return cipherString;

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                legacyKey,
                ciphertext
            );
            return new TextDecoder().decode(decryptedBuffer);
        }

        return cipherString;
    } catch (err) {
        console.error('[E2EE] Decryption error:', err);
        return '🔒 [Encrypted Message]';
    }
}

/**
 * ── 5. PRIVATE KEY BACKUP & RECOVERY WITH USER PIN ───────────────────────────
 */

/**
 * Wraps and uploads the private key to the server using user-chosen PIN
 * with PBKDF2 SHA-256 (310,000 iterations) + AES-GCM 256.
 */
export async function createAndUploadKeyBackup(pin, privateJwkToWrap = null) {
    if (!pin || pin.length < 4) {
        throw new Error('Recovery PIN must be at least 4 digits');
    }

    try {
        let privateJwk = privateJwkToWrap;
        if (!privateJwk) {
            // Need extractable key or exportable JWK from setup
            throw new Error('Cannot export non-extractable key directly. Setup PIN during device initialization.');
        }

        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // Derive key from PIN via PBKDF2 (310,000 iterations)
        const enc = new TextEncoder();
        const pinKeyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(String(pin)),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const wrappingKey = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: 310000,
                hash: 'SHA-256',
            },
            pinKeyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        const plaintextBytes = enc.encode(JSON.stringify(privateJwk));
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            wrappingKey,
            plaintextBytes
        );

        const backupBundle = JSON.stringify({
            v: 2,
            iterations: 310000,
            salt: bufferToBase64(salt),
            iv: bufferToBase64(iv),
            ciphertext: bufferToBase64(ciphertext),
        });

        await api.post('/auth/e2ee/backup', {
            encrypted_private_key: backupBundle,
        });

        return true;
    } catch (err) {
        console.error('[E2EE] Backup creation failed:', err);
        throw err;
    }
}

/**
 * Restores a private key from an encrypted backup bundle using user PIN.
 */
export async function restorePrivateKeyFromBackup(pin, backupBundleJson) {
    if (!pin) throw new Error('PIN is required for restoration');

    try {
        const bundle = typeof backupBundleJson === 'string' ? JSON.parse(backupBundleJson) : backupBundleJson;
        const salt = new Uint8Array(base64ToBuffer(bundle.salt));
        const iv = new Uint8Array(base64ToBuffer(bundle.iv));
        const ciphertext = base64ToBuffer(bundle.ciphertext);
        const iterations = bundle.iterations || 310000;

        const enc = new TextEncoder();
        const pinKeyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(String(pin)),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const unwrappingKey = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations,
                hash: 'SHA-256',
            },
            pinKeyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            unwrappingKey,
            ciphertext
        );

        const decryptedJwk = JSON.parse(new TextDecoder().decode(decryptedBuffer));

        // Import into IndexedDB as non-extractable
        const restoredPrivateKey = await window.crypto.subtle.importKey(
            'jwk',
            decryptedJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            false,
            ['deriveKey', 'deriveBits']
        );

        await setIdbItem(IDB_PRIVATE_KEY_KEY, restoredPrivateKey);

        // Compute and store public JWK corresponding to this private key
        // By using ECDH x, y coordinates
        if (decryptedJwk.x && decryptedJwk.y) {
            const publicJwk = {
                kty: decryptedJwk.kty,
                crv: decryptedJwk.crv,
                x: decryptedJwk.x,
                y: decryptedJwk.y,
            };
            await setIdbItem(IDB_PUBLIC_JWK_KEY, publicJwk);
        }

        // Reset memory cache
        cachedSharedKey = null;

        return true;
    } catch (err) {
        console.error('[E2EE] Restoration failed (incorrect PIN or corrupted backup):', err);
        return false;
    }
}

/**
 * ── 6. SAFETY CODE COMPUTATION (MITM VERIFICATION) ───────────────────────────
 */

/**
 * Calculates a verifiable 12-digit safety code and 4 visual emojis
 * based on the SHA-256 hash of both partners' public keys.
 */
export async function calculateSafetyCode(userJwk, partnerJwk) {
    if (!userJwk || !partnerJwk) return null;

    try {
        const canonicalA = JSON.stringify({ crv: userJwk.crv, kty: userJwk.kty, x: userJwk.x, y: userJwk.y });
        const canonicalB = JSON.stringify({ crv: partnerJwk.crv, kty: partnerJwk.kty, x: partnerJwk.x, y: partnerJwk.y });

        // Sort to ensure both partners generate identical fingerprint regardless of who views first
        const sorted = [canonicalA, canonicalB].sort();
        const combined = sorted[0] + '::' + sorted[1];

        const hashBuffer = await window.crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(combined)
        );

        const hashBytes = new Uint8Array(hashBuffer);

        // Generate 12-digit numerical code: XXXX - XXXX - XXXX
        let numStr = '';
        for (let i = 0; i < 6; i++) {
            const val = ((hashBytes[i * 2] << 8) | hashBytes[i * 2 + 1]) % 100;
            numStr += String(val).padStart(2, '0');
        }
        const formattedNumbers = `${numStr.slice(0, 4)} - ${numStr.slice(4, 8)} - ${numStr.slice(8, 12)}`;

        // Pick 4 emojis
        const emoji1 = SAFETY_EMOJIS[hashBytes[12] % SAFETY_EMOJIS.length];
        const emoji2 = SAFETY_EMOJIS[hashBytes[13] % SAFETY_EMOJIS.length];
        const emoji3 = SAFETY_EMOJIS[hashBytes[14] % SAFETY_EMOJIS.length];
        const emoji4 = SAFETY_EMOJIS[hashBytes[15] % SAFETY_EMOJIS.length];
        const formattedEmojis = `${emoji1} ${emoji2} ${emoji3} ${emoji4}`;

        return {
            numeric: formattedNumbers,
            emojis: formattedEmojis,
        };
    } catch (err) {
        console.error('[E2EE] Failed to calculate safety code:', err);
        return null;
    }
}

/**
 * ── 7. SECRET NOTES VAULT (310,000 ITERATIONS + RANDOM SALT) ─────────────────
 */

const VAULT_SALT_PREFIX = 'lovelink_secret_vault_salt_';

export async function encryptSecret(plainText, pin, coupleId) {
    try {
        const enc = new TextEncoder();
        // Generate random 16-byte salt per note
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(String(pin)),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: 310000,
                hash: 'SHA-256',
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        const encodedText = enc.encode(plainText);
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encodedText
        );

        // Store salt alongside ciphertext in format: "v2:<b64Salt>:<b64Ciphertext>"
        const b64Salt = bufferToBase64(salt);
        const b64Cipher = bufferToBase64(ciphertext);

        return {
            ciphertext: `v2:${b64Salt}:${b64Cipher}`,
            iv: bufferToBase64(iv),
        };
    } catch (e) {
        console.error('Encryption failed:', e);
        throw new Error('Encryption failed');
    }
}

export async function decryptSecret(ciphertextBase64, ivBase64, pin, coupleId) {
    if (!ciphertextBase64 || !ivBase64 || !pin) return null;

    try {
        const enc = new TextEncoder();
        const iv = new Uint8Array(base64ToBuffer(ivBase64));

        let ciphertextBuffer;
        let saltBuffer;
        let iterations = 310000;

        if (ciphertextBase64.startsWith('v2:')) {
            // Modern note with dedicated 16-byte random salt and 310k iterations
            const parts = ciphertextBase64.split(':');
            if (parts.length !== 3) return null;
            const [, b64Salt, b64Cipher] = parts;
            saltBuffer = new Uint8Array(base64ToBuffer(b64Salt));
            ciphertextBuffer = base64ToBuffer(b64Cipher);
        } else {
            // Legacy v1 note fallback (100,000 iterations, deterministic salt)
            iterations = 100000;
            saltBuffer = enc.encode(VAULT_SALT_PREFIX + (coupleId || 'default_couple'));
            ciphertextBuffer = base64ToBuffer(ciphertextBase64);
        }

        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(String(pin)),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations,
                hash: 'SHA-256',
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertextBuffer
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.warn('Decryption failed (incorrect PIN or corrupted data):', e);
        return null;
    }
}

/**
 * Vault PIN caching for active tab session
 */
export function getStoredVaultPin() {
    try {
        return sessionStorage.getItem('lovelink_vault_pin') || '';
    } catch (e) {
        return '';
    }
}

export function setStoredVaultPin(pin) {
    try {
        sessionStorage.setItem('lovelink_vault_pin', pin);
    } catch (e) {}
}

export function clearStoredVaultPin() {
    try {
        sessionStorage.removeItem('lovelink_vault_pin');
    } catch (e) {}
}
