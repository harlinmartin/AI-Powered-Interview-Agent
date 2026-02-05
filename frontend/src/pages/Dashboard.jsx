import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
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
    const { success, error: toastError } = useToast();
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
    const [selectedDate, setSelectedDate] = useState('');

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
            success("Profile updated successfully!");
        }, 500);
    };

    const handleAvatarClick = () => {
        document.getElementById('avatar-upload').click();
    };

    const handleAvatarChange = (e) => {
        if (e.target.files?.[0]) {
            setAvatarFile(e.target.files[0]);
            success("Avatar uploaded!");
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

    // Auto-refresh analytics when switching to analytics tab
    useEffect(() => {
        if (currentTab === 'analytics') {
            console.log('📊 Analytics tab opened - refreshing data...');
            fetchInterviews(); // Refresh interview list
        }
    }, [currentTab, fetchInterviews]);

    const handleStartInterview = async (file, compositeJD, roundType, difficulty) => {
        setLoading(true);
        try {
            const id = await uploadResume(file, compositeJD, roundType, difficulty);
            setCurrentInterviewId(id);
            navigate(`/interview/${id}`);
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.detail || "Upload failed. Please check your file.";
            // Remove technical prefixes if present to make it cleaner for user
            const cleanMsg = errorMsg.replace(/^(400: )/, '').replace(/Internal Server Error: /, '');
            toastError(cleanMsg);
            throw err; // Re-throw so the modal knows to stay open
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    // Simple navigation handler
    const handleNav = (tab) => setCurrentTab(tab);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex min-h-screen bg-transparent text-slate-900 font-sans relative">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`w-64 bg-theme-surface flex flex-col fixed h-full z-30 shadow-soft transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-20 flex items-center justify-between px-8 gap-3">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="ElevateAI Logo" className="w-10 h-10 object-contain" />
                        <span className="font-bold text-xl tracking-tight text-slate-800">ElevateAI</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-slate-800">
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    <button onClick={() => { handleNav('home'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-bold rounded-3xl transition-all ${currentTab === 'home' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <Home size={20} />
                        Overview
                    </button>
                    <button onClick={() => { handleNav('history'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-bold rounded-3xl transition-all ${currentTab === 'history' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <Clock size={20} />
                        History
                    </button>
                    <button onClick={() => { handleNav('analytics'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-bold rounded-3xl transition-all ${currentTab === 'analytics' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <BarChart3 size={20} />
                        Analytics
                    </button>
                    <button onClick={() => { handleNav('optimizer'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-bold rounded-3xl transition-all ${currentTab === 'optimizer' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <FileSearch size={20} />
                        Resume Optimization
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 border border-blue-200">
                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
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
            <main className="flex-1 md:ml-64 min-w-0">
                {/* Header Banner */}
                <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-6 mb-8 flex items-center justify-between sticky top-0 z-10 glass-card bg-white/90">
                    <div className="flex items-center gap-3">
                        <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden">
                            <MoreHorizontal size={24} className="rotate-90" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                                {currentTab === 'home' && (interviews.length > 0 ? `Welcome back, ${profileName}` : `Welcome to ElevateAI, ${profileName}!`)}
                                {currentTab === 'history' && 'Interview History'}
                                {currentTab === 'analytics' && 'Performance Analytics'}
                                {currentTab === 'optimizer' && 'Resume Optimizer'}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                {currentTab === 'home' && (interviews.length > 0 ? 'Here’s what’s happening with your preparation today.' : 'Ready to ace your next interview? Let\'s get started!')}
                                {currentTab === 'history' && 'Review your past sessions and feedback.'}
                                {currentTab === 'analytics' && 'Track your progress and identify areas for improvement.'}
                                {currentTab === 'optimizer' && 'Optimize your resume for specific job descriptions.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentTab === 'home' && interviews.length > 0 && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition shadow-sm shadow-blue-500/20 active:scale-95"
                            >
                                <Plus size={18} /> New Session
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-4 md:px-8 pb-10">
                    {/* Home Tab Overview */}
                    {currentTab === 'home' && (
                        <div className="space-y-8 animate-fade-in-up">
                            {/* Simple Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                                                    {(() => {
                                                        const jd = inv.job_description || '';
                                                        const lines = jd.split('\n');
                                                        let companyName = 'General';
                                                        for (let line of lines.slice(0, 3)) {
                                                            if (line.toLowerCase().includes('company:')) {
                                                                companyName = line.split(':')[1]?.trim() || 'General';
                                                                break;
                                                            }
                                                        }
                                                        if (companyName === 'General' && lines[0] && lines[0].length < 50 && !lines[0].includes('position') && !lines[0].includes('role')) {
                                                            companyName = lines[0].trim();
                                                        }
                                                        const roundType = inv.round_type || 'Interview';
                                                        return (
                                                            <div className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                                                                {roundType} • {companyName}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="text-xs text-slate-500 font-medium mt-0.5">{(() => {
                                                        // Fix: Ensure timestamp has 'Z' for UTC parsing (handles old interviews)
                                                        let timestamp = inv.created_at;
                                                        if (timestamp && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
                                                            timestamp += 'Z'; // Treat as UTC if no timezone info
                                                        }
                                                        return new Date(timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                                                    })()}</div>
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
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800">Session History</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500 font-medium">Filter by Date:</span>
                                    <input
                                        type="date"
                                        className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none transition shadow-sm hover:border-blue-400"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                    {selectedDate && (
                                        <button
                                            onClick={() => setSelectedDate('')}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {interviews.filter(inv => {
                                    if (!selectedDate) return true;
                                    // Fix: Use local time for date comparison to avoid timezone issues
                                    const d = new Date(inv.created_at || inv.date);
                                    const localDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                    return localDate === selectedDate;
                                }).map((inv) => {
                                    const feedback = inv.feedback_result ? JSON.parse(inv.feedback_result) : {};
                                    const score = feedback.score || 0;
                                    const metrics = feedback.metrics || {};

                                    return (
                                        <div key={inv.id} className="border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row justify-between items-center hover:border-blue-200 hover:shadow-md transition bg-white gap-4">
                                            <div className="flex-1">
                                                {/* Extract company name from job description or use "General" */}
                                                {(() => {
                                                    const jd = inv.job_description || '';
                                                    const lines = jd.split('\n');
                                                    // Try to find company name in first few lines
                                                    let companyName = 'General';
                                                    for (let line of lines.slice(0, 3)) {
                                                        if (line.toLowerCase().includes('company:')) {
                                                            companyName = line.split(':')[1]?.trim() || 'General';
                                                            break;
                                                        }
                                                    }
                                                    // If no company found, check if first line looks like a company name
                                                    if (companyName === 'General' && lines[0] && lines[0].length < 50 && !lines[0].includes('position') && !lines[0].includes('role')) {
                                                        companyName = lines[0].trim();
                                                    }

                                                    const roundType = inv.round_type || 'Interview';

                                                    return (
                                                        <>
                                                            <h4 className="font-semibold text-slate-800">
                                                                {roundType} • {companyName}
                                                            </h4>
                                                        </>
                                                    );
                                                })()}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                                        <Clock size={12} /> {(() => {
                                                            let timestamp = inv.created_at;
                                                            if (timestamp && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
                                                                timestamp += 'Z';
                                                            }
                                                            return new Date(timestamp).toLocaleString();
                                                        })()}
                                                    </span>
                                                    {inv.status === 'COMPLETED' && (
                                                        <>
                                                            {/* Mini Skill Badges */}
                                                            <span title="Technical Score" className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                                                Tech: {metrics.technical || 0}
                                                            </span>
                                                            <span title="Communication Score" className="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                                                                Comm: {metrics.communication || 0}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Mini Analytics Section */}
                                            {inv.status === 'COMPLETED' && (
                                                <div className="flex items-center gap-4 min-w-[200px]">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-xs mb-1 font-semibold text-slate-600">
                                                            <span>Overall Score</span>
                                                            <span className={score >= 70 ? 'text-emerald-600' : 'text-amber-600'}>{score}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                style={{ width: `${score}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => navigate(inv.status === 'COMPLETED' ? `/feedback/${inv.id}` : `/interview/${inv.id}`)}
                                                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition whitespace-nowrap"
                                            >
                                                {inv.status === 'COMPLETED' ? 'View Report' : 'Resume'}
                                            </button>
                                        </div>
                                    );
                                })}
                                {interviews.filter(inv => {
                                    if (!selectedDate) return true;
                                    const d = new Date(inv.created_at || inv.date);
                                    const localDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                    return localDate === selectedDate;
                                }).length === 0 && (
                                        <p className="text-slate-500 mt-2 text-center py-8">
                                            {selectedDate ? `No sessions found for ${selectedDate}` : 'No history available.'}
                                        </p>
                                    )}
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

// Polished Stat Card Component - Twisty Theme
const StatCard = ({ icon, label, value, color }) => (
    <div className="p-8 rounded-[2rem] shadow-soft bg-white flex flex-col gap-4 transition-all hover:-translate-y-1 border border-white/50">
        <div className="flex justify-between items-start">
            <div className={`p-4 rounded-2xl ${color} bg-opacity-20`}>
                {React.cloneElement(icon, { size: 28, strokeWidth: 2 })}
            </div>
            {/* Optional: Add a mini sparkline or trend here */}
        </div>
        <div>
            <div className="text-4xl font-bold text-slate-800 tracking-tight">{value}</div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</div>
        </div>
    </div>
);
