import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import api from '../api';
import VideoCall from '../pages/VideoCall';
import { CallProvider, useCall } from '../context/CallContext';
import WatchCamBubble from '../components/WatchCamBubble';
import { resetSharedAudioContextForTest } from '../utils/soundFx';

const mockSendWsMessage = jest.fn();
let capturedWsOnMessage = null;

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../hooks/useWebSocket', () => ({
  __esModule: true,
  default: (_url, onMessage) => {
    capturedWsOnMessage = onMessage;
    return {
      sendMessage: mockSendWsMessage,
      isConnected: true,
    };
  },
}));

jest.mock('react-hot-toast', () => {
  const fn = jest.fn();
  fn.success = jest.fn();
  fn.error = jest.fn();
  return { __esModule: true, default: fn, Toaster: () => null };
});

class MockMediaTrack {
  constructor(kind) {
    this.kind = kind;
    this.enabled = true;
    this.stop = jest.fn();
  }
}

class MockMediaStream {
  constructor(tracks = []) {
    this._tracks = tracks;
  }
  getTracks() { return this._tracks; }
  getAudioTracks() { return this._tracks.filter(t => t.kind === 'audio'); }
  getVideoTracks() { return this._tracks.filter(t => t.kind === 'video'); }
  addTrack(t) { this._tracks.push(t); }
  removeTrack(t) { this._tracks = this._tracks.filter(x => x !== t); }
}

class MockRTCPeerConnection {
  static instances = [];
  constructor(cfg) {
    this.config = cfg;
    this.signalingState = 'stable';
    this.iceConnectionState = 'new';
    this.connectionState = 'new';
    this.localDescription = null;
    this.remoteDescription = null;
    this.senders = [];
    MockRTCPeerConnection.instances.push(this);
  }
  addTrack = jest.fn((track, stream) => {
    this.senders.push({ track, stream, replaceTrack: jest.fn() });
  });
  getSenders = jest.fn(() => this.senders);
  createOffer = jest.fn(async () => ({ type: 'offer', sdp: 'v=0 mock-offer' }));
  createAnswer = jest.fn(async () => ({ type: 'answer', sdp: 'v=0 mock-answer' }));
  setLocalDescription = jest.fn(async (desc) => {
    this.localDescription = desc;
    this.signalingState = desc.type === 'offer' ? 'have-local-offer' : 'stable';
  });
  setRemoteDescription = jest.fn(async (desc) => {
    this.remoteDescription = desc;
    if (desc.type === 'offer') this.signalingState = 'have-remote-offer';
    else this.signalingState = 'stable';
  });
  addIceCandidate = jest.fn(async () => {});
  close = jest.fn(() => {
    this.signalingState = 'closed';
  });
}

describe('Calling, CallContext, StrictMode WebRTC & WatchCamBubble Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockRTCPeerConnection.instances = [];
    resetSharedAudioContextForTest();
    window.localStorage.clear();
    window.localStorage.setItem('token', 'jwt-call-1');
    window.localStorage.setItem('couple_id', 'couple-call-1');
    window.localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Aarav' }));
    window.LoveLinkNativeAudio = {
      setPlaybackState: jest.fn(),
      setCallAudioMode: jest.fn(),
    };

    global.RTCPeerConnection = MockRTCPeerConnection;
    global.RTCSessionDescription = jest.fn((d) => d);
    global.RTCIceCandidate = jest.fn((c) => c);
    global.MediaStream = MockMediaStream;

    Object.defineProperty(global.navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: jest.fn(async ({ video }) => {
          const tracks = [new MockMediaTrack('audio')];
          if (video) tracks.push(new MockMediaTrack('video'));
          return new MockMediaStream(tracks);
        }),
      },
    });

    api.get.mockResolvedValue({
      data: {
        id: 'call-100',
        call_type: 'voice',
        started_by: 'u1',
        status: 'answered',
        partner_name: 'Maya',
        user_id: 'u1',
        partner_id: 'u2',
      },
    });
    api.post.mockResolvedValue({ data: { status: 'ended' } });
  });

  test('034: VideoCall initializes cleanly under React.StrictMode double-mount and sets native call audio mode', async () => {
    render(
      <React.StrictMode>
        <MemoryRouter initialEntries={['/call/call-100']}>
          <CallProvider>
            <Routes>
              <Route path="/call/:callId" element={<VideoCall />} />
            </Routes>
          </CallProvider>
        </MemoryRouter>
      </React.StrictMode>
    );

    await waitFor(() => expect(MockRTCPeerConnection.instances.length).toBeGreaterThanOrEqual(1));
    await waitFor(() => expect(window.LoveLinkNativeAudio.setCallAudioMode).toHaveBeenCalledWith(true, false));

    const lastPc = MockRTCPeerConnection.instances[MockRTCPeerConnection.instances.length - 1];
    expect(lastPc.signalingState).not.toBe('closed');
    expect(lastPc.addTrack).toHaveBeenCalled();
  });

  test('035: Caller offer heartbeat does not re-call createOffer while signalingState is have-local-offer (prevents SDP glare)', async () => {
    jest.useFakeTimers();
    render(
      <MemoryRouter initialEntries={['/call/call-100']}>
        <CallProvider>
          <Routes>
            <Route path="/call/:callId" element={<VideoCall />} />
          </Routes>
        </CallProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(MockRTCPeerConnection.instances.length).toBe(1));
    const pc = MockRTCPeerConnection.instances[0];
    await waitFor(() => expect(pc.setLocalDescription).toHaveBeenCalledTimes(1));
    expect(pc.createOffer).toHaveBeenCalledTimes(1);
    expect(pc.signalingState).toBe('have-local-offer');

    await act(async () => {
      jest.advanceTimersByTime(4500);
      await Promise.resolve();
    });

    // Heartbeat re-sends existing localDescription without re-calling createOffer()
    expect(pc.createOffer).toHaveBeenCalledTimes(1);
    const offerMessages = mockSendWsMessage.mock.calls.filter(c => c[0]?.type === 'webrtc_offer');
    expect(offerMessages.length).toBeGreaterThanOrEqual(2);
    jest.useRealTimers();
  });

  test('036: Callee queues early ICE candidates and flushes them after receiving remote offer + sends answer', async () => {
    api.get.mockResolvedValue({
      data: {
        id: 'call-200',
        call_type: 'voice',
        started_by: 'u2',
        status: 'answered',
        partner_name: 'Aarav',
        user_id: 'u1',
        partner_id: 'u2',
      },
    });

    render(
      <MemoryRouter initialEntries={['/call/call-200']}>
        <CallProvider>
          <Routes>
            <Route path="/call/:callId" element={<VideoCall />} />
          </Routes>
        </CallProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(MockRTCPeerConnection.instances.length).toBe(1));
    const pc = MockRTCPeerConnection.instances[0];
    await waitFor(() => expect(pc.addTrack).toHaveBeenCalled());

    await act(async () => {
      window.dispatchEvent(new CustomEvent('lovelink:webrtc_ice_candidate', {
        detail: { call_id: 'call-200', candidate: { candidate: 'candidate:1 1 UDP 1 1.1.1.1 5000 typ host' } },
      }));
      await Promise.resolve();
    });
    expect(pc.addIceCandidate).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('lovelink:webrtc_offer', {
        detail: { call_id: 'call-200', sdp: { type: 'offer', sdp: 'v=0 partner-offer' } },
      }));
      await Promise.resolve();
    });

    expect(pc.setRemoteDescription).toHaveBeenCalled();
    expect(pc.addIceCandidate).toHaveBeenCalledTimes(1);
    expect(pc.createAnswer).toHaveBeenCalledTimes(1);
    expect(mockSendWsMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'webrtc_answer',
      call_id: 'call-200',
    }));
  });

  test('037: Hanging up restores native audio mode and closes PeerConnection + local tracks', async () => {
    render(
      <MemoryRouter initialEntries={['/call/call-100']}>
        <CallProvider>
          <Routes>
            <Route path="/call/:callId" element={<VideoCall />} />
            <Route path="/dashboard" element={<div data-testid="dash-route">Dashboard</div>} />
          </Routes>
        </CallProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(MockRTCPeerConnection.instances.length).toBe(1));
    const pc = MockRTCPeerConnection.instances[0];
    await waitFor(() => expect(pc.addTrack).toHaveBeenCalled());

    const endBtn = screen.getAllByTitle(/end call/i)[0];
    await act(async () => {
      fireEvent.click(endBtn);
      await Promise.resolve();
    });

    expect(pc.close).toHaveBeenCalled();
    expect(window.LoveLinkNativeAudio.setCallAudioMode).toHaveBeenCalledWith(false, false);
    expect(api.post).toHaveBeenCalledWith('/calls/call-100/end');
    await waitFor(() => expect(screen.getByTestId('dash-route')).toBeInTheDocument());
  });

  test('038: Toggle Mic mutes/unmutes the real audio MediaStreamTrack', async () => {
    render(
      <MemoryRouter initialEntries={['/call/call-100']}>
        <CallProvider>
          <Routes>
            <Route path="/call/:callId" element={<VideoCall />} />
          </Routes>
        </CallProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(MockRTCPeerConnection.instances.length).toBe(1));
    const stream = await navigator.mediaDevices.getUserMedia.mock.results[0].value;
    const micTrack = stream.getAudioTracks()[0];
    expect(micTrack.enabled).toBe(true);

    const muteBtn = screen.getByTitle(/mute microphone/i);
    fireEvent.click(muteBtn);
    expect(micTrack.enabled).toBe(false);

    fireEvent.click(muteBtn);
    expect(micTrack.enabled).toBe(true);
  });

  test('039: CallProvider incoming call WS event shows ringing overlay and answers cleanly via /calls/{id}/answer', async () => {
    let createdAudioContexts = 0;
    window.AudioContext = jest.fn(() => {
      createdAudioContexts += 1;
      return {
        state: 'running',
        currentTime: 0,
        resume: jest.fn().mockResolvedValue(undefined),
        createOscillator: () => ({
          type: 'sine',
          frequency: { setValueAtTime: jest.fn() },
          connect: jest.fn(),
          disconnect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
        }),
        createGain: () => ({
          gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
          connect: jest.fn(),
        }),
      };
    });

    api.post.mockResolvedValue({ data: { status: 'answered', call_id: 'inc-1', call_type: 'voice' } });

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <CallProvider>
          <Routes>
            <Route path="/dashboard" element={<div>Home</div>} />
            <Route path="/call/:callId" element={<div data-testid="call-active">In Call</div>} />
          </Routes>
        </CallProvider>
      </MemoryRouter>
    );

    expect(typeof capturedWsOnMessage).toBe('function');
    act(() => {
      capturedWsOnMessage({ type: 'incoming_call', call_id: 'inc-1', caller_name: 'Neha', call_type: 'voice' });
    });
    expect(await screen.findByText('Neha')).toBeInTheDocument();
    expect(createdAudioContexts).toBe(1);

    // Click green answer button (last button inside incoming overlay)
    const buttons = container.querySelectorAll('button');
    const answerBtn = buttons[buttons.length - 1];
    await act(async () => {
      fireEvent.click(answerBtn);
      await Promise.resolve();
    });
    expect(api.post).toHaveBeenCalledWith('/calls/inc-1/answer');
  });

  test('040: WatchCamBubble buffers incoming watch_cam_offer when inactive and answers when joined', async () => {
    const sendWs = jest.fn();
    const { rerender } = render(
      <WatchCamBubble
        coupleId="c1"
        myUser={{ id: 'u1', name: 'Aarav' }}
        partnerUser={{ id: 'u2', name: 'Maya' }}
        sendWsMessage={sendWs}
        onIncomingSync={null}
      />
    );

    expect(screen.getByText('Live Cam Bubble')).toBeInTheDocument();

    // Partner sends offer before local user activated their bubble
    rerender(
      <WatchCamBubble
        coupleId="c1"
        myUser={{ id: 'u1', name: 'Aarav' }}
        partnerUser={{ id: 'u2', name: 'Maya' }}
        sendWsMessage={sendWs}
        onIncomingSync={{ type: 'watch_cam_offer', offer: { type: 'offer', sdp: 'v=0 partner-watch-offer' } }}
      />
    );

    expect(screen.getByText('Join Partner Cam')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Join Partner Cam'));
      await Promise.resolve();
    });

    await waitFor(() => expect(sendWs).toHaveBeenCalledWith(expect.objectContaining({ type: 'watch_cam_answer' })));
    // Drag bubble using Pointer events and ensure X right-offset moves in intuitive screen direction
    const handle = screen.getByText('Watch Cam').parentElement;
    const aside = handle.closest('aside');
    const initialRight = parseFloat(aside.style.right);
    fireEvent.pointerDown(handle, { clientX: 200, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 160, clientY: 130 }); // dragged left by 40px -> right increases
    fireEvent.pointerUp(window);
    expect(parseFloat(aside.style.right)).toBeGreaterThan(initialRight);
  });
});
