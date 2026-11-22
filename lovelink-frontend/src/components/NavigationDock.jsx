import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, MessageCircle, Gamepad2, Compass, Headphones, Clapperboard } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export default function NavigationDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsPlayerOpen, isPlaying } = useMusic();

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Reels', path: '/reels', icon: Clapperboard },
    { name: 'Chat', path: '/chat', icon: MessageCircle },
    { name: 'Games', path: '/games', icon: Gamepad2 },
    { name: 'Hub', path: '/hub', icon: Compass },
  ];

  // Hide dock on auth screens or call screens
  const hiddenPaths = ['/login', '/signup', '/link'];
  if (
    hiddenPaths.includes(location.pathname) ||
    location.pathname.startsWith('/call/') ||
    location.pathname.startsWith('/watch/') ||
    location.pathname === '/doodle'
  ) {
    return null;
  }

  const isReels = location.pathname === '/reels';

  return (
    <div
      className={`fixed ${
        isReels
          ? 'bottom-[max(0.5rem,env(safe-area-inset-bottom))]'
          : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6'
      } left-1/2 -translate-x-1/2 z-50 max-w-[95vw] w-max select-none`}
    >
      <nav
        aria-label="Main Navigation"
        className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full backdrop-blur-2xl transition-all duration-300 ${
          isReels
            ? 'bg-black/50 border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.9)]'
            : 'bg-black/70 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
        }`}
      >
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <motion.button
              key={item.name}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full transition-colors group"
            >
              {isActive && (
                <motion.div
                  layoutId="activeDockPill"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500/30 via-pink-500/25 to-purple-500/20 border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
                />
              )}
              <Icon
                size={isReels ? 18 : 19}
                strokeWidth={isActive ? 2.5 : 2}
                className={`relative z-10 transition-transform duration-300 ${
                  isActive ? 'scale-110 text-rose-400' : 'text-gray-400 group-hover:text-gray-200'
                }`}
              />
              <span
                className={`relative z-10 text-xs font-bold tracking-wide transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'hidden sm:inline-block text-gray-400 group-hover:text-gray-200'
                }`}
              >
                {item.name}
              </span>
            </motion.button>
          );
        })}

        {/* Music Player Quick Button (hidden on Reels to avoid audio collision) */}
        {!isReels && (
          <>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <motion.button
              onClick={() => setIsPlayerOpen(true)}
              title="Listen Together"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
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
            </motion.button>
          </>
        )}
      </nav>
    </div>
  );
}
