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
import Spark from './pages/Spark';
import Hub from './pages/Hub';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { CallProvider } from './context/CallContext';
import { MusicProvider } from './context/MusicContext';
import { initFirebasePush } from './api';

function App() {
  React.useEffect(() => {
    initFirebasePush();
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
                <Route path="/spark" element={<ProtectedRoute><Spark /></ProtectedRoute>} />
                <Route path="/room" element={<ProtectedRoute><Spark /></ProtectedRoute>} />
                <Route path="/hub" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
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
