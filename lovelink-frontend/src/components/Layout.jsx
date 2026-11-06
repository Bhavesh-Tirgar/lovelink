import React from 'react';
import NavigationDock from './NavigationDock';
import FloatingMusicPlayer from './FloatingMusicPlayer';
import { useLocation } from 'react-router-dom';

export default function Layout({ children }) {
    const location = useLocation();
    const hiddenPaths = ['/login', '/signup', '/link'];
    const isCallOrWatch = location.pathname.startsWith('/call/') || location.pathname.startsWith('/watch/') || location.pathname === '/touch' || location.pathname === '/universe';
    const isAuthPage = hiddenPaths.includes(location.pathname);

    return (
        <div className="relative min-h-screen bg-brand-darker text-gray-100 font-sans overflow-hidden">

            {/* Dynamic Background Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-700/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
                <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-pink-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-rose-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000" />

                {!isAuthPage && !isCallOrWatch && (
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
                )}
            </div>

            {/* Main Content Area */}
            <main className={isCallOrWatch ? "relative z-10 w-full h-screen overflow-hidden" : "relative z-10 min-h-screen pb-32"}>
                {children}
            </main>

            {/* Floating Synchronized Music Player */}
            {!isAuthPage && !isCallOrWatch && <FloatingMusicPlayer />}

            {/* Persistent Floating Dock */}
            {!isAuthPage && !isCallOrWatch && <NavigationDock />}

        </div>
    );
}
