/**
 * chatCache.js
 * Local IndexedDB cache for instant offline chat loading (0ms WhatsApp-like speed).
 * Falls back safely to localStorage if IndexedDB is disabled or unavailable.
 */

const DB_NAME = 'lovelink_chat_db';
const DB_VERSION = 1;
const STORE_NAME = 'messages';
const MAX_CACHED_MESSAGES = 200;

function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            return reject(new Error('IndexedDB not supported'));
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('couple_id', 'couple_id', { unique: false });
                store.createIndex('created_at', 'created_at', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Fallback key generator
const localKey = (coupleId) => `lovelink_msgs_${coupleId || 'default'}`;

export async function getCachedMessages(coupleId) {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                let msgs = request.result || [];
                if (coupleId) {
                    msgs = msgs.filter(m => !m.couple_id || m.couple_id === coupleId);
                }
                // Sort oldest to newest (ascending created_at)
                msgs.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
                resolve(msgs.slice(-MAX_CACHED_MESSAGES));
            };

            request.onerror = () => {
                resolve(getFallbackMessages(coupleId));
            };
        });
    } catch {
        return getFallbackMessages(coupleId);
    }
}

export async function saveMessagesToCache(coupleId, messages) {
    if (!messages || !Array.isArray(messages)) return;
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        // Put up to the last MAX_CACHED_MESSAGES
        const toSave = messages.slice(-MAX_CACHED_MESSAGES);
        for (const msg of toSave) {
            if (msg && msg.id) {
                store.put({
                    ...msg,
                    couple_id: msg.couple_id || coupleId
                });
            }
        }

        tx.oncomplete = () => {
            // Also update localStorage as fast fallback
            saveFallbackMessages(coupleId, toSave);
        };
    } catch {
        saveFallbackMessages(coupleId, messages);
    }
}

export async function saveSingleMessageToCache(coupleId, message) {
    if (!message || !message.id) return;
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({
            ...message,
            couple_id: message.couple_id || coupleId
        });
    } catch {
        // Fallback
        const current = getFallbackMessages(coupleId);
        const next = [...current.filter(m => m.id !== message.id), message];
        saveFallbackMessages(coupleId, next);
    }
}

export async function replaceTempMessageInCache(coupleId, tempId, realMessage) {
    if (!realMessage || !realMessage.id) return;
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        if (tempId) {
            store.delete(tempId);
        }
        store.put({
            ...realMessage,
            couple_id: realMessage.couple_id || coupleId
        });
    } catch {
        const current = getFallbackMessages(coupleId);
        const next = current.map(m => (m._tempId === tempId || m.id === tempId) ? realMessage : m);
        saveFallbackMessages(coupleId, next);
    }
}

export async function markMessageBurnedInCache(coupleId, messageId) {
    if (!messageId) return;
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(messageId);
        request.onsuccess = () => {
            if (request.result) {
                store.put({
                    ...request.result,
                    is_burned: true,
                    text: '🔥 [Self-destructed message]',
                    file_url: null
                });
            }
        };
    } catch {
        const current = getFallbackMessages(coupleId);
        const next = current.map(m => m.id === messageId ? { ...m, is_burned: true, text: '🔥 [Self-destructed message]', file_url: null } : m);
        saveFallbackMessages(coupleId, next);
    }
}

// LocalStorage fallbacks
function getFallbackMessages(coupleId) {
    try {
        const raw = localStorage.getItem(localKey(coupleId));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveFallbackMessages(coupleId, messages) {
    try {
        const sliced = messages.slice(-MAX_CACHED_MESSAGES);
        localStorage.setItem(localKey(coupleId), JSON.stringify(sliced));
    } catch {
        // storage quota exceeded or disabled
    }
}
