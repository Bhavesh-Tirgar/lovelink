import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Gamepad2, Film, Palette, Droplets, 
  Camera, CalendarClock, MapPin,
  ArrowRight
} from 'lucide-react';

export default function Hub() {
  const navigate = useNavigate();

  const sections = [
    {
      category: 'Play Together',
      emoji: '🎮',
      items: [
        {
          title: 'Instant Couple Snap',
          desc: 'Snapchat-style disappearing photos, camera filters, timers & love streaks',
          icon: Camera,
          path: '/snap',
          color: 'from-amber-500/20 to-yellow-500/20 border-yellow-500/30 text-yellow-300',
          badge: 'Snap Streaks 🔥'
        },
        {
          title: 'Couple Games',
          desc: '1v1 Chess, Ludo, Uno & Solo Bot practice',
          icon: Gamepad2,
          path: '/games',
          color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300',
          badge: 'Live Sync'
        },
        {
          title: 'Watch Room',
          desc: 'Synchronized movies with live reaction cam',
          icon: Film,
          path: '/movies',
          color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-300',
          badge: 'YouTube & Files'
        },
        {
          title: 'Doodle Board',
          desc: 'Live shared whiteboard canvas for sketches',
          icon: Palette,
          path: '/doodle',
          color: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30 text-teal-300',
          badge: 'Real-time'
        }
      ]
    },
    {
      category: 'Intimacy & Care',
      emoji: '🌸',
      items: [
        {
          title: 'Cycle Care',
          desc: 'Mutual menstrual calendar & empathy tips',
          icon: Droplets,
          path: '/cycle',
          color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300',
          badge: 'Partner Tips'
        }
      ]
    },
    {
      category: 'Memories & Milestones',
      emoji: '📸',
      items: [
        {
          title: 'Shared Album',
          desc: 'Chronological timeline of our favorite moments',
          icon: Camera,
          path: '/album',
          color: 'from-fuchsia-500/20 to-purple-500/20 border-fuchsia-500/30 text-fuchsia-300',
          badge: 'WebP Instant'
        },
        {
          title: 'Countdowns',
          desc: 'Days until our next anniversary, trip, or date',
          icon: CalendarClock,
          path: '/countdowns',
          color: 'from-violet-500/20 to-indigo-500/20 border-violet-500/30 text-violet-300',
          badge: 'Milestones'
        }
      ]
    },
    {
      category: 'Safety & Presence',
      emoji: '📍',
      items: [
        {
          title: 'Snap Map',
          desc: 'Live GPS radar, distance counter & battery percentage',
          icon: MapPin,
          path: '/map',
          color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300',
          badge: 'Ghost Mode'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen pb-28 pt-6 px-4 sm:px-6 md:px-10 max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">✨</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Couple Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400">
            All your shared experiences, entertainment, and safety in one place
          </p>
        </div>
      </div>

      {/* Categorized Sections */}
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.category} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2 px-1">
              <span>{section.emoji}</span>
              <span>{section.category}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    onClick={() => navigate(item.path)}
                    className={`relative p-5 rounded-2xl bg-gradient-to-br ${item.color} border backdrop-blur-md text-left flex flex-col justify-between group hover:scale-[1.02] hover:border-white/30 transition-all duration-300 shadow-lg`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Icon size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-gray-200">
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-pink-200 transition-colors">
                          {item.title}
                        </h3>
                        <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
