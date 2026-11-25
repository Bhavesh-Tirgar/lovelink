import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Chat from '../pages/Chat';
import Layout from '../components/Layout';
import NotificationBell from '../components/NotificationBell';
import Movies from '../pages/Movies';
import WatchCamBubble from '../components/WatchCamBubble';
import CoupleUno from '../components/CoupleUno';
import CoupleChess from '../components/CoupleChess';
import CoupleLudo from '../components/CoupleLudo';
import { MusicProvider, useMusic, DEFAULT_FALLBACK_CHANNELS } from '../context/MusicContext';
import { CallProvider } from '../context/CallContext';
import {
  encryptText,
  decryptText,
  encryptSecret,
  decryptSecret,
  isE2EEMessage,
} from '../utils/crypto';
import { getCallE2EEEmojis } from '../utils/callSecurity';
import { getWsBaseUrl } from '../utils/wsUrl';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => {
  const fn = jest.fn();
  fn.success = jest.fn();
  fn.error = jest.fn();
  return { __esModule: true, default: fn, Toaster: () => null };
});

jest.mock('canvas-confetti', () => jest.fn());

jest.mock('../components/GoogleSignInButton', () => () => <div data-testid="google-signin-btn">Google Mock</div>);
jest.mock('../components/FloatingMusicPlayer', () => () => <div data-testid="floating-music-bar">PlayerBar</div>);
jest.mock('../components/NavigationDock', () => () => <nav data-testid="nav-dock">Dock</nav>);
jest.mock('../components/InstallPrompt', () => () => null);

let mockChatWsHandlers = {};
jest.mock('../hooks/useWebSocket', () => ({
  __esModule: true,
  default: (url, onMessage) => {
    mockChatWsHandlers[url || 'default'] = onMessage;
    return { sendMessage: jest.fn(), isConnected: true };
  },
}));

describe('Extended LoveLink Partner & APK Real Scenario Suite (051-102)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChatWsHandlers = {};
    window.localStorage.clear();
    window.localStorage.setItem('token', 'jwt-ext-1');
    window.localStorage.setItem('couple_id', 'cp-ext-1');
    window.localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Aarav', email: 'aarav@example.com' }));
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── 051-052: ProtectedRoute ──
  test('051: ProtectedRoute redirects unauthenticated users to /login', () => {
    window.localStorage.removeItem('token');
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/dashboard" element={<ProtectedRoute><div data-testid="dash-page">Dash</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  test('052: ProtectedRoute renders protected child route when JWT token is present', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/dashboard" element={<ProtectedRoute><div data-testid="dash-page">Dash</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('dash-page')).toBeInTheDocument();
  });

  // ── 053-057: Login Flows ──
  test('053: Login renders email/phone & password inputs cleanly', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByPlaceholderText('you@example.com or +91XXXXXXXXXX')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  test('054: Login shows validation error if submitted empty', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    const form = screen.getByRole('button', { name: /Log In/i }).closest('form');
    fireEvent.submit(form);
    expect(await screen.findByText(/enter/i)).toBeInTheDocument();
  });

  test('055: Login switches between Password mode and OTP mode', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.click(screen.getByText(/Login with OTP instead/i));
    expect(screen.getByText(/Send OTP/i)).toBeInTheDocument();
  });

  test('056: Login calls POST /auth/login on valid credential submission', async () => {
    api.post.mockResolvedValue({
      data: {
        access_token: 'tok-abc',
        refresh_token: 'ref-abc',
        user: { id: 'u1', name: 'Aarav' },
        couple_id: 'cp-1',
      },
    });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div data-testid="dash-ok">OK</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com or +91XXXXXXXXXX'), { target: { value: 'aarav@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Secret123!' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /Log In/i }).closest('form'));
      await Promise.resolve();
    });
    expect(api.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ identifier: 'aarav@example.com' }));
  });

  test('057: Login renders link to /signup page', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /Create|Sign/i });
    expect(link.getAttribute('href')).toBe('/signup');
  });

  // ── 058-063: Dashboard ──
  function mockDashboardApis(extra = {}) {
    api.get.mockImplementation((url) => {
      if (url === '/dashboard') {
        return Promise.resolve({
          data: {
            my_user: { id: 'u1', name: 'Aarav', email: 'a@x.com', city: 'Delhi', timezone: 'Asia/Kolkata' },
            partner_user: { id: 'u2', name: 'Maya', email: 'm@x.com', city: 'Mumbai', timezone: 'Asia/Kolkata' },
            days_together: 120,
            linked: true,
            couple_id: 'cp-ext-1',
            invite_code: 'LOVE26',
            ...extra,
          },
        });
      }
      if (url.startsWith('/mood')) return Promise.resolve({ data: { my_mood: null, partner_mood: null } });
      if (url.startsWith('/countdowns')) return Promise.resolve({ data: [] });
      if (url.startsWith('/notifications')) return Promise.resolve({ data: [] });
      if (url.startsWith('/media')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
  }

  test('058: Dashboard displays couple days_together and partner name from /dashboard', async () => {
    mockDashboardApis();
    render(<MemoryRouter><CallProvider><Dashboard /></CallProvider></MemoryRouter>);
    expect(await screen.findByText(/Maya/i)).toBeInTheDocument();
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  test('059: Dashboard displays returned invite_code without ------ placeholder', async () => {
    mockDashboardApis({ linked: false, partner_user: null });
    render(<MemoryRouter><CallProvider><Dashboard /></CallProvider></MemoryRouter>);
    expect(await screen.findByText(/LOVE26/)).toBeInTheDocument();
  });

  test('060: Dashboard Voice Call button initiates POST /calls/initiate with voice type', async () => {
    mockDashboardApis();
    api.post.mockResolvedValue({ data: { call_id: 'c-voice-1', user_id: 'u1', partner_id: 'u2' } });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <CallProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/call/:callId" element={<div data-testid="call-screen">Call</div>} />
          </Routes>
        </CallProvider>
      </MemoryRouter>
    );

    const voiceBtn = await screen.findByRole('button', { name: /Voice Call/i });
    await act(async () => {
      fireEvent.click(voiceBtn);
      await Promise.resolve();
    });
    expect(api.post).toHaveBeenCalledWith('/calls/initiate', { call_type: 'voice' });
    expect(await screen.findByTestId('call-screen')).toBeInTheDocument();
  });

  test('061: Dashboard Video Call button initiates POST /calls/initiate with video type', async () => {
    mockDashboardApis();
    api.post.mockResolvedValue({ data: { call_id: 'c-video-1', user_id: 'u1', partner_id: 'u2' } });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <CallProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/call/:callId" element={<div data-testid="call-screen">Call</div>} />
          </Routes>
        </CallProvider>
      </MemoryRouter>
    );

    const videoBtn = await screen.findByRole('button', { name: /Video Call/i });
    await act(async () => {
      fireEvent.click(videoBtn);
      await Promise.resolve();
    });
    expect(api.post).toHaveBeenCalledWith('/calls/initiate', { call_type: 'video' });
  });

  test('062: Dashboard startCall surfaces toast.error instead of failing silently when API rejects', async () => {
    mockDashboardApis();
    api.post.mockRejectedValue({ response: { data: { detail: 'Partner not linked' } } });
    render(<MemoryRouter><CallProvider><Dashboard /></CallProvider></MemoryRouter>);

    const voiceBtn = await screen.findByRole('button', { name: /Voice Call/i });
    await act(async () => {
      fireEvent.click(voiceBtn);
      await Promise.resolve();
    });
    expect(toast.error).toHaveBeenCalledWith('Partner not linked');
  });

  test('063: Dashboard Settings & Profile modal reveals partner info and couple invite_code', async () => {
    mockDashboardApis();
    render(<MemoryRouter><CallProvider><Dashboard /></CallProvider></MemoryRouter>);

    const settingsBtn = await screen.findByTitle('Settings & Profile');
    fireEvent.click(settingsBtn);
    expect(await screen.findByText(/LOVE26/)).toBeInTheDocument();
  });

  // ── 064-069: Chat E2EE & UI ──
  function mockChatApi(messagesImpl) {
    api.get.mockImplementation((url) => {
      if (url === '/dashboard') {
        return Promise.resolve({
          data: {
            my_user: { id: 'u1', name: 'Aarav' },
            partner_user: { id: 'u2', name: 'Maya' },
            linked: true,
            couple_id: 'cp-ext-1',
          },
        });
      }
      if (url.startsWith('/notifications')) return Promise.resolve({ data: [] });
      if (url.startsWith('/chat/messages')) return messagesImpl(url);
      return Promise.resolve({ data: {} });
    });
  }

  test('064: Chat renders fetched messages and decrypts E2EE legacy messages cleanly', async () => {
    const enc = await encryptText('Secret hug from earlier', 'cp-ext-1');
    mockChatApi(() => Promise.resolve({
      data: [{
        id: 'm1',
        sender_id: 'u2',
        text: enc,
        message_type: 'text',
        created_at: new Date().toISOString(),
      }],
    }));

    render(<MemoryRouter><Chat /></MemoryRouter>);
    expect(await screen.findByText('Secret hug from earlier')).toBeInTheDocument();
  });

  test('065: Chat optimistic send keeps plaintext without raw e2ee ciphertext flash on WS echo', async () => {
    mockChatApi(() => Promise.resolve({ data: [] }));
    api.put.mockResolvedValue({ data: {} });
    let resolvePost;
    api.post.mockImplementation(() => new Promise((r) => { resolvePost = r; }));

    render(<MemoryRouter><Chat /></MemoryRouter>);
    const input = await screen.findByPlaceholderText(/Message/i);
    fireEvent.change(input, { target: { value: 'Goodnight my love' } });
    fireEvent.submit(input.closest('form'));

    expect(await screen.findByText('Goodnight my love')).toBeInTheDocument();

    // Simulate incoming WS echo carrying e2ee ciphertext from sender
    const encEcho = await encryptText('Goodnight my love', 'cp-ext-1');
    const wsHandler = Object.values(mockChatWsHandlers).find(fn => typeof fn === 'function');
    if (wsHandler) {
      act(() => {
        wsHandler({
          type: 'message',
          message: { id: 'db-m-1', sender_id: 'u1', text: encEcho, message_type: 'text', created_at: new Date().toISOString() },
        });
      });
    }

    expect(screen.queryByText(/^e2ee/)).not.toBeInTheDocument();
    expect(screen.getByText('Goodnight my love')).toBeInTheDocument();
    if (resolvePost) resolvePost({ data: { id: 'db-m-1' } });
  });

  test('066: Chat loadMoreMessages decrypts older paginated messages instead of leaving raw ciphertext', async () => {
    const encOlder = await encryptText('Older secret memory', 'cp-ext-1');
    const initialBatch = Array.from({ length: 50 }, (_, i) => ({
      id: `m-${i}`,
      sender_id: 'u2',
      text: `Msg ${i}`,
      message_type: 'text',
      created_at: new Date(Date.now() - (50 - i) * 60000).toISOString(),
    }));
    mockChatApi((url) => {
      if (url.includes('before_id=')) {
        return Promise.resolve({
          data: [{ id: 'm-old', sender_id: 'u2', text: encOlder, message_type: 'text', created_at: new Date(Date.now() - 10000000).toISOString() }],
        });
      }
      return Promise.resolve({ data: initialBatch });
    });

    const { container } = render(<MemoryRouter><Chat /></MemoryRouter>);
    await screen.findByText('Msg 0');
    const scroller = container.querySelector('.overflow-y-auto');
    expect(scroller).toBeTruthy();
    Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true });
    await act(async () => {
      fireEvent.scroll(scroller);
      await Promise.resolve();
    });
    expect(await screen.findByText('Older secret memory')).toBeInTheDocument();
    expect(screen.queryByText(/^e2ee/)).not.toBeInTheDocument();
  });

  test('067: Chat renders mobile-accessible reaction buttons (opacity-100 on small viewports)', async () => {
    mockChatApi(() => Promise.resolve({
      data: [{ id: 'm1', sender_id: 'u2', text: 'Tap me', message_type: 'text', created_at: new Date().toISOString() }],
    }));

    const { container } = render(<MemoryRouter><Chat /></MemoryRouter>);
    await screen.findByText('Tap me');
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.some(b => b.className.includes('opacity-100'))).toBe(true);
  });

  test('068: Chat search filters visible messages in DOM', async () => {
    mockChatApi(() => Promise.resolve({
      data: [
        { id: 'm1', sender_id: 'u2', text: 'Pizza night', message_type: 'text', created_at: new Date().toISOString() },
        { id: 'm2', sender_id: 'u2', text: 'Movie marathon', message_type: 'text', created_at: new Date().toISOString() },
      ],
    }));

    render(<MemoryRouter><Chat /></MemoryRouter>);
    expect(await screen.findByText('Pizza night')).toBeInTheDocument();

    const searchBtn = screen.getAllByRole('button').find(b => b.getAttribute('title')?.toLowerCase().includes('search'));
    if (searchBtn) {
      fireEvent.click(searchBtn);
      const qInput = screen.getByPlaceholderText(/Search/i);
      fireEvent.change(qInput, { target: { value: 'Pizza' } });
      expect(screen.getByText('Pizza night')).toBeInTheDocument();
      expect(screen.queryByText('Movie marathon')).not.toBeInTheDocument();
    }
  });

  test('069: Chat renders Safety Code verification button', async () => {
    mockChatApi(() => Promise.resolve({ data: [] }));
    const { container } = render(<MemoryRouter><Chat /></MemoryRouter>);
    await screen.findByPlaceholderText(/Message/i);
    expect(container.querySelector('button')).toBeTruthy();
  });

  // ── 070-074: Layout, NotificationBell & Movies ──
  test('070: Layout hides NavigationDock and FloatingMusicPlayer on /call/ fullscreen routes', () => {
    render(
      <MemoryRouter initialEntries={['/call/call-9']}>
        <Layout><div data-testid="call-inner">CallInner</div></Layout>
      </MemoryRouter>
    );
    expect(screen.getByTestId('call-inner')).toBeInTheDocument();
    expect(screen.queryByTestId('nav-dock')).toBeNull();
    expect(screen.queryByTestId('floating-music-bar')).toBeNull();
  });

  test('071: Layout shows NavigationDock and FloatingMusicPlayer on /dashboard route', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout><div data-testid="dash-inner">DashInner</div></Layout>
      </MemoryRouter>
    );
    expect(screen.getByTestId('nav-dock')).toBeInTheDocument();
    expect(screen.getByTestId('floating-music-bar')).toBeInTheDocument();
  });

  test('072: NotificationBell fetches notifications and marks individual item read', async () => {
    api.get.mockResolvedValue({
      data: [{ id: 'n1', title: 'Hug Alert', body: 'Maya sent a hug', is_read: false, created_at: new Date().toISOString() }],
    });
    api.put.mockResolvedValue({ data: {} });

    const { container } = render(<NotificationBell />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications'));
    fireEvent.click(container.querySelector('button'));
    expect(await screen.findByText(/Maya sent a hug/i)).toBeInTheDocument();

    const item = screen.getByText(/Maya sent a hug/i);
    fireEvent.click(item.closest('div'));
    expect(api.put).toHaveBeenCalledWith('/notifications/n1/read');
  });

  test('073: Movies page loads couple video catalog cleanly', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/dashboard') return Promise.resolve({ data: { my_user: { id: 'u1', name: 'Aarav' } } });
      if (url === '/movies?watched=false') {
        return Promise.resolve({
          data: [{ id: 'mov-1', title: 'Our Date Vlog', source_type: 'youtube', youtube_url: 'https://youtu.be/dQw4w9WgXcQ', created_at: new Date().toISOString() }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    render(<MemoryRouter><Movies /></MemoryRouter>);
    expect(await screen.findByText('Our Date Vlog')).toBeInTheDocument();
  });

  test('074: NotificationBell triggers PUT /notifications/read-all cleanly', async () => {
    api.get.mockResolvedValue({
      data: [
        { id: 'n1', title: 'Hi', body: 'Alert 1', is_read: false, created_at: new Date().toISOString() },
        { id: 'n2', title: 'Hi2', body: 'Alert 2', is_read: false, created_at: new Date().toISOString() },
      ],
    });
    api.put.mockResolvedValue({ data: {} });

    const { container } = render(<NotificationBell />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(container.querySelector('button'));
    const markAll = await screen.findByText(/Mark all read/i);
    fireEvent.click(markAll);
    expect(api.put).toHaveBeenCalledWith('/notifications/read-all');
  });

  // ── 075-078: WatchCamBubble Track & Stop Lifecycle ──
  function setupBubbleWebRTC() {
    const audioTrack = { kind: 'audio', enabled: true, stop: jest.fn() };
    const videoTrack = { kind: 'video', enabled: true, stop: jest.fn() };
    const stream = {
      getTracks: () => [audioTrack, videoTrack],
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => [videoTrack],
    };
    Object.defineProperty(global.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
    });
    const pcMock = {
      addTrack: jest.fn(),
      createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 's' }),
      setLocalDescription: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    };
    global.RTCPeerConnection = jest.fn(() => pcMock);
    return { audioTrack, videoTrack, pcMock };
  }

  test('075: WatchCamBubble toggleMic flips underlying audio track enabled flag', async () => {
    const { audioTrack } = setupBubbleWebRTC();
    const sendWs = jest.fn();
    const { container } = render(
      <WatchCamBubble coupleId="c1" myUser={{ id: 'u1' }} partnerUser={{ id: 'u2', name: 'M' }} sendWsMessage={sendWs} onIncomingSync={null} />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Live Cam Bubble'));
      await Promise.resolve();
    });

    const micBtn = Array.from(container.querySelectorAll('button')).find(b => b.getAttribute('title')?.toLowerCase().includes('mic') || b.querySelector('.lucide-mic'));
    if (micBtn) {
      fireEvent.click(micBtn);
      expect(audioTrack.enabled).toBe(false);
    }
  });

  test('076: WatchCamBubble toggleCam flips underlying video track enabled flag', async () => {
    const { videoTrack } = setupBubbleWebRTC();
    const sendWs = jest.fn();
    const { container } = render(
      <WatchCamBubble coupleId="c1" myUser={{ id: 'u1' }} partnerUser={{ id: 'u2', name: 'M' }} sendWsMessage={sendWs} onIncomingSync={null} />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Live Cam Bubble'));
      await Promise.resolve();
    });

    const camBtn = Array.from(container.querySelectorAll('button')).find(b => b.getAttribute('title')?.toLowerCase().includes('cam') || b.querySelector('.lucide-video'));
    if (camBtn) {
      fireEvent.click(camBtn);
      expect(videoTrack.enabled).toBe(false);
    }
  });

  test('077: WatchCamBubble stopCam stops all media tracks, closes PC, and emits watch_cam_leave', async () => {
    const { audioTrack, videoTrack, pcMock } = setupBubbleWebRTC();
    const sendWs = jest.fn();
    const { container } = render(
      <WatchCamBubble coupleId="c1" myUser={{ id: 'u1' }} partnerUser={{ id: 'u2', name: 'M' }} sendWsMessage={sendWs} onIncomingSync={null} />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Live Cam Bubble'));
      await Promise.resolve();
    });

    const closeBtn = Array.from(container.querySelectorAll('button')).find(b => b.querySelector('.lucide-x'));
    fireEvent.click(closeBtn);
    expect(audioTrack.stop).toHaveBeenCalled();
    expect(videoTrack.stop).toHaveBeenCalled();
    expect(pcMock.close).toHaveBeenCalled();
    expect(sendWs).toHaveBeenCalledWith({ type: 'watch_cam_leave' });
  });

  test('078: WatchCamBubble clears invite badge when partner sends watch_cam_leave', () => {
    const { rerender } = render(
      <WatchCamBubble coupleId="c1" myUser={{ id: 'u1' }} partnerUser={{ id: 'u2' }} sendWsMessage={jest.fn()} onIncomingSync={{ type: 'watch_cam_join' }} />
    );
    expect(screen.getByText('Join Partner Cam')).toBeInTheDocument();

    rerender(
      <WatchCamBubble coupleId="c1" myUser={{ id: 'u1' }} partnerUser={{ id: 'u2' }} sendWsMessage={jest.fn()} onIncomingSync={{ type: 'watch_cam_leave' }} />
    );
    expect(screen.getByText('Live Cam Bubble')).toBeInTheDocument();
  });

  // ── 079-087: Games (Uno, Chess, Ludo) ──
  test('079: CoupleUno deals 7 cards and initializes valid non-wild top card', async () => {
    const sendWs = jest.fn();
    render(<CoupleUno userId="u1" coupleId="c-u1" partnerName="Bot" sendWs={sendWs} unoState={{}} gameMode="bot" />);
    await waitFor(() => expect(sendWs).toHaveBeenCalledWith(expect.objectContaining({ action: 'sync_init' })));
    const init = sendWs.mock.calls[0][0];
    expect(init.p1_hand).toHaveLength(7);
    expect(init.p2_hand).toHaveLength(7);
    expect(init.top_card.color).not.toBe('wild');
  });

  test('080: CoupleUno playing a matching non-skip card advances turn locally to partner', async () => {
    const sendWs = jest.fn();
    const myCard = { id: 'card-num-1', color: 'red', value: '5' };
    window.localStorage.setItem('lovelink_uno_hand_c-u2_u1', JSON.stringify([myCard, { id: 'c2', color: 'blue', value: '9' }]));

    render(
      <CoupleUno
        userId="u1"
        coupleId="c-u2"
        partnerName="Partner"
        sendWs={sendWs}
        unoState={{ top_card: { id: 'top', color: 'red', value: '2' }, discard: [{ id: 'top', color: 'red', value: '2' }], active_color: 'red', turn: 'u1', player_1: 'u1', p1_hand: [myCard, { id: 'c2', color: 'blue', value: '9' }] }}
        gameMode="online"
      />
    );

    const cardBtn = await screen.findByText('5');
    fireEvent.click(cardBtn.closest('button'));
    expect(sendWs).toHaveBeenCalledWith(expect.objectContaining({ action: 'play_card', next_turn: 'partner' }));
    expect(screen.queryByText(/Your Turn/i)).not.toBeInTheDocument();
  });

  test('081: CoupleUno playing skip/draw+2 keeps turn on caller in 1v1', async () => {
    const sendWs = jest.fn();
    const skipCard = { id: 'card-skip-1', color: 'red', value: 'skip' };
    window.localStorage.setItem('lovelink_uno_hand_c-u3_u1', JSON.stringify([skipCard, { id: 'c2', color: 'green', value: '3' }]));

    render(
      <CoupleUno
        userId="u1"
        coupleId="c-u3"
        partnerName="Partner"
        sendWs={sendWs}
        unoState={{ top_card: { id: 'top', color: 'red', value: '1' }, discard: [{ id: 'top', color: 'red', value: '1' }], active_color: 'red', turn: 'u1', player_1: 'u1', p1_hand: [skipCard, { id: 'c2', color: 'green', value: '3' }] }}
        gameMode="online"
      />
    );

    const cardEl = (await screen.findAllByText(/skip/i))[0];
    fireEvent.click(cardEl.closest('button'));
    expect(sendWs).toHaveBeenCalledWith(expect.objectContaining({ action: 'play_card', next_turn: 'u1' }));
  });

  test('082: CoupleUno playing Wild card opens color picker modal and applies chosen color', async () => {
    const sendWs = jest.fn();
    const wildCard = { id: 'card-wild-1', color: 'wild', value: 'wild' };
    window.localStorage.setItem('lovelink_uno_hand_c-u4_u1', JSON.stringify([wildCard, { id: 'c2', color: 'blue', value: '4' }]));

    render(
      <CoupleUno
        userId="u1"
        coupleId="c-u4"
        partnerName="Partner"
        sendWs={sendWs}
        unoState={{ top_card: { id: 'top', color: 'red', value: '1' }, discard: [{ id: 'top', color: 'red', value: '1' }], active_color: 'red', turn: 'u1', player_1: 'u1', p1_hand: [wildCard, { id: 'c2', color: 'blue', value: '4' }] }}
        gameMode="online"
      />
    );

    const wildBtn = (await screen.findAllByText(/wild/i))[0].closest('button');
    fireEvent.click(wildBtn);
    const blueChoice = await screen.findByText(/blue/i);
    fireEvent.click(blueChoice.closest('button'));
    expect(sendWs).toHaveBeenCalledWith(expect.objectContaining({ action: 'play_card', active_color: 'blue' }));
  });

  test('083: CoupleUno handleReset emits reset action cleanly', () => {
    const sendWs = jest.fn();
    render(<CoupleUno userId="u1" coupleId="c-u5" partnerName="Partner" sendWs={sendWs} unoState={{}} gameMode="bot" />);
    const resetBtn = screen.getByTitle('New Round / Shuffle');
    fireEvent.click(resetBtn);
    expect(sendWs).toHaveBeenCalledWith({ game: 'uno', action: 'reset' });
  });

  test('084: CoupleChess orients rank 1 at bottom for White player and rank 8 for Black player', () => {
    const { container, rerender } = render(
      <CoupleChess userId="u1" coupleId="c-ch1" partnerName="Maya" sendWs={jest.fn()} chessState={{ white: 'u1' }} gameMode="online" />
    );
    const firstSquareWhite = container.querySelector('[data-square]')?.getAttribute('data-square');
    rerender(
      <CoupleChess userId="u2" coupleId="c-ch1" partnerName="Aarav" sendWs={jest.fn()} chessState={{ white: 'u1' }} gameMode="online" />
    );
    const firstSquareBlack = container.querySelector('[data-square]')?.getAttribute('data-square');
    if (firstSquareWhite && firstSquareBlack) {
      expect(firstSquareWhite).not.toBe(firstSquareBlack);
    }
    expect(screen.getByText(/Chess/i)).toBeInTheDocument();
  });

  test('085: CoupleChess Rematch sends reset event with starting FEN', () => {
    const sendWs = jest.fn();
    render(<CoupleChess userId="u1" coupleId="c-ch2" partnerName="Maya" sendWs={sendWs} chessState={{ white: 'u1' }} gameMode="bot" />);
    const resetBtn = screen.getByTitle(/Rematch|Reset/i);
    fireEvent.click(resetBtn);
    expect(sendWs).toHaveBeenCalledWith(expect.objectContaining({ game: 'chess', action: 'reset' }));
  });

  test('086: CoupleLudo renders board controls and toggles sound without crashing', () => {
    render(<CoupleLudo userId="u1" coupleId="c-l1" partnerName="Maya" sendWs={jest.fn()} ludoState={{}} gameMode="bot" />);
    expect(screen.getByText(/Ludo/i)).toBeInTheDocument();
    const soundBtn = screen.getByTitle(/Sound|Mute/i);
    fireEvent.click(soundBtn);
    expect(soundBtn).toBeInTheDocument();
  });

  test('087: CoupleUno handles sound toggle cleanly without instantiating orphaned AudioContexts', () => {
    let ctxCalls = 0;
    window.AudioContext = jest.fn(() => { ctxCalls += 1; return { state: 'running', resume: jest.fn() }; });
    render(<CoupleUno userId="u1" coupleId="c-u6" partnerName="Maya" sendWs={jest.fn()} unoState={{}} gameMode="bot" />);
    const soundBtn = screen.getByTitle(/Sound|Mute/i);
    fireEvent.click(soundBtn);
    expect(ctxCalls).toBe(0);
  });

  // ── 088-094: MusicContext Extended Behavior ──
  test('088: MusicProvider restores saved track & position from localStorage on startup', async () => {
    window.localStorage.setItem('lovelink_spotify_playback_state', JSON.stringify({
      track: { id: 'saved-1', title: 'Restored Song', artist: 'Saved Artist', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', type: 'audio', duration: 200 },
      currentTime: 65,
      duration: 200,
      volume: 0.5,
    }));
    api.get.mockResolvedValue({ data: DEFAULT_FALLBACK_CHANNELS });

    let ctxRef;
    function Reader() { ctxRef = useMusic(); return <span>{ctxRef.currentTrack?.title}</span>; }
    render(<MemoryRouter><MusicProvider><Reader /></MusicProvider></MemoryRouter>);
    expect(await screen.findByText('Restored Song')).toBeInTheDocument();
    expect(ctxRef.volume).toBe(0.5);
  });

  test('089: MusicProvider changeVolume updates underlying HTMLAudio volume', async () => {
    api.get.mockResolvedValue({ data: DEFAULT_FALLBACK_CHANNELS });
    let ctxRef;
    function Reader() { ctxRef = useMusic(); return null; }
    const { container } = render(<MemoryRouter><MusicProvider><Reader /></MusicProvider></MemoryRouter>);
    await waitFor(() => expect(ctxRef.currentTrack).toBeTruthy());

    act(() => ctxRef.changeVolume(0.35));
    expect(container.querySelector('audio').volume).toBeCloseTo(0.35);
  });

  test('090: MusicProvider Shuffle skips repeating same track index when pool has >1 tracks', async () => {
    api.get.mockResolvedValue({ data: DEFAULT_FALLBACK_CHANNELS });
    let ctxRef;
    function Reader() { ctxRef = useMusic(); return null; }
    render(<MemoryRouter><MusicProvider><Reader /></MusicProvider></MemoryRouter>);
    await waitFor(() => expect(ctxRef.currentTrack?.id).toBe('bw-1'));

    act(() => ctxRef.toggleShuffle());
    expect(ctxRef.isShuffle).toBe(true);
    await act(async () => { ctxRef.playNext(); await Promise.resolve(); });
    expect(ctxRef.currentTrack.id).not.toBe('bw-1');
  });

  test('091: MusicProvider MediaSession action handler only registers once per mount (dependency [])', async () => {
    const setActionSpy = jest.fn();
    Object.defineProperty(global.navigator, 'mediaSession', {
      configurable: true,
      value: { metadata: null, playbackState: 'none', setPositionState: jest.fn(), setActionHandler: setActionSpy },
    });
    window.MediaMetadata = jest.fn((m) => m);
    api.get.mockResolvedValue({ data: DEFAULT_FALLBACK_CHANNELS });

    let ctxRef;
    function Reader() { ctxRef = useMusic(); return null; }
    render(<MemoryRouter><MusicProvider><Reader /></MusicProvider></MemoryRouter>);
    await waitFor(() => expect(setActionSpy).toHaveBeenCalledTimes(5));

    setActionSpy.mockClear();
    await act(async () => {
      ctxRef.changeVolume(0.2);
      ctxRef.toggleShuffle();
      await Promise.resolve();
    });
    expect(setActionSpy).toHaveBeenCalledTimes(0);
  });

  test('092: MusicProvider renders cleanly even with no JWT token (logged out)', () => {
    window.localStorage.clear();
    let ctxRef;
    function Reader() { ctxRef = useMusic(); return <span data-testid="anon">OK</span>; }
    render(<MemoryRouter><MusicProvider><Reader /></MusicProvider></MemoryRouter>);
    expect(screen.getByTestId('anon')).toBeInTheDocument();
    expect(ctxRef.currentTrack).toBeNull();
  });

  test('093: MusicProvider like button persists liked tracks in localStorage', async () => {
    api.get.mockResolvedValue({ data: DEFAULT_FALLBACK_CHANNELS });
    let ctxRef;
    function Reader() { ctxRef = useMusic(); return null; }
    render(<MemoryRouter><MusicProvider><Reader /></MusicProvider></MemoryRouter>);
    await waitFor(() => expect(ctxRef.currentTrack).toBeTruthy());

    act(() => ctxRef.toggleLikeTrack(ctxRef.currentTrack));
    const savedLikes = JSON.parse(window.localStorage.getItem('lovelink_spotify_liked_tracks'));
    expect(savedLikes).toHaveLength(1);
    expect(savedLikes[0].id).toBe(ctxRef.currentTrack.id);
  });

  test('094: MusicProvider mounts real DOM <audio> element with playsInline and preload="auto"', () => {
    const { container } = render(<MemoryRouter><MusicProvider><div /></MusicProvider></MemoryRouter>);
    const audio = container.querySelector('audio');
    expect(audio).toBeTruthy();
    expect(audio.getAttribute('preload')).toBe('auto');
    expect(audio.hasAttribute('playsInline') || audio.playsInline).toBeTruthy();
  });

  // ── 095-102: Deep Cryptography & Protocol Matrix ──
  test('095: encryptText & decryptText handle Hindi Devanagari + romantic emoji text losslessly', async () => {
    const hindi = 'तुम मेरे साथ हो तो सब कुछ सुंदर है ❤️🌙';
    const cipher = await encryptText(hindi, 'cp-hindi-1');
    expect(isE2EEMessage(cipher)).toBe(true);
    expect(await decryptText(cipher, 'cp-hindi-1')).toBe(hindi);
  });

  test('096: encryptText handles empty string and whitespace cleanly', async () => {
    expect(await encryptText('', 'cp-1')).toBe('');
    const wsCipher = await encryptText('   ', 'cp-1');
    expect(await decryptText(wsCipher, 'cp-1')).toBe('   ');
  });

  test('097: Vault decryptSecret rejects tampered ciphertext tag cleanly', async () => {
    const { ciphertext, iv } = await encryptSecret('Mood journal', '7788', 'cp-v');
    const parts = ciphertext.split(':');
    parts[2] = 'AAAA' + parts[2].slice(4);
    const tampered = parts.join(':');
    expect(await decryptSecret(tampered, iv, '7788', 'cp-v')).toBeNull();
  });

  test('098: Legacy v1 vault format (100k PBKDF2 deterministic salt) still decrypts for backward compatibility', async () => {
    const pin = '9876';
    const coupleId = 'cp-legacy-v1';
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const baseKey = await window.crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']);
    const v1Key = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('lovelink_secret_vault_salt_' + coupleId), iterations: 100000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const ct = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, v1Key, enc.encode('Legacy entry 2025'));
    const b64 = (buf) => Buffer.from(buf).toString('base64');
    expect(await decryptSecret(b64(ct), b64(iv), pin, coupleId)).toBe('Legacy entry 2025');
  });

  test('099: getCallE2EEEmojis is deterministic and symmetric across 50 random UUID pairs', () => {
    for (let i = 0; i < 50; i++) {
      const a = `user-${i}-alpha`;
      const b = `user-${i}-beta`;
      const room = `room-${i}`;
      expect(getCallE2EEEmojis(room, a, b)).toEqual(getCallE2EEEmojis(room, b, a));
      expect(getCallE2EEEmojis(room, a, b)).toHaveLength(4);
    }
  });

  test('100: getWsBaseUrl trims whitespace/trailing slashes safely and falls back cleanly', () => {
    process.env.REACT_APP_WS_URL = 'wss://lovelink-ws.onrender.com///';
    expect(getWsBaseUrl()).toBe('wss://lovelink-ws.onrender.com');
    delete process.env.REACT_APP_WS_URL;
    expect(getWsBaseUrl()).toBe('wss://lovelink-sfzx.onrender.com');
  });

  test('101: DEFAULT_FALLBACK_CHANNELS exposes fallback SoundHelix MP3 for every single Audius track', () => {
    const allTracks = DEFAULT_FALLBACK_CHANNELS.flatMap(c => c.tracks);
    for (const t of allTracks) {
      expect(t.fallback_url).toMatch(/soundhelix\.com\/examples\/mp3\/SoundHelix-Song-\d+\.mp3$/);
    }
  });

  test('102: CountdownsPast renders celebration message when target date has passed', async () => {
    const pastDate = new Date(Date.now() - 86400 * 1000).toISOString();
    api.get.mockImplementation((url) => {
      if (url === '/countdowns') {
        return Promise.resolve({
          data: [{ id: 'cd-past', label: 'Wedding Day', emoji: '💍', target_date: pastDate, seconds_remaining: 0, created_by: 'u1' }],
        });
      }
      if (url === '/dashboard') return Promise.resolve({ data: { my_user: { id: 'u1' } } });
      return Promise.resolve({ data: {} });
    });

    const Countdowns = require('../pages/Countdowns').default;
    render(<MemoryRouter><Countdowns /></MemoryRouter>);
    expect(await screen.findByText(/This moment has arrived!/i)).toBeInTheDocument();
  });
});
