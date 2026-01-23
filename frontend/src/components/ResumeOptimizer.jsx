import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';

export const ResumeOptimizer = () => {
    const [file, setFile] = useState(null);
    const [jobDesc, setJobDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) return;
            const res = await axios.get('http://localhost:8000/interview/resume/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (e) {
            console.error("Failed to fetch history", e);
            if (e.response && e.response.status === 401) {
                // Silent logout for history fetch, or alert? 
                // Better to just let the optimize action handle the alert to avoid spam on load, 
                // but if the token is invalid, we should probably redirect.
                // For now, let's just log it, as the user might be doing something else.
                // But for optimize action, we must alert.
            }
        }
    };

    const handleOptimize = async () => {
        if (!file || !jobDesc) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('resume', file);
            formData.append('job_description', jobDesc);

            const token = useAuthStore.getState().token;
            const response = await axios.post('http://localhost:8000/interview/resume/optimize', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setResult(response.data);
            fetchHistory(); // Refresh history
        } catch (e) {
            console.error(e);
            if (e.response && e.response.status === 401) {
                alert("Session expired. Please log in again.");
                useAuthStore.getState().logout();
                // The ProtectedRoute in App.jsx will handle the redirect when token becomes null
            } else {
                alert("Optimization failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in flex gap-6">
            {/* Main Content */}
            <div className="flex-1 space-y-8">
                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                    <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                        <FileText className="text-blue-400" /> Resume ATS Optimizer
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Target Job Description</label>
                                <textarea
                                    value={jobDesc}
                                    onChange={(e) => setJobDesc(e.target.value)}
                                    className="w-full h-40 bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 transition resize-none"
                                    placeholder="Paste the Job Description here..."
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Upload Resume</label>
                                <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-zinc-800/30 hover:border-blue-500/50 transition cursor-pointer relative group">
                                    <input
                                        type="file"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                    <Upload className="mb-3 text-zinc-500 group-hover:text-blue-400 transition" size={32} />
                                    <p className="text-sm font-medium">{file ? file.name : "Drop PDF/Image here"}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleOptimize}
                                disabled={loading || !file || !jobDesc}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${loading || !file || !jobDesc ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25'}`}
                            >
                                {loading ? <RefreshCw className="animate-spin" /> : <RefreshCw />}
                                {loading ? "Optimizing..." : "Run ATS Scan"}
                            </button>
                        </div>

                        {/* Results Section */}
                        <div className="bg-black/40 rounded-2xl border border-zinc-800 p-6 relative min-h-[400px]">
                            {!result ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 text-center p-8">
                                    <div className="p-4 bg-zinc-900 rounded-full mb-4">
                                        <FileText size={32} />
                                    </div>
                                    <p>Upload your resume and a JD to see how well you match.</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                                        <div>
                                            <div className="text-zinc-400 text-xs font-bold uppercase">ATS Match Score</div>
                                            <div className={`text-4xl font-bold mt-1 ${result.ats_score > 70 ? 'text-green-400' : result.ats_score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {result.ats_score}%
                                            </div>
                                        </div>
                                        <div className="h-16 w-px bg-zinc-700"></div>
                                        <div className="text-right">
                                            <div className="text-zinc-400 text-xs font-bold uppercase">Status</div>
                                            <div className="font-medium mt-1 text-white">
                                                {result.ats_score > 70 ? "Excellent Match" : result.ats_score > 40 ? "Needs Improvement" : "Poor Match"}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-red-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                                            <AlertTriangle size={16} /> Missing Keywords
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {result.missing_keywords?.map((kw, i) => (
                                                <span key={i} className="px-3 py-1 bg-red-900/20 text-red-200 border border-red-900/30 rounded-full text-xs">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                                            <CheckCircle size={16} /> Optimized Content Suggestion
                                        </h3>
                                        <div className="bg-zinc-900 p-4 rounded-lg text-xs leading-relaxed text-zinc-300 font-mono overflow-y-auto max-h-[300px] border border-zinc-700 custom-scrollbar whitespace-pre-wrap">
                                            {result.optimized_content}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* History Sidebar */}
            <div className="w-80 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 hidden xl:block h-fit">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <RefreshCw size={18} className="text-zinc-500" /> Recent Scans
                </h3>
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <p className="text-zinc-600 text-sm text-center py-4">No scan history yet.</p>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setResult(item)}
                                className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-zinc-800 transition group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.ats_score > 70 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                        {item.ats_score}%
                                    </span>
                                    <span className="text-[10px] text-zinc-500">{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium truncate group-hover:text-blue-200 transition">
                                    {item.job_description.substring(0, 40)}...
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
