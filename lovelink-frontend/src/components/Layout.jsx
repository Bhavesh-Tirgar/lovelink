import React from 'react';
import NavigationDock from './NavigationDock';
import FloatingMusicPlayer from './FloatingMusicPlayer';
import InstallPrompt from './InstallPrompt';
import { useLocation } from 'react-router-dom';

export default function Layout({ children }) {
    const location = useLocation();
    const hiddenPaths = ['/login', '/signup', '/link'];
    const isFullscreen = location.pathname.startsWith('/call/') || 
        location.pathname.startsWith('/watch/') || 
        location.pathname === '/touch' || 
        location.pathname === '/universe' || 
        location.pathname === '/map' || 
        location.pathname === '/chat' || 
        location.pathname === '/doodle';
    const isAuthPage = hiddenPaths.includes(location.pathname);

    return (
        <div className="relative min-h-[100dvh] bg-brand-darker text-gray-100 font-sans overflow-hidden">

            {/* Dynamic Background Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-700/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
                <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-pink-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-rose-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000" />

                {!isAuthPage && !isFullscreen && (
                    <div
                        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`
                        }}
                    />
                )}
            </div>

            {/* Main Content Area */}
            <main className={isFullscreen ? "relative z-10 w-full h-[100dvh] overflow-hidden" : "relative z-10 min-h-[100dvh] pb-28 sm:pb-32"}>
                {children}
            </main>

            {/* Floating Synchronized Music Player */}
            {!isAuthPage && !isFullscreen && <FloatingMusicPlayer />}

            {/* PWA Add to Home Screen Prompt */}
            {!isAuthPage && !isFullscreen && <InstallPrompt />}

            {/* Persistent Floating Dock */}
            {!isAuthPage && !isFullscreen && <NavigationDock />}

        </div>
    );
}
