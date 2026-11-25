import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api from '../api';
import {
  MusicProvider,
  useMusic,
  hasDirectAudioStream,
  isTrackYouTube,
  DEFAULT_FALLBACK_CHANNELS,
} from '../context/MusicContext';
import FloatingMusicPlayer from '../components/FloatingMusicPlayer';

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

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.sent = [];
    MockWebSocket.instances.push(this);
  }
  send(data) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: 1000 });
  }
  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }
  triggerMessage(payload) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(payload) });
  }
}

function HarnessConsumer({ onState }) {
  const ctx = useMusic();
  onState.current = ctx;
  return (
    <div>
      <span data-testid="track-title">{ctx.currentTrack?.title || 'none'}</span>
      <span data-testid="is-playing">{String(ctx.isPlaying)}</span>
      <span data-testid="is-synced">{String(ctx.isSynced)}</span>
      <span data-testid="repeat-mode">{ctx.repeatMode}</span>
      <span data-testid="shuffle-mode">{String(ctx.isShuffle)}</span>
    </div>
  );
}

describe('MusicContext, FloatingMusicPlayer & Android Background Audio Tests', () => {
  const originalWs = global.WebSocket;
  const originalAudioPlay = window.HTMLMediaElement.prototype.play;
  const originalAudioPause = window.HTMLMediaElement.prototype.pause;

  beforeEach(() => {
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket;
    window.localStorage.clear();
    window.localStorage.setItem('token', 'jwt-music-1');
    window.localStorage.setItem('couple_id', 'couple-music-1');
    window.localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Aarav' }));
    window.LoveLinkNativeAudio = {
      setPlaybackState: jest.fn(),
      setCallAudioMode: jest.fn(),
    };
    window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = jest.fn();

    api.get.mockImplementation((url) => {
      if (url === '/music/channels') return Promise.resolve({ data: DEFAULT_FALLBACK_CHANNELS });
      if (url === '/music/playlist') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    api.post.mockImplementation((url) => {
      if (url === '/auth/ws-ticket') return Promise.resolve({ data: { ticket: 'wstk_music_1' } });
      return Promise.resolve({ data: {} });
    });
  });

  afterAll(() => {
    global.WebSocket = originalWs;
    window.HTMLMediaElement.prototype.play = originalAudioPlay;
    window.HTMLMediaElement.prototype.pause = originalAudioPause;
  });

  test('022: DEFAULT_FALLBACK_CHANNELS contains zero broken Pixabay URLs and valid direct audio tracks', () => {
    expect(DEFAULT_FALLBACK_CHANNELS.length).toBeGreaterThanOrEqual(2);
    for (const ch of DEFAULT_FALLBACK_CHANNELS) {
      expect(ch.tracks.length).toBeGreaterThan(0);
      for (const tr of ch.tracks) {
        expect(tr.type).toBe('audio');
        expect(tr.url).toMatch(/^https:\/\//);
        expect(tr.url).not.toMatch(/pixabay\.com/i);
        expect(tr.fallback_url).toMatch(/^https:\/\//);
        expect(tr.videoId).toBeUndefined();
      }
    }
  });

  test('023: hasDirectAudioStream treats MP3/Audius URLs as direct audio and rejects YouTube watch links', () => {
    expect(hasDirectAudioStream({ url: 'https://api.audius.co/v1/tracks/1/stream' })).toBe(true);
    expect(hasDirectAudioStream({ url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' })).toBe(true);
    expect(hasDirectAudioStream({ url: 'https://www.youtube.com/watch?v=abc' })).toBe(false);
    expect(hasDirectAudioStream({ url: 'https://youtu.be/abc' })).toBe(false);
    expect(hasDirectAudioStream(null)).toBe(false);
  });

  test('024: isTrackYouTube returns false when a direct audio stream exists even if videoId is set', () => {
    expect(isTrackYouTube({ type: 'audio', url: 'https://api.audius.co/v1/tracks/1/stream', videoId: 'xyz' })).toBe(false);
    expect(isTrackYouTube({ type: 'youtube', videoId: 'xyz', url: '' })).toBe(true);
    expect(isTrackYouTube({ type: 'youtube', url: 'https://www.youtube.com/watch?v=xyz', videoId: 'xyz' })).toBe(true);
  });

  test('025: MusicProvider fetches channels, renders FloatingMusicPlayer, and connects WS via single-use ticket', async () => {
    const stateRef = { current: null };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MusicProvider>
          <HarnessConsumer onState={stateRef} />
          <FloatingMusicPlayer />
        </MusicProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('track-title')).toHaveTextContent('Kesariya'));
    expect(screen.getAllByText('Kesariya').length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1));
    expect(MockWebSocket.instances[0].url).toContain('/music/ws/couple-music-1?ticket=wstk_music_1');
  });

  test('026: Playing direct audio track skips YouTube iframe and starts native Android ForegroundService', async () => {
    const stateRef = { current: null };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MusicProvider>
          <HarnessConsumer onState={stateRef} />
          <FloatingMusicPlayer />
        </MusicProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(stateRef.current.currentTrack).toBeTruthy());

    await act(async () => {
      stateRef.current.playTrack(DEFAULT_FALLBACK_CHANNELS[0].tracks[0]);
      await Promise.resolve();
    });

    expect(screen.getByTestId('is-playing')).toHaveTextContent('true');
    expect(document.getElementById('yt-music-iframe')).toBeNull();
    expect(window.LoveLinkNativeAudio.setPlaybackState).toHaveBeenCalledWith(
      true,
      'Kesariya',
      'Arijit Singh & Pritam'
    );
  });

  test('027: Pausing via togglePlay pauses HTMLAudio, stops native ForegroundService, and sends WS pause', async () => {
    const stateRef = { current: null };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MusicProvider>
          <HarnessConsumer onState={stateRef} />
        </MusicProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(stateRef.current.currentTrack).toBeTruthy());
    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
    act(() => MockWebSocket.instances[0].triggerOpen());

    await act(async () => {
      stateRef.current.playTrack(DEFAULT_FALLBACK_CHANNELS[0].tracks[0]);
      await Promise.resolve();
    });
    expect(stateRef.current.isPlaying).toBe(true);

    act(() => stateRef.current.togglePlay());
    expect(stateRef.current.isPlaying).toBe(false);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(window.LoveLinkNativeAudio.setPlaybackState).toHaveBeenLastCalledWith(
      false,
      'Kesariya',
      'Arijit Singh & Pritam'
    );
    expect(MockWebSocket.instances[0].sent.some(m => m.type === 'pause')).toBe(true);
  });

  test('028: HTMLAudio error on primary stream automatically switches to fallback_url once', async () => {
    const stateRef = { current: null };
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MusicProvider>
          <HarnessConsumer onState={stateRef} />
        </MusicProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(stateRef.current.currentTrack).toBeTruthy());
    const audioEl = container.querySelector('audio');
    expect(audioEl).toBeTruthy();

    await act(async () => {
      stateRef.current.playTrack(DEFAULT_FALLBACK_CHANNELS[0].tracks[0]);
      await Promise.resolve();
    });

    window.HTMLMediaElement.prototype.play.mockClear();
    fireEvent.error(audioEl);
    expect(audioEl.src).toContain('SoundHelix-Song-1.mp3');
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);

    // Second consecutive error stops cleanly instead of looping
    fireEvent.error(audioEl);
    expect(stateRef.current.isPlaying).toBe(false);
  });

  test('029: Android AudioFocus loss pauses music and gain auto-resumes only if interrupted by focus loss', async () => {
    const stateRef = { current: null };
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MusicProvider>
          <HarnessConsumer onState={stateRef} />
        </MusicProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(stateRef.current.currentTrack).toBeTruthy());
    const audioEl = container.querySelector('audio');
    await act(async () => {
      stateRef.current.playTrack(DEFAULT_FALLBACK_CHANNELS[0].tracks[0]);
      await Promise.resolve();
    });

    act(() => window.dispatchEvent(new CustomEvent('lovelink:audiofocus_lost')));
    expect(stateRef.current.isPlaying).toBe(false);

    await act(async () => {
      window.dispatchEvent(new CustomEvent('lovelink:audiofocus_gain'));
      await Promise.resolve();
    });
    expect(stateRef.current.isPlaying).toBe(true);

    // Manual user pause should NOT auto-resume on spurious focus gain
    act(() => stateRef.current.togglePlay());
    expect(stateRef.current.isPlaying).toBe(false);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('lovelink:audiofocus_gain'));
      await Promise.resolve();
    });
    expect(stateRef.current.isPlaying).toBe(false);
    expect(audioEl).toBeTruthy();
  });

  test('030: Remote WS sync_state, change_track, pause, play, and seek work with live currentTrack ref (no stale closure)', async () => {
    const stateRef = { current: null };
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MusicProvider>
          <HarnessConsumer onState={stateRef} />
        </MusicProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
    const ws = MockWebSocket.instances[0];
    act(() => ws.triggerOpen());

    const remoteTrack = DEFAULT_FALLBACK_CHANNELS[0].tracks[2];
    act(() => ws.triggerMessage({
      type: 'change_track',
      track: remoteTrack,
      is_playing: true,
      position: 42,
      dj_name: 'Neha',
    }));

    expect(screen.getByTestId('track-title')).toHaveTextContent(remoteTrack.title);
    expect(screen.getByTestId('is-playing')).toHaveTextContent('true');

    act(() => ws.triggerMessage({ type: 'pause', position: 50 }));
    expect(screen.getByTestId('is-playing')).toHaveTextContent('false');

    act(() => ws.triggerMessage({ type: 'seek', position: 95 }));
    expect(container.querySelector('audio').currentTime).toBe(95);

    act(() => ws.triggerMessage({ type: 'play', position: 95 }));
    expect(screen.getByTestId('is-playing')).toHaveTextContent('true');
  });

  test('031: playNext, playPrev, repeatMode="one", and toggleLikeTrack behave accurately', async () => {
    const stateRef = { current: null };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MusicProvider>
          <HarnessConsumer onState={stateRef} />
        </MusicProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(stateRef.current.currentTrack?.id).toBe('bw-1'));

    await act(async () => { stateRef.current.playNext(); await Promise.resolve(); });
    expect(stateRef.current.currentTrack.id).toBe('bw-2');

    await act(async () => { stateRef.current.playPrev(); await Promise.resolve(); });
    expect(stateRef.current.currentTrack.id).toBe('bw-1');

    act(() => {
      stateRef.current.toggleRepeat(); // all
      stateRef.current.toggleRepeat(); // one
    });
    expect(screen.getByTestId('repeat-mode')).toHaveTextContent('one');

    await act(async () => { stateRef.current.playNext(); await Promise.resolve(); });
    expect(stateRef.current.currentTrack.id).toBe('bw-1');

    act(() => stateRef.current.toggleLikeTrack(stateRef.current.currentTrack));
    expect(stateRef.current.isLiked(stateRef.current.currentTrack)).toBe(true);
  });

  test('032: FloatingMusicPlayer Search tab Play button calls stopPropagation so track only triggers once, and Jukebox preserves audio type', async () => {
    const songResult = {
      id: 'audius-123',
      title: 'Tujhe Dekha',
      artist: 'Lofi Studio',
      cover: 'https://example.com/c.jpg',
      url: 'https://api.audius.co/v1/tracks/123/stream?app_name=lovelink',
      duration: 210,
      type: 'audio',
    };
    api.get.mockImplementation((url) => {
      if (url === '/music/channels') return Promise.resolve({ data: DEFAULT_FALLBACK_CHANNELS });
      if (url === '/music/playlist') return Promise.resolve({ data: [] });
      if (url.startsWith('/music/search')) return Promise.resolve({ data: [songResult] });
      return Promise.resolve({ data: [] });
    });
    api.post.mockImplementation((url, body) => {
      if (url === '/auth/ws-ticket') return Promise.resolve({ data: { ticket: 't1' } });
      if (url === '/music/playlist') return Promise.resolve({ data: { track: { ...body, id: 'custom-1' } } });
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MusicProvider>
          <FloatingMusicPlayer />
        </MusicProvider>
      </MemoryRouter>
    );

    const miniTitle = await screen.findByText('Kesariya');
    fireEvent.click(miniTitle);

    const searchTab = await screen.findByText('Search');
    fireEvent.click(searchTab);

    const input = screen.getByPlaceholderText(/Search any song/i);
    fireEvent.change(input, { target: { value: 'Tujhe Dekha' } });
    fireEvent.submit(input.closest('form'));

    const foundRowTitle = await screen.findByText('Tujhe Dekha');
    const rowContainer = foundRowTitle.closest('div.group');
    const buttons = rowContainer.querySelectorAll('button');
    // buttons[0] = Add to Jukebox, buttons[1] = Play
    window.HTMLMediaElement.prototype.play.mockClear();
    fireEvent.click(buttons[1]);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);

    fireEvent.click(buttons[0]);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/music/playlist',
        expect.objectContaining({ type: 'audio', url: songResult.url })
      )
    );
  });

  test('033: FloatingMusicPlayer hides cleanly on /login and /call/ routes', async () => {
    const { container, rerender } = render(
      <MemoryRouter initialEntries={['/login']}>
        <MusicProvider>
          <FloatingMusicPlayer />
        </MusicProvider>
      </MemoryRouter>
    );
    expect(container.querySelector('button[title="Play"]')).toBeNull();

    rerender(
      <MemoryRouter initialEntries={['/call/call-123']}>
        <MusicProvider>
          <FloatingMusicPlayer />
        </MusicProvider>
      </MemoryRouter>
    );
    expect(container.querySelector('button[title="Play"]')).toBeNull();
  });
});
