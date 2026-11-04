import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, HeartHandshake, CalendarClock, Camera, Film, Ticket, ListTodo, Heart, LogOut } from 'lucide-react';

export default function NavigationDock() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { name: 'Home', path: '/dashboard', icon: Home },
        { name: 'Chat', path: '/chat', icon: MessageCircle },
        { name: 'Notes', path: '/notes', icon: HeartHandshake },
        { name: 'Albums', path: '/album', icon: Camera },
        { name: 'Movies', path: '/movies', icon: Film },
        { name: 'Coupons', path: '/coupons', icon: Ticket },
        { name: 'Comfort', path: '/comfort', icon: Heart },
        { name: 'Bucket List', path: '/bucket-list', icon: ListTodo },
        { name: 'Countdowns', path: '/countdowns', icon: CalendarClock },
    ];

    const handleLogout = () => {
        window.localStorage.clear();
        navigate('/login', { replace: true });
    };

    // Hide dock on unauthenticated pages or fullscreen routes like calling
    const hiddenPaths = ['/login', '/signup', '/link'];
    if (hiddenPaths.includes(location.pathname) || location.pathname.startsWith('/call/')) {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 p-3 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    const Icon = item.icon;

                    return (
                        <div key={item.name} className="relative group">
                            <button
                                onClick={() => navigate(item.path)}
                                className={`p-3 rounded-full transition-all duration-300 relative ${isActive
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-purple-300 hover:bg-white/5'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/60 to-pink-600/60 rounded-full blur-sm -z-10" />
                                )}
                                <div className={`relative z-10 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                            </button>

                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-brand-darker border border-white/10 text-white text-xs whitespace-nowrap rounded-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none shadow-xl">
                                {item.name}
                            </div>
                        </div>
                    );
                })}

                <div className="w-px h-8 bg-white/10 mx-1" />

                <div className="relative group">
                    <button
                        onClick={handleLogout}
                        className="p-3 rounded-full text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                    >
                        <LogOut size={22} />
                    </button>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-brand-darker border border-red-500/20 text-red-200 text-xs whitespace-nowrap rounded-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                        Logout
                    </div>
                </div>

            </div>
        </div>
    );
}
