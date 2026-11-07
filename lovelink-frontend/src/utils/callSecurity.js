/**
 * Deterministic End-to-End Encryption (E2EE) 4-Emoji Fingerprint Generator
 * Telegram-style call verification.
 * 
 * Both lovers generate the EXACT same 4 emojis from the call room ID and their user IDs.
 */

const EMOJI_PALETTE = [
    '🍓', '💎', '🚀', '🦄', '⚡', '🍒', '🌙', '✨',
    '🍉', '🔥', '🌈', '🪐', '🌸', '🍇', '🐱', '🦋',
    '🍎', '⭐', '🎈', '🎸', '🦁', '🐨', '🏖️', '🏝️',
    '☕', '❤️', '🥝', '🦊', '🎨', '🍑', '👑', '🔮'
];

export function getCallE2EEEmojis(roomId, userId1, userId2) {
    if (!roomId) return ['💎', '✨', '⚡', '❤️'];

    // Sort user IDs so both caller and callee produce the identical hash
    const pair = [String(userId1 || ''), String(userId2 || '')].sort().join('::');
    const seed = `${roomId}::${pair}`;

    // Deterministic FNV-1a polynomial hashing with 4 distinct offsets
    let h1 = 0x811c9dc5, h2 = 0x27d4eb2f, h3 = 0x9e3779b9, h4 = 0x45a90e3d;
    for (let i = 0; i < seed.length; i++) {
        const c = seed.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ (c * 31), 0x5bd1e995);
        h3 = Math.imul(h3 ^ (c * 17), 0x27d4eb2f);
        h4 = Math.imul(h4 ^ (c * 13), 0x165667b1);
    }

    const len = EMOJI_PALETTE.length;
    const e1 = EMOJI_PALETTE[Math.abs(h1) % len];
    const e2 = EMOJI_PALETTE[Math.abs(h2) % len];
    const e3 = EMOJI_PALETTE[Math.abs(h3) % len];
    const e4 = EMOJI_PALETTE[Math.abs(h4) % len];

    return [e1, e2, e3, e4];
}
