import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, RefreshCw, Copy, Download } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const ResumeOptimizer = () => {
    const { success, error: toastError } = useToast();
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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await axios.get(`${API_URL}/interview/resume/history`, {
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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await axios.post(`${API_URL}/interview/resume/optimize`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setResult(response.data);
            success("Resume analyzed successfully!");
            fetchHistory(); // Refresh history
        } catch (e) {
            console.error(e);
            if (e.response && e.response.status === 401) {
                toastError("Session expired. Please log in again.");
                useAuthStore.getState().logout();
                // The ProtectedRoute in App.jsx will handle the redirect when token becomes null
            } else if (e.response && e.response.data && e.response.data.detail) {
                const errorMsg = e.response.data.detail;
                const cleanMsg = errorMsg.replace(/^(400: )/, '').replace(/Internal Server Error: /, '');
                toastError(cleanMsg);
            } else {
                toastError("Optimization failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const parseMarkdown = (text) => {
        if (!text) return [];
        const sections = text.split('###').filter(s => s.trim());
        return sections.map(s => {
            const [title, ...content] = s.split('\n');
            return { title: title.trim(), content: content.join('\n').trim() };
        });
    };

    const renderFormattedSection = (section) => {
        if (section.title.includes("Bullet Point Critique")) {
            const weakMatch = section.content.match(/\*\*Weak:\*\*(.*?)\n/s);
            const betterMatch = section.content.match(/\*\*Better:\*\*(.*)/s);
            const weak = weakMatch ? weakMatch[1].trim() : "";
            const better = betterMatch ? betterMatch[1].trim() : section.content;

            return (
                <div key={section.title} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mt-4">
                    <h4 className="text-blue-600 font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} /> {section.title}
                    </h4>
                    <div className="space-y-3">
                        <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                            <span className="text-red-600 text-xs font-bold uppercase block mb-1">Original (Weak)</span>
                            <p className="text-sm text-slate-600">{weak}</p>
                        </div>
                        <div className="flex justify-center">
                            <span className="text-slate-400 text-xs">⬇️ Transformed to Impact-Driven ⬇️</span>
                        </div>
                        <div className="bg-green-50 border border-green-100 p-3 rounded-xl">
                            <span className="text-green-600 text-xs font-bold uppercase block mb-1">Optimized (Strong)</span>
                            <p className="text-sm text-slate-800">{better}</p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div key={section.title} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mt-4">
                <h4 className="text-blue-600 font-bold mb-2">{section.title}</h4>
                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                    {section.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('\n').map((line, i) => (
                        <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<span class="text-slate-900 font-bold">$1</span>') }} />
                    ))}
                </div>
            </div>
        );
    };

    const resultsRef = React.useRef(null);

    const handleCopyReport = () => {
        if (!result) return;
        const text = `ATS Score: ${result.ats_score}%\n\n${result.optimized_content}`;
        navigator.clipboard.writeText(text);
        success("Report copied to clipboard!");
    };

    const handleDownloadPDF = async () => {
        if (!resultsRef.current) return;
        try {
            success("Generating PDF... please wait.");

            const canvas = await html2canvas(resultsRef.current, {
                scale: 2,
                backgroundColor: '#18181b', // Match dark theme
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    // Helper to safely convert any color (including oklch) to standard RGB/Hex
                    // Using a canvas context ensures we get a browser-compliant color string
                    const ctx = document.createElement('canvas').getContext('2d');
                    const getSafeColor = (color) => {
                        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return color;
                        try {
                            ctx.fillStyle = color;
                            return ctx.fillStyle; // Returns hex or standard rgb
                        } catch (e) {
                            return '#18181b'; // Fallback
                        }
                    };

                    const sanitizeElement = (el) => {
                        if (!(el instanceof Element)) return;
                        const computed = window.getComputedStyle(el);

                        // Explicitly set converted colors as inline styles
                        // This bypasses the html2canvas parser reading oklch from classes
                        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                            el.style.backgroundColor = getSafeColor(computed.backgroundColor);
                        }
                        if (computed.color) {
                            el.style.color = getSafeColor(computed.color);
                        }
                        if (computed.borderColor && computed.borderColor !== 'rgba(0, 0, 0, 0)') {
                            el.style.borderColor = getSafeColor(computed.borderColor);
                        }
                    };

                    // Traverse and sanitize all elements
                    clonedDoc.querySelectorAll('*').forEach(sanitizeElement);
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Resume_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
            success("PDF downloaded successfully!");
        } catch (e) {
            console.error("PDF Generation Error:", e);
            if (e.message && e.message.includes("oklch")) {
                toastError("PDF Error: Unsupported color format. We've applied a fix, please try again.");
            } else {
                toastError("Failed to generate PDF. Please try again or take a screenshot.");
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in flex flex-col xl:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1 space-y-8">
                <div className="bg-white shadow-soft border border-white/60 p-4 md:p-8 rounded-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                    <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                        <FileText className="text-blue-600" /> Resume ATS Optimizer
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Target Job Description</label>
                                <textarea
                                    value={jobDesc}
                                    onChange={(e) => setJobDesc(e.target.value)}
                                    className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none custom-scrollbar text-slate-800 placeholder-slate-400"
                                    placeholder="Paste the Job Description here..."
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Upload Resume</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-400 transition cursor-pointer relative group bg-slate-50">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                    <Upload className="mb-3 text-slate-400 group-hover:text-blue-600 transition" size={32} />
                                    <p className="text-sm font-medium text-slate-600">{file ? file.name : "Drop PDF Resume here"}</p>
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
                        <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 relative min-h-[500px] max-h-[800px] overflow-y-auto custom-scrollbar flex flex-col">
                            {!result ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 text-center p-8">
                                    <div className="p-4 bg-zinc-900 rounded-full mb-4">
                                        <FileText size={32} />
                                    </div>
                                    <p>Upload your resume and a JD to see how well you match.</p>
                                </div>
                            ) : (
                                <>
                                    <div ref={resultsRef} className="space-y-6 animate-fade-in-up pb-4 flex-1 p-2">
                                        {/* Header Score */}
                                        <div className="flex items-center justify-between p-4 bg-slate-100 rounded-2xl border border-slate-200">
                                            <div>
                                                <div className="text-slate-500 text-xs font-bold uppercase">ATS Match Score</div>
                                                <div className={`text-4xl font-bold mt-1 ${result.ats_score > 70 ? 'text-green-600' : result.ats_score > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                                    {result.ats_score}%
                                                </div>
                                            </div>
                                            <div className="h-16 w-px bg-slate-300"></div>
                                            <div className="text-right">
                                                <div className="text-slate-500 text-xs font-bold uppercase">Status</div>
                                                <div className="font-medium mt-1 text-slate-800">
                                                    {result.ats_score > 70 ? "Excellent Match" : result.ats_score > 40 ? "Needs Improvement" : "Poor Match"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Missing Keywords */}
                                        {result.missing_keywords && result.missing_keywords.length > 0 && (
                                            <div>
                                                <h3 className="text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                                                    <AlertTriangle size={14} /> Missing Keywords
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.missing_keywords.map((kw, i) => (
                                                        <span key={i} className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-medium">
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Parsed Sections */}
                                        <div className="space-y-2">
                                            <h3 className="text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mt-6">
                                                <CheckCircle size={14} /> Optimization Report
                                            </h3>
                                            {parseMarkdown(result.optimized_content).map((section) => renderFormattedSection(section))}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-4 border-t border-zinc-800 flex gap-3 mt-4">
                                        <button
                                            onClick={handleCopyReport}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-medium text-sm transition"
                                        >
                                            <Copy size={16} /> Copy Report
                                        </button>
                                        {/* <button
                                            onClick={handleDownloadPDF}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-blue-500/20"
                                        >
                                            <Download size={16} /> Download PDF
                                        </button> */}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* History Sidebar */}
            <div className="w-full xl:w-80 bg-white border border-white/60 shadow-soft rounded-[2.5rem] p-6 h-fit">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <RefreshCw size={18} className="text-zinc-500" /> Recent Scans
                </h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {history.length === 0 ? (
                        <p className="text-zinc-600 text-sm text-center py-4">No scan history yet.</p>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setResult(item)}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.ats_score > 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.ats_score}%
                                    </span>
                                    <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium truncate group-hover:text-blue-700 transition">
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
