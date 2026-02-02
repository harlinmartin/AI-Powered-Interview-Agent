import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useInterviewStore } from '../store/useInterviewStore';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, Plus, Clock, ChevronRight,
    BarChart3, FileSearch, LogOut, Sparkles, User, ShieldAlert, Search,
    Upload, Home, MoreHorizontal, Settings, Calendar, CheckCircle2
} from 'lucide-react';
import { ResumeOptimizer } from '../components/ResumeOptimizer';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';

import { COMPANIES, ROLES, EXPERIENCE_LEVELS } from '../utils/constants';

export const Dashboard = () => {
    const { user, logout, updateUser } = useAuthStore();
    const { interviews: rawInterviews, fetchInterviews, uploadResume, setCurrentInterviewId } = useInterviewStore();
    const interviews = rawInterviews || [];
    const navigate = useNavigate();



    const [currentTab, setCurrentTab] = useState('home');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Settings State
    const [profileName, setProfileName] = useState(user?.name || (user?.email || 'User').split('@')[0]);
    const [profileEmail, setProfileEmail] = useState(user?.email || '');
    const [avatarFile, setAvatarFile] = useState(null);

    // Effect to visual sync
    useEffect(() => {
        if (user) {
            setProfileName(user.name || (user.email || 'User').split('@')[0]);
            setProfileEmail(user.email || '');
        }
    }, [user]);

    const handleSaveProfile = () => {
        setLoading(true);
        // Update store and persist to local storage
        updateUser({ name: profileName, email: profileEmail });
        setTimeout(() => {
            setLoading(false);
            alert("Profile updated successfully!");
        }, 500);
    };

    const handleAvatarClick = () => {
        document.getElementById('avatar-upload').click();
    };

    const handleAvatarChange = (e) => {
        if (e.target.files?.[0]) {
            setAvatarFile(e.target.files[0]);
            alert("Avatar uploaded!");
        }
    };

    // Stats
    const [stats, setStats] = useState({
        totalInterviews: 0,
        avgScore: 0,
        hoursPracticed: 0,
        streak: 0
    });

    useEffect(() => { fetchInterviews(); }, [fetchInterviews]);

    useEffect(() => {
        if (interviews) {
            const totalSeconds = interviews.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
            const hours = Math.round((totalSeconds / 3600) * 10) / 10;
            let totalScore = 0;
            let scoredCount = 0;

            // Calculate Streak
            const dates = interviews.map(i => new Date(i.created_at).toDateString());
            const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));

            let currentStreak = 0;
            if (uniqueDates.length > 0) {
                const today = new Date().toDateString();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toDateString();

                if (uniqueDates[0] === today) {
                    currentStreak = 1;
                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prevDate = new Date(uniqueDates[i - 1]);
                        const currDate = new Date(uniqueDates[i]);
                        const diffTime = Math.abs(prevDate - currDate);
                        // Using round to account for small time diffs near midnight
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays === 1) currentStreak++;
                        else break;
                    }
                } else if (uniqueDates[0] === yesterdayStr) {
                    currentStreak = 1;
                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prevDate = new Date(uniqueDates[i - 1]);
                        const currDate = new Date(uniqueDates[i]);
                        const diffTime = Math.abs(prevDate - currDate);
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays === 1) currentStreak++;
                        else break;
                    }
                }
            }

            interviews.forEach((inv) => {
                if (inv.feedback_result) {
                    try {
                        const s = JSON.parse(inv.feedback_result).score || 0;
                        if (s > 0) { totalScore += s; scoredCount++; }
                    } catch (e) { }
                }
            });
            setStats({
                totalInterviews: interviews.length,
                avgScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
                hoursPracticed: hours,
                streak: currentStreak
            });
        }
    }, [interviews]);

    const handleStartInterview = async (file, compositeJD, roundType, difficulty) => {
        setLoading(true);
        try {
            const id = await uploadResume(file, compositeJD, roundType, difficulty);
            setCurrentInterviewId(id);
            navigate(`/interview/${id}`);
        } catch (err) {
            console.error(err);
            alert("Upload failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    // Simple navigation handler
    const handleNav = (tab) => setCurrentTab(tab);

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20 shadow-sm">
                <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
                    <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
                        <Briefcase size={20} />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-800">ElevateAI</span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <button onClick={() => handleNav('home')} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${currentTab === 'home' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <Home size={18} />
                        Overview
                    </button>
                    <button onClick={() => handleNav('history')} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${currentTab === 'history' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <Clock size={18} />
                        History
                    </button>
                    <button onClick={() => handleNav('analytics')} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${currentTab === 'analytics' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <BarChart3 size={18} />
                        Analytics
                    </button>
                    <button onClick={() => handleNav('optimizer')} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${currentTab === 'optimizer' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <FileSearch size={18} />
                        Resume
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 border border-blue-200">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-semibold text-slate-700 truncate">{user?.name}</div>
                            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64">
                {/* Header Banner */}
                <div className="bg-white border-b border-slate-200 px-8 py-6 mb-8 flex items-center justify-between sticky top-0 z-10 glass-card bg-white/90">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {currentTab === 'home' && `Welcome back, ${profileName}`}
                            {currentTab === 'history' && 'Interview History'}
                            {currentTab === 'analytics' && 'Performance Analytics'}
                            {currentTab === 'optimizer' && 'Resume Optimizer'}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {currentTab === 'home' && 'Here’s what’s happening with your preparation today.'}
                            {currentTab === 'history' && 'Review your past sessions and feedback.'}
                            {currentTab === 'analytics' && 'Track your progress and identify areas for improvement.'}
                            {currentTab === 'optimizer' && 'Optimize your resume for specific job descriptions.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentTab === 'home' && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition shadow-sm shadow-blue-500/20 active:scale-95"
                            >
                                <Plus size={18} /> New Session
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-8 pb-10">
                    {/* Home Tab Overview */}
                    {currentTab === 'home' && (
                        <div className="space-y-8 animate-fade-in-up">
                            {/* Simple Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                <StatCard
                                    icon={<Briefcase size={22} className="text-blue-600" />}
                                    label="Total Sessions"
                                    value={stats.totalInterviews}
                                    color="bg-blue-50 border-blue-100"
                                />
                                <StatCard
                                    icon={<BarChart3 size={22} className="text-emerald-600" />}
                                    label="Avg Score"
                                    value={`${stats.avgScore}%`}
                                    color="bg-emerald-50 border-emerald-100"
                                />
                                <StatCard
                                    icon={<Clock size={22} className="text-amber-600" />}
                                    label="Hours Practiced"
                                    value={stats.hoursPracticed}
                                    color="bg-amber-50 border-amber-100"
                                />
                                <StatCard
                                    icon={<Sparkles size={22} className="text-purple-600" />}
                                    label="Current Streak"
                                    value={`${stats.streak} Day${stats.streak !== 1 ? 's' : ''}`}
                                    color="bg-purple-50 border-purple-100"
                                />
                            </div>

                            {/* Recent Activity List */}
                            <div className="glass-card rounded-xl overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Calendar size={18} className="text-slate-400" /> Recent Sessions
                                    </h3>
                                    <button onClick={() => setCurrentTab('history')} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">View All</button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {interviews.slice(0, 5).map((inv) => (
                                        <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer group" onClick={() => navigate(inv.status === 'COMPLETED' ? `/feedback/${inv.id}` : `/interview/${inv.id}`)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${inv.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {inv.status === 'COMPLETED' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{inv.job_description.split('\n')[0].substring(0, 50) || 'Untitled Interview'}</div>
                                                    <div className="text-xs text-slate-500 font-medium mt-0.5">{new Date(inv.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {inv.status === 'COMPLETED' && (
                                                    <div className="text-sm font-bold text-slate-700">
                                                        {JSON.parse(inv.feedback_result || '{}').score || 0}%
                                                    </div>
                                                )}
                                                <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${inv.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {inv.status}
                                                </div>
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
                                            </div>
                                        </div>
                                    ))}
                                    {interviews.length === 0 && (
                                        <div className="p-12 text-center">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <Briefcase size={32} opacity={0.5} />
                                            </div>
                                            <h3 className="text-slate-900 font-medium mb-1">No sessions yet</h3>
                                            <p className="text-slate-500 text-sm mb-6">Get started by creating your first interview session.</p>
                                            <button
                                                onClick={() => setShowModal(true)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition shadow-sm inline-flex items-center gap-2"
                                            >
                                                <Plus size={18} /> Start Your First Session
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Other Tabs */}
                    {currentTab === 'history' && (
                        <div className="glass-card rounded-xl p-6 animate-fade-in-up">
                            <div className="space-y-4">
                                {interviews.map((inv) => (
                                    <div key={inv.id} className="border border-slate-200 rounded-lg p-5 flex justify-between items-center hover:border-blue-200 hover:shadow-sm transition bg-white">
                                        <div>
                                            <h4 className="font-semibold text-slate-800">{inv.job_description.split('\n')[0].substring(0, 60)}...</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                    {new Date(inv.created_at).toLocaleString()}
                                                </span>
                                                {inv.status === 'COMPLETED' && (
                                                    <span className="text-xs font-bold text-emerald-600 pl-2">
                                                        Score: {JSON.parse(inv.feedback_result || '{}').score || 0}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(inv.status === 'COMPLETED' ? `/feedback/${inv.id}` : `/interview/${inv.id}`)}
                                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                                        >
                                            {inv.status === 'COMPLETED' ? 'View Report' : 'Resume'}
                                        </button>
                                    </div>
                                ))}
                                {interviews.length === 0 && <p className="text-slate-500 mt-2">No history available.</p>}
                            </div>
                        </div>
                    )}

                    {currentTab === 'analytics' && <AnalyticsDashboard interviews={interviews} />}

                    {currentTab === 'optimizer' && <ResumeOptimizer />}

                    {/* New Session Modal */}
                    <ScheduleInterviewModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        onStart={handleStartInterview}
                    />
                </div>
            </main>
        </div>
    );
};

// Polished Stat Card Component
const StatCard = ({ icon, label, value, color = "bg-white" }) => (
    <div className={`p-6 rounded-xl shadow-sm border flex items-center gap-4 transition hover:-translate-y-1 ${color} border-slate-200 bg-white`}>
        <div className={`p-3 rounded-xl ${color} bg-opacity-50`}>
            {icon}
        </div>
        <div>
            <div className="text-2xl font-bold text-slate-800 tracking-tight">{value}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</div>
        </div>
    </div>
);
