import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useInterviewStore } from '../store/useInterviewStore';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, Plus, Clock, ChevronRight,
    BarChart3, FileSearch, LogOut, Sparkles, User, ShieldAlert, Search,
    Upload, Home, MoreHorizontal, Settings, Bell, Calendar, CheckCircle2
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
        hoursPracticed: 0
    });

    useEffect(() => { fetchInterviews(); }, [fetchInterviews]);

    useEffect(() => {
        if (interviews) {
            const totalSeconds = interviews.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
            const hours = Math.round((totalSeconds / 3600) * 10) / 10;
            let totalScore = 0;
            let scoredCount = 0;
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
                hoursPracticed: hours
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
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-20 shadow-sm">
                <div className="h-16 flex items-center px-6 border-b border-gray-200 gap-3">
                    <div className="bg-blue-600 text-white p-1.5 rounded">
                        <Briefcase size={20} />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-gray-800">ElevateAI</span>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <button onClick={() => handleNav('home')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentTab === 'home' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Home size={20} />
                        Overview
                    </button>
                    <button onClick={() => handleNav('history')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Clock size={20} />
                        History
                    </button>
                    <button onClick={() => handleNav('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentTab === 'analytics' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <BarChart3 size={20} />
                        Analytics
                    </button>
                    <button onClick={() => handleNav('optimizer')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentTab === 'optimizer' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <FileSearch size={20} />
                        Resume
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium truncate">{user?.name}</div>
                            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 p-8">
                {/* Home Tab Overview */}
                {currentTab === 'home' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold text-gray-900">Hi {user?.name || 'there'},</h1>
                                <p className="text-gray-500">Ready to ace your next interview?</p>
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
                            >
                                <Plus size={18} /> New Session
                            </button>
                        </div>

                        {/* Simple Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={<Briefcase size={24} className="text-blue-500" />}
                                label="Total Sessions"
                                value={stats.totalInterviews}
                            />
                            <StatCard
                                icon={<BarChart3 size={24} className="text-green-500" />}
                                label="Avg Score"
                                value={`${stats.avgScore}%`}
                            />
                            <StatCard
                                icon={<Clock size={24} className="text-orange-500" />}
                                label="Hours Practiced"
                                value={stats.hoursPracticed}
                            />
                        </div>

                        {/* Recent Activity List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800">Recent Sessions</h3>
                                <button onClick={() => setCurrentTab('history')} className="text-sm text-blue-600 hover:underline">View All</button>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {interviews.slice(0, 5).map((inv) => (
                                    <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate(inv.status === 'COMPLETED' ? `/feedback/${inv.id}` : `/interview/${inv.id}`)}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                {inv.status === 'COMPLETED' ? <CheckCircle2 size={20} className="text-green-500" /> : <Clock size={20} />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{inv.job_description.split('\n')[0].substring(0, 50) || 'Untitled Interview'}</div>
                                                <div className="text-xs text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className={`text-xs font-bold px-2 py-1 rounded-full ${inv.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {inv.status}
                                        </div>
                                    </div>
                                ))}
                                {interviews.length === 0 && (
                                    <div className="p-8 text-center text-gray-500">No interviews yet. Start a new session!</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Other Tabs */}
                {currentTab === 'history' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold mb-6">Interview History</h2>
                        <div className="space-y-4">
                            {interviews.map((inv) => (
                                <div key={inv.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:shadow-md transition">
                                    <div>
                                        <h4 className="font-semibold">{inv.job_description.split('\n')[0].substring(0, 60)}...</h4>
                                        <p className="text-sm text-gray-500">Conducted on {new Date(inv.created_at).toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(inv.status === 'COMPLETED' ? `/feedback/${inv.id}` : `/interview/${inv.id}`)}
                                        className="text-blue-600 font-medium hover:underline"
                                    >
                                        {inv.status === 'COMPLETED' ? 'View Report' : 'Resume'}
                                    </button>
                                </div>
                            ))}
                            {interviews.length === 0 && <p className="text-gray-500">No history available.</p>}
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
            </main>
        </div>
    );
};

// Simple Stat Card Component
const StatCard = ({ icon, label, value }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
            {icon}
        </div>
        <div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
        </div>
    </div>
);
