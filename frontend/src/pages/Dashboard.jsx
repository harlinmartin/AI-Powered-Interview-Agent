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

import { COMPANIES, ROLES, EXPERIENCE_LEVELS } from '../utils/constants';

export const Dashboard = () => {
    const { user, logout, updateUser } = useAuthStore();
    const { interviews: rawInterviews, fetchInterviews, uploadResume, setCurrentInterviewId } = useInterviewStore();
    const interviews = rawInterviews || [];
    const navigate = useNavigate();

    // Data State
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

    // Form State
    const [jobDesc, setJobDesc] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Update filtered companies when input changes
    useEffect(() => {
        if (companyName) {
            const filtered = COMPANIES.filter(c => c.toLowerCase().includes(companyName.toLowerCase()));
            setFilteredCompanies(filtered);
        } else {
            setFilteredCompanies([]);
        }
    }, [companyName]);

    const [currentTab, setCurrentTab] = useState('home');
    const [showModal, setShowModal] = useState(false);

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

    const handleStart = async (e) => {
        e.preventDefault();
        if (!file || !jobDesc) { alert("Please provide both Resume and Job Description"); return; }
        setLoading(true);
        try {
            const compositeJD = `TARGET COMPANY: ${companyName || 'General'}\nTARGET ROLE: ${targetRole}\nLEVEL: ${experienceLevel}\nJD: ${jobDesc}`;
            const id = await uploadResume(file, compositeJD);
            setCurrentInterviewId(id);
            navigate(`/interview/${id}`);
        } catch (err) { alert("Upload failed."); } finally { setLoading(false); }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    // Simple navigation handler
    const handleNav = (tab) => setCurrentTab(tab);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Top Navigation Bar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-1.5 rounded">
                        <Briefcase size={20} />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-gray-800">ElevateAI</span>
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <button onClick={() => handleNav('home')} className={`text-sm font-medium ${currentTab === 'home' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Overview</button>
                    <button onClick={() => handleNav('history')} className={`text-sm font-medium ${currentTab === 'history' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>History</button>
                    <button onClick={() => handleNav('analytics')} className={`text-sm font-medium ${currentTab === 'analytics' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Analytics</button>
                    <button onClick={() => handleNav('optimizer')} className={`text-sm font-medium ${currentTab === 'optimizer' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Resume</button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium">{user?.name}</div>
                        <div className="text-xs text-gray-500">{user?.email}</div>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition">
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6 md:p-8">
                {/* Main Content Area */}

                {/* Home Tab Overview */}
                {currentTab === 'home' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
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
                            <StatCard
                                icon={<FileSearch size={24} className="text-purple-500" />}
                                label="Plan"
                                value="Standard"
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
                                    <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate(`/interview/${inv.id}`)}>
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
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Start New Interview</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <Plus size={24} className="rotate-45" />
                                </button>
                            </div>

                            <form onSubmit={handleStart} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Company</label>
                                    <div className="relative">
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            placeholder="e.g. Amazon, Startup..."
                                            value={companyName}
                                            onChange={(e) => { setCompanyName(e.target.value); setShowCompanyDropdown(true); }}
                                        />
                                        {showCompanyDropdown && companyName && filteredCompanies.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-40 overflow-y-auto">
                                                {filteredCompanies.map(c => (
                                                    <div
                                                        key={c}
                                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                                        onClick={() => { setCompanyName(c); setShowCompanyDropdown(false); }}
                                                    >
                                                        {c}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={targetRole}
                                            onChange={(e) => {
                                                const role = e.target.value;
                                                setTargetRole(role);
                                                if (role !== 'Custom' && ROLES[role]) setJobDesc(ROLES[role]);
                                            }}
                                        >
                                            <option value="" disabled>Select Role</option>
                                            <option value="Custom">Custom</option>
                                            {Object.keys(ROLES).filter(r => r !== 'Custom').map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={experienceLevel}
                                            onChange={(e) => setExperienceLevel(e.target.value)}
                                        >
                                            {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none h-24 resize-none"
                                        placeholder="Paste the job description here..."
                                        value={jobDesc}
                                        onChange={(e) => setJobDesc(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume (PDF)</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setFile(e.target.files?.[0])}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                                        <span className="text-sm text-gray-600">{file ? file.name : "Click to upload"}</span>
                                    </div>
                                </div>

                                <button
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? 'Processing...' : 'Start Interview'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
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
