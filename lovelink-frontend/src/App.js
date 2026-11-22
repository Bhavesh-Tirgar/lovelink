import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Link from './pages/Link';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Countdowns from './pages/Countdowns';
import Album from './pages/Album';
import Movies from './pages/Movies';
import WatchRoom from './pages/WatchRoom';
import VideoCall from './pages/VideoCall';
import DoodleBoard from './pages/DoodleBoard';
import Games from './pages/Games';
import LiveMap from './pages/LiveMap';
import CycleTracker from './pages/CycleTracker';
import Hub from './pages/Hub';
import Reels from './pages/Reels';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { CallProvider } from './context/CallContext';
import { MusicProvider } from './context/MusicContext';
import { initFirebasePush } from './api';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

function App() {
  React.useEffect(() => {
    initFirebasePush();

    // Listen to native app URL open events (for Google OAuth return from Chrome Custom Tabs)
    let handler = null;
    try {
      CapApp.addListener('appUrlOpen', async (data) => {
        if (data?.url && (data.url.includes('lovelink://auth') || data.url.includes('token='))) {
          try {
            Browser.close().catch(() => { });

            const rawUrl = data.url;
            const queryString = rawUrl.includes('?') ? rawUrl.substring(rawUrl.indexOf('?') + 1) : '';
            const params = new URLSearchParams(queryString);
            const token = params.get('token');
            const refreshToken = params.get('refresh_token');
            const userRaw = params.get('user');
            const coupleId = params.get('couple_id');

            if (token) {
              window.localStorage.setItem('token', token);
              if (refreshToken) window.localStorage.setItem('refresh_token', refreshToken);
              if (userRaw) window.localStorage.setItem('user', decodeURIComponent(userRaw));
              if (coupleId) window.localStorage.setItem('couple_id', coupleId);
              window.location.href = coupleId ? '/dashboard' : '/link';
            }
          } catch (e) {
            console.error('Failed to parse OAuth deep link:', e);
          }
        }
      }).then(h => { handler = h; }).catch(() => { });
    } catch (e) { }

    return () => {
      if (handler && handler.remove) handler.remove();
    };
  }, []);

  return (
    <BrowserRouter>
      <CallProvider>
        <MusicProvider>
          <div className="App font-sans min-h-screen bg-brand-darker text-gray-100 selection:bg-brand-pink/30">
            <Layout>
              <Toaster position="top-center" toastOptions={{
                style: { background: 'rgba(10, 5, 16, 0.8)', color: '#fff', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }
              }} />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/link" element={<ProtectedRoute><Link /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/countdowns" element={<ProtectedRoute><Countdowns /></ProtectedRoute>} />
                <Route path="/album" element={<ProtectedRoute><Album /></ProtectedRoute>} />
                <Route path="/movies" element={<ProtectedRoute><Movies /></ProtectedRoute>} />
                <Route path="/watch/:movieId" element={<ProtectedRoute><WatchRoom /></ProtectedRoute>} />
                <Route path="/call/:callId" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />
                <Route path="/doodle" element={<ProtectedRoute><DoodleBoard /></ProtectedRoute>} />
                <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
                <Route path="/map" element={<ProtectedRoute><LiveMap /></ProtectedRoute>} />
                <Route path="/cycle" element={<ProtectedRoute><CycleTracker /></ProtectedRoute>} />
                <Route path="/hub" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
                <Route path="/reels" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </div>
        </MusicProvider>
      </CallProvider>
    </BrowserRouter>
  );
}

export default App;
