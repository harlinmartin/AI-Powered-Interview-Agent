import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useInterviewStore } from '../store/useInterviewStore';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, Plus, Clock, ChevronRight,
    BarChart3, FileSearch, LogOut, Sparkles, User, ShieldAlert, Search,
    Upload, Home, MoreHorizontal, Settings, Bell, Calendar
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

    const handleLogout = () => { logout(); navigate('/login'); };
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

    const getTabContent = () => {
        switch (currentTab) {
            case 'analytics': return <AnalyticsDashboard interviews={interviews} />;
            case 'optimizer': return <ResumeOptimizer />;
            case 'history': return (
                <div className="space-y-0divide-y divide-zinc-800">
                    {interviews.map((inv) => (
                        <div key={inv.id} className="py-4 hover:bg-zinc-900/50 transition cursor-pointer flex items-center justify-between group px-4 -mx-4 rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inv.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {inv.status === 'COMPLETED' ? <BarChart3 size={16} /> : <Briefcase size={16} />}
                                </div>
                                <div>
                                    <h4 className="font-medium text-zinc-200 text-sm">{inv.job_description.split('\n')[0].substring(0, 40) || 'Untitled Session'}</h4>
                                    <p className="text-xs text-zinc-500">{new Date(inv.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button onClick={() => navigate(inv.status === 'COMPLETED' ? `/feedback/${inv.id}` : `/interview/${inv.id}`)} className="text-xs font-medium text-zinc-400 group-hover:text-white transition">
                                Open
                            </button>
                        </div>
                    ))}
                    {interviews.length === 0 && <p className="text-zinc-500 text-sm text-center py-10">No history yet.</p>}
                </div>
            );
            case 'settings': return (
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Header */}
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">Settings</h3>
                        <p className="text-zinc-400">Manage your account preferences and profile.</p>
                    </div>

                    {/* Profile Section */}
                    <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6">
                        <h4 className="font-semibold text-white mb-6 flex items-center gap-2">
                            <User size={18} /> Profile Information
                        </h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-400 overflow-hidden">
                                    {avatarFile ? (
                                        <img src={URL.createObjectURL(avatarFile)} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        profileName.charAt(0).toUpperCase() || 'U'
                                    )}
                                </div>
                                <div>
                                    <input type="file" id="avatar-upload" className="hidden" onChange={handleAvatarChange} accept="image/*" />
                                    <button onClick={handleAvatarClick} className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition">Change Avatar</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputGroup label="Full Name">
                                    <input className="input-minimal" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                                </InputGroup>
                                <InputGroup label="Email Address">
                                    <input className="input-minimal" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                                </InputGroup>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button onClick={handleSaveProfile} disabled={loading} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition disabled:opacity-50">
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-[#18181b] border border-red-900/20 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                        <h4 className="font-semibold text-white mb-2 text-red-500 flex items-center gap-2">
                            <ShieldAlert size={18} /> Danger Zone
                        </h4>
                        <p className="text-sm text-zinc-400 mb-6">Irreversible actions. Be careful.</p>

                        <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                            <div>
                                <h5 className="text-sm font-bold text-zinc-200">Delete Account</h5>
                                <p className="text-xs text-zinc-500 mt-1">Permanently remove your data and access.</p>
                            </div>
                            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition" onClick={() => { if (confirm("Are you sure? This cannot be undone.")) alert("Account deletion request submitted."); }}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            );
            default: return (
                <>
                    {/* Stats Row - PRESERVED GLASS STYLE as requested */}
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-white tracking-tight">Overview</h3>
                            <select className="bg-transparent text-sm text-zinc-500 border-none outline-none cursor-pointer hover:text-zinc-300 transition">
                                <option>Last 30 Days</option>
                                <option>This Week</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatPill
                                icon={<Briefcase size={18} />}
                                label="Total Sessions"
                                value={stats.totalInterviews}
                                color="text-blue-400"
                                borderColor="border-blue-500/20"
                                percent="100%"
                            />
                            <StatPill
                                icon={<Sparkles size={18} />}
                                label="Avg Score"
                                value={`${stats.avgScore}%`}
                                color="text-purple-400"
                                borderColor="border-purple-500/20"
                                percent={`${stats.avgScore}%`}
                            />
                            <StatPill
                                icon={<Clock size={18} />}
                                label="Hours"
                                value={stats.hoursPracticed}
                                color="text-emerald-400"
                                borderColor="border-emerald-500/20"
                                percent="80%"
                            />
                            <StatPill
                                icon={<FileText size={18} />}
                                label="Active Plan"
                                value="PRO"
                                color="text-orange-400"
                                borderColor="border-orange-500/20"
                                percent="100%"
                            />
                        </div>
                    </div>

                    {/* Recent Activity List - NATURAL/CLEAN STYLE */}
                    <div className="h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white tracking-tight">Recent Activity</h3>
                            <button onClick={() => setCurrentTab('history')} className="text-sm font-medium text-zinc-500 hover:text-white transition">Full History</button>
                        </div>

                        <div className="bg-[#09090b] border border-zinc-800 rounded-2xl overflow-hidden">
                            {/* Header */}
                            <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-4 bg-zinc-900/50 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                <div className="md:col-span-6">Session</div>
                                <div className="md:col-span-3">Date</div>
                                <div className="md:col-span-3 text-right">Status</div>
                            </div>

                            {/* Rows */}
                            <div className="divide-y divide-zinc-800">
                                {interviews.slice(0, 5).map((inv) => (
                                    <div key={inv.id} className="grid grid-cols-1 md:grid-cols-12 items-center px-6 py-4 hover:bg-zinc-900/40 transition group cursor-pointer" onClick={() => navigate(`/interview/${inv.id}`)}>
                                        <div className="md:col-span-6 flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                {inv.status === 'COMPLETED' ? <BarChart3 size={14} /> : <Briefcase size={14} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-zinc-200 group-hover:text-white transition">
                                                    {inv.job_description.split('\n')[0].substring(0, 40) || "Untitled Session"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="md:col-span-3 text-sm text-zinc-500 font-medium">
                                            {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'Today'}
                                        </div>
                                        <div className="md:col-span-3 flex justify-end">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${inv.status === 'COMPLETED'
                                                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {interviews.length === 0 && (
                                    <div className="text-center py-12 text-zinc-600 text-sm">No recent activity recorded.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            );
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 flex overflow-hidden">

            {/* LEFT SIDEBAR - NATURAL/CLEAN */}
            <div className="w-72 bg-black border-r border-zinc-900 flex flex-col hidden md:flex shrink-0 z-20">
                <div className="p-8 pb-4">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black">
                            <Sparkles size={16} strokeWidth={3} />
                        </div>
                        ElevateAI
                    </h1>

                    {/* Profile Section - Clean/Minimal */}
                    <div className="flex items-center gap-3 mb-10 pl-1">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate w-32">Hi, {user?.name || (user?.email || 'User').split('@')[0]}</p>
                            <p className="text-xs text-zinc-500">Welcome back</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 px-4 space-y-1">
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-4 mb-3">Platform</div>
                    <NavItem icon={<Home size={18} />} label="Dashboard" active={currentTab === 'home'} onClick={() => setCurrentTab('home')} />
                    <NavItem icon={<Clock size={18} />} label="History" active={currentTab === 'history'} onClick={() => setCurrentTab('history')} />
                    <NavItem icon={<BarChart3 size={18} />} label="Analytics" active={currentTab === 'analytics'} onClick={() => setCurrentTab('analytics')} />

                    <div className="mt-8 mb-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-4">Tools</div>
                    <NavItem icon={<FileSearch size={18} />} label="Resume Optimizer" active={currentTab === 'optimizer'} onClick={() => setCurrentTab('optimizer')} />
                    <NavItem icon={<Settings size={18} />} label="Settings" active={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} />
                </div>

                <div className="p-4 border-t border-zinc-900">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-500 hover:text-white hover:bg-zinc-900/50 transition">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>

            {/* MIDDLE CONTENT - NATURAL BACKGROUND */}
            <div className="flex-1 flex flex-col h-screen relative overflow-hidden bg-black">
                {/* Header - Minimal */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-zinc-900/50 bg-black/50 backdrop-blur-xl shrink-0 z-10">
                    <h2 className="text-xl font-semibold tracking-tight">
                        {currentTab === 'home' && 'Overview'}
                        {currentTab === 'history' && 'History'}
                        {currentTab === 'analytics' && 'Analytics'}
                        {currentTab === 'optimizer' && 'Resume Optimizer'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full hover:bg-zinc-900 flex items-center justify-center cursor-pointer transition text-zinc-500 hover:text-white">
                            <Bell size={18} />
                        </div>
                    </div>
                </div>

                {/* Scroll Area */}
                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar z-10">
                    <div className="max-w-6xl mx-auto">
                        {getTabContent()}
                    </div>
                </div>
            </div>

            {/* RIGHT WIDGETS - NATURAL/CLEAN */}
            <div className="w-[320px] bg-black border-l border-zinc-900 hidden xl:flex flex-col p-6 z-20">
                <div className="mb-8">
                    <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button onClick={() => setShowModal(true)} className="w-full p-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition flex items-center gap-3 group text-left shadow-lg shadow-white/5">
                            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                                <Plus size={16} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">New Session</h4>
                            </div>
                        </button>
                        <button onClick={() => setCurrentTab('optimizer')} className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex items-center gap-3 text-left">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center">
                                <FileSearch size={16} />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm text-zinc-200">Check Resume</h4>
                            </div>
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-white mb-4">Announcements</h3>
                    <div className="space-y-4">
                        <AnnouncementCard
                            title="Mock Season Starts"
                            subtitle="Prepare for Summer 2026"
                            time="Today"
                        />
                        <AnnouncementCard
                            title="System Update"
                            subtitle="Latency reduced by 40%"
                            time="Yesterday"
                        />
                    </div>
                </div>
            </div>

            {/* MODAL - CLEAN/MINIMAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in zoom-in duration-200">
                    <div className="bg-[#09090b] text-white p-8 rounded-2xl max-w-lg w-full relative border border-zinc-800 shadow-2xl">
                        <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition"><Plus size={24} className="rotate-45" /></button>

                        <h2 className="text-xl font-bold mb-1">New Session</h2>
                        <p className="text-sm text-zinc-500 mb-6">Configure your mock interview parameters.</p>

                        <form onSubmit={handleStart} className="space-y-5">
                            <InputGroup label="Target Company">
                                <div className="relative">
                                    <input
                                        className="input-minimal"
                                        placeholder="e.g. Google"
                                        value={companyName}
                                        onChange={(e) => { setCompanyName(e.target.value); setShowCompanyDropdown(true); }}
                                        onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                                    />
                                    {showCompanyDropdown && companyName && filteredCompanies.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-[#18181b] border border-zinc-700 rounded-b-xl shadow-xl z-50 max-h-40 overflow-y-auto mt-1">
                                            {filteredCompanies.map(c => (
                                                <div
                                                    key={c}
                                                    className="p-3 hover:bg-zinc-800 cursor-pointer text-sm font-medium text-zinc-200"
                                                    onClick={() => { setCompanyName(c); setShowCompanyDropdown(false); }}
                                                >
                                                    {c}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </InputGroup>

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Role">
                                    <select
                                        className="input-minimal"
                                        value={targetRole}
                                        onChange={(e) => {
                                            const role = e.target.value;
                                            setTargetRole(role);
                                            if (role !== 'Custom' && ROLES[role]) {
                                                setJobDesc(ROLES[role]);
                                            }
                                        }}
                                    >
                                        <option value="" disabled>Select</option>
                                        <option value="Custom">Custom</option>
                                        {Object.keys(ROLES).filter(r => r !== 'Custom').map(role => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                </InputGroup>
                                <InputGroup label="Difficulty">
                                    <select className="input-minimal" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                                        {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </InputGroup>
                            </div>

                            <InputGroup label="Job Description">
                                <textarea className="input-minimal min-h-[100px] resize-none" placeholder="Paste JD..." value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />
                            </InputGroup>

                            <InputGroup label="Resume">
                                <div className="border border-dashed border-zinc-800 bg-zinc-900/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-900 transition relative">
                                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <Upload className="mb-2 text-zinc-500" size={20} />
                                    <span className="text-xs font-medium text-zinc-400">{file ? file.name : "Upload PDF"}</span>
                                </div>
                            </InputGroup>

                            <button disabled={loading} className="w-full bg-white text-black py-3 rounded-lg font-bold text-sm hover:bg-zinc-200 transition mt-2">
                                {loading ? "Initializing..." : "Start Simulation"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .input-minimal {
                    width: 100%;
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 8px;
                    padding: 10px 14px;
                    font-size: 14px;
                    color: white;
                    outline: none;
                    transition: all 0.2s;
                }
                .input-minimal:focus {
                    border-color: #52525b;
                    background: #27272a;
                }
            `}</style>
        </div>
    );
};

// Components
const NavItem = ({ icon, label, active, onClick, badge }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition group ${active ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}>
        <div className="flex items-center gap-3">
            <span className={active ? 'text-white' : 'group-hover:text-white transition'}>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </div>
        {badge && <span className="bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">{badge}</span>}
    </button>
);

// PURE GLASS PILL - PRESERVED AS REQUESTED
const StatPill = ({ icon, label, value, color, borderColor, percent }) => (
    <div className={`bg-[#13131f] border ${borderColor || 'border-white/5'} p-1 rounded-[32px] flex flex-col items-center justify-between h-[280px] hover:-translate-y-1 hover:shadow-2xl transition duration-500 group relative overflow-hidden`}>
        <div className={`absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b ${color.replace('text-', 'from-')}/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500`}></div>

        <div className="mt-8 relative z-10">
            <div className={`w-14 h-14 rounded-2xl bg-[#1e1e24] border border-white/5 flex items-center justify-center ${color} shadow-lg shadow-black/40`}>
                {icon}
            </div>
        </div>

        <div className="text-center relative z-10">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">{label}</h3>
            <p className="text-4xl font-black text-white tracking-tight">{value}</p>
        </div>

        <div className="mb-8 relative z-10">
            <div className="w-16 h-16 rounded-full border-4 border-[#1e1e24] flex items-center justify-center relative">
                <svg className="w-full h-full transform -rotate-90 absolute">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[#1e1e24]" />
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="176" strokeDashoffset={176 - (176 * parseFloat(percent)) / 100} className={`${color} transition-all duration-1000`} />
                </svg>
                <span className="text-[10px] font-bold text-zinc-400">{percent}</span>
            </div>
        </div>
    </div>
);

const AnnouncementCard = ({ title, subtitle, time }) => (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-700 cursor-pointer transition group">
        <div className="flex justify-between items-start mb-1">
            <h4 className="font-medium text-sm text-zinc-200 group-hover:text-white transition">{title}</h4>
            <span className="text-[10px] font-medium text-zinc-600">{time}</span>
        </div>
        <p className="text-xs text-zinc-500">{subtitle}</p>
    </div>
);

const InputGroup = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">{label}</label>
        {children}
    </div>
);

const FileText = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
);
