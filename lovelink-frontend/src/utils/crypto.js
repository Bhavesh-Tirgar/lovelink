/**
 * Web Crypto API client-side AES-GCM 256-bit encryption for LoveLink Secret Safe.
 * Zero external libraries, 100% free and native in all modern browsers.
 */

const SALT_PREFIX = "lovelink_secret_vault_salt_";

// Derive an AES-GCM 256-bit key from a user PIN and couple salt using PBKDF2
async function deriveKey(pin, coupleId) {
    const enc = new TextEncoder();
    const pinBuffer = enc.encode(String(pin));
    const saltBuffer = enc.encode(SALT_PREFIX + (coupleId || "default_couple"));

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

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Encrypt plaintext using AES-GCM 256-bit
 */
export async function encryptSecret(plainText, pin, coupleId) {
    try {
        const key = await deriveKey(pin, coupleId);
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
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

/**
 * Decrypt ciphertext using AES-GCM 256-bit
 */
export async function decryptSecret(ciphertextBase64, ivBase64, pin, coupleId) {
    try {
        const key = await deriveKey(pin, coupleId);
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

/**
 * Session storage helpers for Vault PIN caching (clears when tab/browser closes)
 */
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
