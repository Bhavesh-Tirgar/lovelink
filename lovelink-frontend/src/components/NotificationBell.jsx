import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import api from '../api';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);

    const fetchNotifs = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.error("Failed to fetch notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifs();
        // In a real app we'd trigger this on websocket messages too
    }, []);

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const markAsRead = async (id, e) => {
        if (e) {
            e.stopPropagation();
        }
        try {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            await api.put(`/notifications/${id}/read`);
        } catch (err) {
            fetchNotifs(); // revert
        }
    };

    const markAllRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            await api.put('/notifications/read-all');
        } catch (err) {
            fetchNotifs();
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#110e1b]"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-[80vh] overflow-y-auto bg-[#1a1c2e] border border-white/10 rounded-2xl shadow-2xl z-50">
                    <div className="sticky top-0 bg-[#1a1c2e] border-b border-white/10 p-4 flex items-center justify-between z-10">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                <Check size={14} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="divide-y divide-white/5">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">No notifications yet.</div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`p-4 transition-colors cursor-pointer ${notif.is_read ? 'bg-transparent opacity-70' : 'bg-purple-500/10'}`}
                                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {notif.type === 'milestone' && <span className="text-pink-400">🎉</span>}
                                                <h4 className={`font-medium text-sm ${notif.is_read ? 'text-gray-300' : 'text-purple-100'}`}>
                                                    {notif.title}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{notif.body}</p>
                                            <p className="text-[10px] text-gray-500 mt-2">
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <button
                                                onClick={(e) => markAsRead(notif.id, e)}
                                                className="text-gray-500 hover:text-white mt-1 p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
