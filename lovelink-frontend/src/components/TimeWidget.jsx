import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function TimeWidget({ partner }) {
    const [timeStr, setTimeStr] = useState('');
    const [dateStr, setDateStr] = useState('');

    useEffect(() => {
        if (!partner?.timezone) return;

        const updateTime = () => {
            try {
                const now = new Date();
                const timeOptions = {
                    timeZone: partner.timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                };
                const dateOptions = {
                    timeZone: partner.timezone,
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                };

                setTimeStr(now.toLocaleTimeString('en-US', timeOptions));
                setDateStr(now.toLocaleDateString('en-US', dateOptions));
            } catch (e) {
                setTimeStr('Unknown Time');
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 10000); // Check every 10s
        return () => clearInterval(interval);
    }, [partner]);

    if (!partner) return null;

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 text-indigo-300 mb-2 relative z-10">
                <Clock size={16} />
                <span className="text-xs uppercase tracking-wider font-semibold">
                    {partner.name || 'Partner'}'s Time
                </span>
            </div>
            <div className="text-3xl font-bold text-white relative z-10 tracking-tight">
                {timeStr || '--:--'}
            </div>
            <div className="text-indigo-200/80 text-sm mt-1 relative z-10">
                {dateStr || '---'}
            </div>
        </div>
    );
}

export default TimeWidget;
