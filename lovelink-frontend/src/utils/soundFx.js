/**
 * Shared singleton Web Audio API context helper.
 * Prevents exhausting Chromium/Android's 6-AudioContext hardware limit across
 * rapid game moves, snaps, call ringtones, and 3D avatar interactions.
 */
let sharedAudioCtx = null;

export function getSharedAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
    if (!AudioContextClass) return null;

    try {
        if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
            sharedAudioCtx = new AudioContextClass();
        }
        if (sharedAudioCtx.state === 'suspended' && typeof sharedAudioCtx.resume === 'function') {
            sharedAudioCtx.resume().catch(() => {});
        }
        return sharedAudioCtx;
    } catch {
        return null;
    }
}

export function resetSharedAudioContextForTest() {
    sharedAudioCtx = null;
}
