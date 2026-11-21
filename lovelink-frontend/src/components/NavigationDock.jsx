import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Gamepad2, Compass, Headphones } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export default function NavigationDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsPlayerOpen, isPlaying } = useMusic();

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Chat', path: '/chat', icon: MessageCircle },
    { name: 'Games', path: '/games', icon: Gamepad2 },
    { name: 'Hub', path: '/hub', icon: Compass },
  ];

  // Hide dock on auth screens or immersive fullscreen modes
  const hiddenPaths = ['/login', '/signup', '/link'];
  if (
    hiddenPaths.includes(location.pathname) ||
    location.pathname.startsWith('/call/') ||
    location.pathname.startsWith('/watch/') ||
    location.pathname === '/doodle'
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw] w-max select-none">
      <nav aria-label="Main Navigation" className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 bg-black/70 backdrop-blur-2xl border border-white/15 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full transition-all duration-300 group ${
                isActive
                  ? 'text-white bg-gradient-to-r from-rose-500/25 to-pink-500/25 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'text-gray-400 hover:text-rose-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-transform duration-300 ${
                  isActive ? 'scale-110 text-rose-400' : 'group-hover:scale-105'
                }`}
              />
              <span
                className={`text-xs font-bold tracking-wide transition-colors ${
                  isActive ? 'text-white' : 'hidden sm:inline-block text-gray-400 group-hover:text-gray-200'
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}

        {/* Music Player Quick Button */}
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button
          onClick={() => setIsPlayerOpen(true)}
          title="Listen Together"
          className={`relative p-2 rounded-full transition-all duration-300 ${
            isPlaying
              ? 'text-rose-400 bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              : 'text-gray-400 hover:text-rose-300 hover:bg-white/5'
          }`}
        >
          {isPlaying && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
          <Headphones size={18} />
        </button>
      </nav>
    </div>
  );
}
