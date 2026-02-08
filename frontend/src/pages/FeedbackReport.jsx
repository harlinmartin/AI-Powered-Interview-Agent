import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle, AlertTriangle, BookOpen, ChevronLeft, UserCheck } from 'lucide-react';

export const FeedbackReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore(state => state.token);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const res = await fetch(`${API_URL}/interview/${id}/feedback`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Failed to generate feedback");
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error(err);
                setError("Could not generate feedback. Did you complete the interview?");
            } finally {
                setLoading(false);
            }
        };

        if (token && id) fetchFeedback();
    }, [id, token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold mb-2">Generating Comprehensive Report...</h2>
                <p className="text-gray-400">Our AI is analyzing your answers, tone, and technical accuracy.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-red-500/10 p-4 rounded-full mb-4 text-red-500"><AlertTriangle size={40} /></div>
                <h2 className="text-2xl font-bold mb-2">Report Generation Failed</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <button onClick={() => navigate('/dashboard')} className="text-blue-400 hover:underline">Return to Dashboard</button>
            </div>
        );
    }

    // Check if data is incomplete (interview likely disconnected early)
    if (data && (data.score === undefined || data.score === null)) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-yellow-500/10 p-4 rounded-full mb-4 text-yellow-500"><AlertTriangle size={40} /></div>
                <h2 className="text-2xl font-bold mb-2">Incomplete Interview</h2>
                <p className="text-gray-400 mb-6">This interview was disconnected before completion. No feedback data is available.</p>
                <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition">Return to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition">
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>

                {/* Header Card */}
                <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

                    <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                        <div className="text-center">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 text-5xl font-bold shadow-lg ${data?.score >= 70 ? 'border-green-500 text-green-400 shadow-green-900/20' : data?.score > 0 ? 'border-yellow-500 text-yellow-400 shadow-yellow-900/20' : 'border-red-500 text-red-400 shadow-red-900/20'}`}>
                                {data?.score ?? 'N/A'}
                            </div>
                            <p className="mt-2 text-gray-400 font-bold tracking-widest text-xs uppercase">Overall Score</p>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold mb-2">Interview Performance Report</h1>
                            <p className="text-gray-300 text-lg leading-relaxed">{data?.summary}</p>
                        </div>
                    </div>
                </div>


                {/* Code Review Section - Only show for coding rounds */}
                {/* Detailed Feedback Section (Coding or Verbal) */}
                {data?.code_feedback && !data.code_feedback.toLowerCase().includes('no code submitted') && (
                    <div className="bg-[#1e1e1e] rounded-3xl p-8 border border-gray-800 shadow-2xl mb-8">
                        <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <div className="p-2 bg-blue-900/30 rounded-lg">
                                {data.feedback_type === 'VERBAL' ? <UserCheck size={20} /> : <BookOpen size={20} />}
                            </div>
                            {data.feedback_type === 'VERBAL' ? "Performance Analysis" : "Code Quality Review"}
                        </h3>
                        <div className="prose prose-invert max-w-none text-gray-300">
                            <p className="whitespace-pre-line leading-relaxed">{data.code_feedback}</p>
                        </div>
                    </div>
                )}



                {/* Quiz Analysis Section */}
                {data?.detailed_q_and_a && data.detailed_q_and_a.length > 0 && (
                    <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl mb-8">
                        <h3 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-2">
                            <BookOpen size={24} /> Detailed Quiz Analysis
                        </h3>
                        <div className="space-y-6">
                            {data.detailed_q_and_a.map((item, index) => (
                                <div key={index} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-purple-500/30 transition">
                                    <h4 className="font-semibold text-white mb-4 flex gap-3">
                                        <span className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-lg text-sm h-fit">Q{index + 1}</span>
                                        {item.question}
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Your Answer</span>
                                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.user_answer || "No answer provided"}</p>
                                        </div>

                                        <div className="bg-emerald-900/10 p-4 rounded-lg border border-emerald-900/30">
                                            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2 block">Ideal Answer</span>
                                            <p className="text-emerald-100/80 text-sm whitespace-pre-wrap">{item.ideal_answer}</p>
                                        </div>
                                    </div>

                                    {item.gap_analysis && (
                                        <div className="mt-4 bg-amber-900/10 p-4 rounded-lg border border-amber-900/30">
                                            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2 block">Feedback & Gap Analysis</span>
                                            <p className="text-amber-100/80 text-sm">{item.gap_analysis}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Strengths */}
                    {data?.strengths?.length > 0 && (
                        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                            <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                                <CheckCircle size={24} /> Key Strengths
                            </h3>
                            <ul className="space-y-3">
                                {data.strengths.map((s, i) => (
                                    <li key={i} className="flex gap-3 text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                                        <span className="text-green-500 font-bold">•</span>
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Weaknesses */}
                    {data?.weaknesses?.length > 0 && (
                        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                                <AlertTriangle size={24} /> Areas for Improvement
                            </h3>
                            <ul className="space-y-3">
                                {data.weaknesses.map((w, i) => (
                                    <li key={i} className="flex gap-3 text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                                        <span className="text-red-500 font-bold">•</span>
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Study Plan */}
                    {data?.suggestions?.length > 0 && (
                        <div className="bg-blue-900/10 p-6 rounded-2xl border border-blue-900/30 col-span-1 md:col-span-2">
                            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                                <BookOpen size={24} /> Recommended Study Plan
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {data.suggestions.map((s, i) => (
                                    <div key={i} className="bg-gray-900 p-4 rounded-xl border border-blue-900/30 hover:border-blue-500 transition">
                                        <p className="text-gray-300 font-medium">{s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
