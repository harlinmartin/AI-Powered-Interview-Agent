import React, { useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, Award, Zap, BarChart2 } from 'lucide-react';
import { useInterviewStore } from '../store/useInterviewStore';

export const AnalyticsDashboard = () => {
    const { analyticsData, fetchAnalytics } = useInterviewStore();
    const [selectedRole, setSelectedRole] = React.useState('all');

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (!analyticsData) {
        return <div className="p-10 text-center text-zinc-500 animate-pulse">Loading analytics...</div>;
    }

    const { history, role_stats, skill_radar, avg_score } = analyticsData;

    if (!history || history.length === 0) {
        return <div className="p-10 text-center text-zinc-500">No completed interviews found. Complete a session to see analytics.</div>;
    }

    // Get unique roles for filter dropdown
    const uniqueRoles = ['all', ...new Set(history.map(item => item.role))];

    // Filter history based on selected role
    const filteredHistory = selectedRole === 'all'
        ? history
        : history.filter(item => item.role === selectedRole);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <TrendingUp size={60} className="text-blue-500" />
                    </div>
                    <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Average Score</div>
                    <div className="text-4xl font-bold">{avg_score}%</div>
                    <div className="text-blue-400 text-xs mt-2 flex items-center gap-1">
                        <Zap size={10} /> Across all sessions
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <Award size={60} className="text-purple-500" />
                    </div>
                    <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Strongest Skill</div>
                    <div className="text-4xl font-bold truncate">
                        {skill_radar.length > 0 ? skill_radar.reduce((prev, current) => (prev.A > current.A) ? prev : current).subject : 'N/A'}
                    </div>
                    <div className="text-purple-400 text-xs mt-2">Based on historical average</div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <BarChart2 size={60} className="text-emerald-500" />
                    </div>
                    <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Total Sessions</div>
                    <div className="text-4xl font-bold">{history.length}</div>
                    <div className="text-emerald-400 text-xs mt-2">Keep practicing!</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart: Progress */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-400" /> Performance Trend
                        </h3>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer hover:bg-zinc-700 transition"
                        >
                            {uniqueRoles.map(role => (
                                <option key={role} value={role}>
                                    {role === 'all' ? 'All Roles' : role}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filteredHistory}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3b82f6', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '4px' }}
                                    formatter={(value, name, props) => {
                                        const role = props.payload.role || 'N/A';
                                        return [
                                            <div key="tooltip-content">
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{value}%</div>
                                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{role}</div>
                                            </div>,
                                            ''
                                        ];
                                    }}
                                />
                                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Radar Chart: Skills */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Zap size={18} className="text-yellow-400" /> Skill Breakdown
                    </h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skill_radar}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Skills"
                                    dataKey="A"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fill="#8b5cf6"
                                    fillOpacity={0.4}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Role Based Analytics */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <BarChart2 size={18} className="text-emerald-400" /> Performance by Role
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={role_stats} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <Tooltip
                                cursor={{ fill: '#333', opacity: 0.2 }}
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                            />
                            <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg Score" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
