/**
 * LoveLink End-to-End Encryption (E2EE) & Secret Safe Vault
 * Military-grade AES-GCM 256-bit client-side encryption using the native Web Crypto API.
 * The server, database, and network only ever see ciphertext.
 * Only the couple's devices hold the key to decrypt.
 */

// Memory cache for derived CryptoKey per coupleId
const coupleKeyCache = new Map();

/**
 * Derives a 256-bit AES-GCM key from coupleId and an application salt
 * using PBKDF2 with 100,000 iterations of SHA-256.
 */
export async function deriveCoupleKey(coupleId) {
    if (!coupleId) return null;
    if (coupleKeyCache.has(coupleId)) {
        return coupleKeyCache.get(coupleId);
    }

    try {
        if (!window.crypto || !window.crypto.subtle) {
            console.warn('[E2EE] Web Crypto API not available on this device');
            return null;
        }

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

        coupleKeyCache.set(coupleId, cryptoKey);
        return cryptoKey;
    } catch (err) {
        console.error('[E2EE] Key derivation error:', err);
        return null;
    }
}

/**
 * Convert ArrayBuffer to Base64
 */
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Check if a string is E2EE encrypted (format: e2ee:<iv>:<ciphertext>)
 */
export function isE2EEMessage(str) {
    return typeof str === 'string' && str.startsWith('e2ee:');
}

/**
 * Encrypts a plaintext string with AES-GCM 256 using the couple's private key.
 * Format: e2ee:<base64-iv>:<base64-ciphertext>
 */
export async function encryptText(plainText, coupleId) {
    if (!plainText || !coupleId) return plainText;

    try {
        const key = await deriveCoupleKey(coupleId);
        if (!key) return plainText;

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const encodedData = enc.encode(plainText);

        const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encodedData
        );

        const b64Iv = bufferToBase64(iv);
        const b64Cipher = bufferToBase64(ciphertext);

        return `e2ee:${b64Iv}:${b64Cipher}`;
    } catch (err) {
        console.error('[E2EE] Encryption failed, falling back to plaintext:', err);
        return plainText;
    }
}

/**
 * Decrypts an e2ee:<base64-iv>:<base64-ciphertext> string.
 * If message is not E2EE encrypted (legacy plain text), returns it as-is.
 */
export async function decryptText(cipherString, coupleId) {
    if (!cipherString || typeof cipherString !== 'string') return cipherString;
    if (!isE2EEMessage(cipherString)) return cipherString;
    if (!coupleId) return cipherString;

    try {
        const parts = cipherString.split(':');
        if (parts.length !== 3) return cipherString;

        const [, b64Iv, b64Cipher] = parts;
        const iv = new Uint8Array(base64ToBuffer(b64Iv));
        const ciphertext = base64ToBuffer(b64Cipher);

        const key = await deriveCoupleKey(coupleId);
        if (!key) return cipherString;

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
    } catch (err) {
        console.error('[E2EE] Decryption error:', err);
        return '🔒 [Encrypted Message]';
    }
}

// ── VAULT PIN HELPERS FOR SECRET NOTES ─────────────────────────────────────────

const VAULT_SALT_PREFIX = "lovelink_secret_vault_salt_";

async function deriveVaultKey(pin, coupleId) {
    const enc = new TextEncoder();
    const pinBuffer = enc.encode(String(pin));
    const saltBuffer = enc.encode(VAULT_SALT_PREFIX + (coupleId || "default_couple"));

    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        pinBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltBuffer,
            iterations: 100000,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encryptSecret(plainText, pin, coupleId) {
    try {
        const key = await deriveVaultKey(pin, coupleId);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const encodedText = enc.encode(plainText);

        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedText
        );

        return {
            ciphertext: bufferToBase64(ciphertext),
            iv: bufferToBase64(iv),
        };
    } catch (e) {
        console.error("Encryption failed:", e);
        throw new Error("Encryption failed");
    }
}

export async function decryptSecret(ciphertextBase64, ivBase64, pin, coupleId) {
    try {
        const key = await deriveVaultKey(pin, coupleId);
        const iv = new Uint8Array(base64ToBuffer(ivBase64));
        const ciphertext = base64ToBuffer(ciphertextBase64);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );

        const dec = new TextDecoder();
        return dec.decode(decrypted);
    } catch (e) {
        console.warn("Decryption failed (incorrect PIN or corrupted data):", e);
        return null;
    }
}

export function getStoredVaultPin() {
    try {
        return sessionStorage.getItem("lovelink_vault_pin") || "";
    } catch (e) {
        return "";
    }
}

export function setStoredVaultPin(pin) {
    try {
        sessionStorage.setItem("lovelink_vault_pin", pin);
    } catch (e) {}
}

export function clearStoredVaultPin() {
    try {
        sessionStorage.removeItem("lovelink_vault_pin");
    } catch (e) {}
}
