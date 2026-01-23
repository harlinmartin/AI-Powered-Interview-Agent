import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, Award, Zap } from 'lucide-react';

export const AnalyticsDashboard = ({ interviews }) => {

    const processedData = useMemo(() => {
        // Reverse to show oldest to newest
        const sorted = [...(interviews || [])].reverse();

        return sorted.map((inv) => {
            let score = 0;
            let metrics = { technical: 0, communication: 0, problem_solving: 0, confidence: 0 };

            if (inv.feedback_result) {
                try {
                    const parsed = JSON.parse(inv.feedback_result);
                    score = parsed.score || 0;
                    if (parsed.metrics) metrics = parsed.metrics;
                } catch (e) {
                    // Fallback
                }
            }

            return {
                name: `Session ${inv.id}`,
                score: score,
                ...metrics
            };
        });
    }, [interviews]);

    // Average Metrics for Radar Chart
    const averageMetrics = useMemo(() => {
        if (processedData.length === 0) return [];

        const totals = { technical: 0, communication: 0, problem_solving: 0, confidence: 0 };
        let count = 0;

        processedData.forEach(d => {
            if (d.score > 0) { // Only count finished ones
                totals.technical += d.technical || 0;
                totals.communication += d.communication || 0;
                totals.problem_solving += d.problem_solving || 0;
                totals.confidence += d.confidence || 0;
                count++;
            }
        });

        if (count === 0) return [
            { subject: 'Technical', A: 0, fullMark: 100 },
            { subject: 'Communication', A: 0, fullMark: 100 },
            { subject: 'Problem Solving', A: 0, fullMark: 100 },
            { subject: 'Confidence', A: 0, fullMark: 100 },
        ];

        return [
            { subject: 'Technical', A: Math.round(totals.technical / count), fullMark: 100 },
            { subject: 'Communication', A: Math.round(totals.communication / count), fullMark: 100 },
            { subject: 'Problem Solving', A: Math.round(totals.problem_solving / count), fullMark: 100 },
            { subject: 'Confidence', A: Math.round(totals.confidence / count), fullMark: 100 },
        ];
    }, [processedData]);

    if (!interviews || interviews.length === 0) {
        return <div className="p-10 text-center text-zinc-500">No data available for analytics yet.</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <TrendingUp size={60} className="text-blue-500" />
                    </div>
                    <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Latest Score</div>
                    <div className="text-4xl font-bold">{processedData[processedData.length - 1]?.score || 0}%</div>
                    <div className="text-green-400 text-xs mt-2 flex items-center gap-1">
                        <Zap size={10} /> Live Performance
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <Award size={60} className="text-purple-500" />
                    </div>
                    <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Strongest Skill</div>
                    <div className="text-4xl font-bold truncate">
                        {averageMetrics.reduce((prev, current) => (prev.A > current.A) ? prev : current).subject}
                    </div>
                    <div className="text-purple-400 text-xs mt-2">Based on historical average</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart: Progress */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-400" /> Performance Trend
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={processedData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
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
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={averageMetrics}>
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
        </div>
    );
};
