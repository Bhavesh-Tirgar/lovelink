import {
  bufferToBase64,
  base64ToBuffer,
  isE2EEMessage,
  deriveLegacyCoupleKey,
  encryptText,
  decryptText,
  calculateSafetyCode,
  encryptSecret,
  decryptSecret,
  getStoredVaultPin,
  setStoredVaultPin,
  clearStoredVaultPin,
} from '../utils/crypto';
import { getCallE2EEEmojis } from '../utils/callSecurity';
import { getWsBaseUrl } from '../utils/wsUrl';
import { getSharedAudioContext, resetSharedAudioContextForTest } from '../utils/soundFx';

describe('Crypto, Security & Utility Real Execution Tests', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    delete process.env.REACT_APP_WS_URL;
    delete process.env.REACT_APP_API_URL;
    resetSharedAudioContextForTest();
  });

  // ── 1-5: E2EE message prefix detection & binary codecs ──
  test('001: isE2EEMessage detects e2ee: and e2ee2: prefixes accurately', () => {
    expect(isE2EEMessage('e2ee:abc:def')).toBe(true);
    expect(isE2EEMessage('e2ee2:xyz:123')).toBe(true);
    expect(isE2EEMessage('Hello partner')).toBe(false);
    expect(isE2EEMessage('')).toBe(false);
    expect(isE2EEMessage(null)).toBe(false);
    expect(isE2EEMessage(undefined)).toBe(false);
  });

  test('002: bufferToBase64 and base64ToBuffer roundtrip arbitrary binary bytes', () => {
    const src = new Uint8Array([0, 1, 42, 127, 128, 254, 255]);
    const b64 = bufferToBase64(src.buffer);
    const decoded = new Uint8Array(base64ToBuffer(b64));
    expect(Array.from(decoded)).toEqual(Array.from(src));
  });

  test('003: deriveLegacyCoupleKey returns null when coupleId is empty', async () => {
    expect(await deriveLegacyCoupleKey('')).toBeNull();
    expect(await deriveLegacyCoupleKey(null)).toBeNull();
  });

  test('004: deriveLegacyCoupleKey derives a cached 256-bit AES-GCM CryptoKey', async () => {
    const k1 = await deriveLegacyCoupleKey('couple-test-1');
    const k2 = await deriveLegacyCoupleKey('couple-test-1');
    expect(k1).toBeTruthy();
    expect(k1.algorithm.name).toBe('AES-GCM');
    expect(k2).toBe(k1);
  });

  test('005: encryptText and decryptText roundtrip UTF-8 & emojis via WebCrypto AES-GCM', async () => {
    const plain = 'Missing you right now ❤️✨ 2:30 AM';
    const cipher = await encryptText(plain, 'couple-roundtrip-1');
    expect(isE2EEMessage(cipher)).toBe(true);
    expect(cipher.startsWith('e2ee:')).toBe(true);
    expect(cipher).not.toContain('Missing you');

    const decrypted = await decryptText(cipher, 'couple-roundtrip-1');
    expect(decrypted).toBe(plain);
  });

  test('006: encryptText uses fresh random IVs on repeated calls with same plaintext', async () => {
    const c1 = await encryptText('same text', 'couple-iv-check');
    const c2 = await encryptText('same text', 'couple-iv-check');
    expect(c1).not.toBe(c2);
  });

  test('007: decryptText returns plaintext untouched if not encrypted', async () => {
    expect(await decryptText('plain note', 'couple-1')).toBe('plain note');
    expect(await decryptText('', 'couple-1')).toBe('');
    expect(await decryptText(null, 'couple-1')).toBeNull();
  });

  test('008: decryptText handles wrong couple key or corrupted ciphertext gracefully', async () => {
    const cipher = await encryptText('secret message', 'couple-alpha');
    const wrong = await decryptText(cipher, 'couple-beta');
    expect(wrong).toBe('🔒 [Encrypted Message]');
  });

  test('009: decryptText handles malformed 2-segment e2ee string without crashing', async () => {
    expect(await decryptText('e2ee:only_two_parts', 'couple-1')).toBe('e2ee:only_two_parts');
  });

  // ── 10-14: Cycle/Journal Vault PIN encryption ──
  test('010: encryptSecret produces v2 format and decryptSecret recovers original text', async () => {
    const note = 'Cramps & warm tea needed tonight';
    const { ciphertext, iv } = await encryptSecret(note, '2580', 'cp-vault-1');
    expect(ciphertext.startsWith('v2:')).toBe(true);
    expect(ciphertext).not.toContain('Cramps');
    expect(typeof iv).toBe('string');

    const restored = await decryptSecret(ciphertext, iv, '2580', 'cp-vault-1');
    expect(restored).toBe(note);
  });

  test('011: decryptSecret returns null when PIN is wrong', async () => {
    const { ciphertext, iv } = await encryptSecret('Private log', '1234', 'cp-vault-2');
    const attempt = await decryptSecret(ciphertext, iv, '9999', 'cp-vault-2');
    expect(attempt).toBeNull();
  });

  test('012: decryptSecret returns null on missing arguments', async () => {
    expect(await decryptSecret(null, 'iv', '1234', 'c1')).toBeNull();
    expect(await decryptSecret('v2:a:b', '', '1234', 'c1')).toBeNull();
    expect(await decryptSecret('v2:a:b', 'iv', '', 'c1')).toBeNull();
  });

  test('013: Vault PIN sessionStorage helpers store, read, and clear cleanly', () => {
    expect(getStoredVaultPin()).toBe('');
    setStoredVaultPin('4321');
    expect(getStoredVaultPin()).toBe('4321');
    clearStoredVaultPin();
    expect(getStoredVaultPin()).toBe('');
  });

  // ── 14-16: ECDH Safety Code & Telegram-style Call E2EE Emojis ──
  test('014: calculateSafetyCode produces identical numeric & emoji fingerprints in both partner orders', async () => {
    const jwkA = { kty: 'EC', crv: 'P-256', x: 'aaa111', y: 'bbb222' };
    const jwkB = { kty: 'EC', crv: 'P-256', x: 'ccc333', y: 'ddd444' };

    const codeAB = await calculateSafetyCode(jwkA, jwkB);
    const codeBA = await calculateSafetyCode(jwkB, jwkA);

    expect(codeAB).toBeTruthy();
    expect(codeAB.numeric).toBe(codeBA.numeric);
    expect(codeAB.emojis).toBe(codeBA.emojis);
    expect(codeAB.numeric).toMatch(/^\d{4} - \d{4} - \d{4}$/);
    expect(await calculateSafetyCode(null, jwkB)).toBeNull();
  });

  test('015: getCallE2EEEmojis returns symmetric 4-emoji fingerprint regardless of user argument order', () => {
    const callerView = getCallE2EEEmojis('call-room-42', 'user-alpha', 'user-zeta');
    const calleeView = getCallE2EEEmojis('call-room-42', 'user-zeta', 'user-alpha');
    expect(callerView).toHaveLength(4);
    expect(callerView).toEqual(calleeView);

    const otherRoom = getCallE2EEEmojis('call-room-99', 'user-alpha', 'user-zeta');
    expect(otherRoom).not.toEqual(callerView);
    expect(getCallE2EEEmojis(null, 'a', 'b')).toEqual(['💎', '✨', '⚡', '❤️']);
  });

  // ── 16-20: WebSocket URL Resolution ──
  test('016: getWsBaseUrl defaults to production Render WSS URL', () => {
    expect(getWsBaseUrl()).toBe('wss://lovelink-sfzx.onrender.com');
  });

  test('017: getWsBaseUrl honors explicit REACT_APP_WS_URL without trailing slash', () => {
    process.env.REACT_APP_WS_URL = 'wss://custom.lovelink.app/';
    expect(getWsBaseUrl()).toBe('wss://custom.lovelink.app');
  });

  test('018: getWsBaseUrl derives ws:// and wss:// from REACT_APP_API_URL', () => {
    process.env.REACT_APP_API_URL = 'https://api.lovelink.app/';
    expect(getWsBaseUrl()).toBe('wss://api.lovelink.app');
    process.env.REACT_APP_API_URL = 'http://127.0.0.1:8000/';
    expect(getWsBaseUrl()).toBe('ws://127.0.0.1:8000');
  });

  test('019: getWsBaseUrl never uses ws://localhost inside Capacitor APK runtime', () => {
    window.Capacitor = { isNativePlatform: () => true };
    expect(getWsBaseUrl()).toBe('wss://lovelink-sfzx.onrender.com');
    delete window.Capacitor;
  });

  // ── 20-23: Singleton AudioContext helper ──
  test('020: getSharedAudioContext reuses one hardware context across 50 rapid sound triggers', () => {
    const resumeMock = jest.fn().mockResolvedValue(undefined);
    let createdCount = 0;
    const MockCtx = jest.fn(() => {
      createdCount += 1;
      return { state: 'suspended', resume: resumeMock, currentTime: 0 };
    });
    window.AudioContext = MockCtx;

    for (let i = 0; i < 50; i++) {
      const ctx = getSharedAudioContext();
      expect(ctx).toBeTruthy();
    }
    expect(createdCount).toBe(1);
    expect(resumeMock).toHaveBeenCalled();
  });

  test('021: getSharedAudioContext recreates cleanly if context was closed', () => {
    let instanceState = 'running';
    let count = 0;
    window.AudioContext = jest.fn(() => {
      count += 1;
      return {
        get state() { return instanceState; },
        resume: jest.fn().mockResolvedValue(undefined),
      };
    });

    const first = getSharedAudioContext();
    expect(count).toBe(1);
    instanceState = 'closed';
    const second = getSharedAudioContext();
    expect(count).toBe(2);
    expect(second).not.toBe(first);
  });
});
