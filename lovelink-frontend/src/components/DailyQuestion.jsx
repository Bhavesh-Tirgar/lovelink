import React, { useState, useEffect } from 'react';
import { Send, Clock } from 'lucide-react';
import useWebSocket from 'react-use-websocket';
import api from '../api';

export default function DailyQuestion({ coupleId }) {
    const [questionData, setQuestionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [myAnswer, setMyAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // We connect to the WS for realtime updates, expecting our Context or manager to eventually 
    // do this globally, but directly listening here to the global couple channel is fine
    const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';
    const { lastJsonMessage } = useWebSocket(`${WS_URL}/${coupleId}`, {
        shouldReconnect: () => true,
    });

    const fetchQuestion = async () => {
        try {
            const res = await api.get('/questions/today');
            setQuestionData(res.data);
        } catch (err) {
            console.error('Failed to fetch daily question:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (coupleId) {
            fetchQuestion();
        }
    }, [coupleId]);

    // Listen for realtime answers from partner
    useEffect(() => {
        if (lastJsonMessage && lastJsonMessage.type === 'question_answered') {
            const { partner_answer } = lastJsonMessage;
            setQuestionData(prev => ({
                ...prev,
                partner_answer: partner_answer
            }));
        }
    }, [lastJsonMessage]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!myAnswer.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await api.post('/questions/answer', { answer_text: myAnswer.trim() });
            setQuestionData(prev => ({
                ...prev,
                my_answer: res.data.answer_text,
                partner_answer: res.data.partner_answer
            }));
        } catch (err) {
            console.error("Failed to submit answer:", err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-3xl p-6 h-48 animate-pulse shadow-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            </div>
        );
    }

    if (!questionData) return null;

    const hasAnswered = !!questionData.my_answer;
    const partnerAnswered = !!questionData.partner_answer;
    const bothAnswered = hasAnswered && partnerAnswered;

    return (
        <div className="relative bg-gradient-to-br from-[#1a1c2e] to-[#2d1b36] border border-purple-500/20 rounded-3xl p-6 shadow-xl overflow-hidden">
            {/* Decorative large quotes */}
            <div className="absolute top-2 left-6 text-7xl text-purple-500/10 font-serif leading-none">"</div>

            <div className="relative z-10 w-full mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-purple-300 tracking-wide">
                        QUESTION OF THE DAY
                    </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif text-white leading-snug">
                    {questionData.question_text}
                </h3>
            </div>

            {!hasAnswered ? (
                <form onSubmit={handleSubmit} className="relative z-10 mt-4">
                    <textarea
                        value={myAnswer}
                        onChange={(e) => setMyAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none min-h-[100px]"
                        disabled={submitting}
                    />
                    <div className="flex justify-end mt-3">
                        <button
                            type="submit"
                            disabled={!myAnswer.trim() || submitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            Share Answer
                            <Send size={16} />
                        </button>
                    </div>
                </form>
            ) : !bothAnswered ? (
                <div className="relative z-10 mt-4 bg-black/20 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <Clock size={32} className="text-purple-400 animate-pulse" />
                    <div>
                        <p className="text-lg text-white font-medium">Your answer is locked in! 🔒</p>
                        <p className="text-sm text-gray-400 mt-1">Waiting for your partner to answer before revealing... 💭</p>
                    </div>
                </div>
            ) : (
                <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    {/* User's Answer */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:bg-white/10 transition-colors">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                        <p className="text-xs text-blue-300 uppercase font-semibold tracking-wider mb-2">You</p>
                        <p className="text-gray-200 text-lg leading-relaxed">{questionData.my_answer}</p>
                    </div>

                    {/* Partner's Answer */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:bg-white/10 transition-colors">
                        <div className="absolute top-0 left-0 w-1 h-full bg-pink-500/50"></div>
                        <p className="text-xs text-pink-300 uppercase font-semibold tracking-wider mb-2">Partner</p>
                        <p className="text-gray-200 text-lg leading-relaxed">{questionData.partner_answer}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
