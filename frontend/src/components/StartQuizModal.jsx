import React, { useState } from 'react';
import { X, Upload, Brain, FileText, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export const StartQuizModal = ({ isOpen, onClose }) => {
    const [jobDescription, setJobDescription] = useState("");
    const [resume, setResume] = useState(null);
    const [difficulty, setDifficulty] = useState("Medium");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const token = useAuthStore(state => state.token);
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setResume(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!jobDescription || !resume) {
            setError("Please provide both a Job Description and a Resume.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append('resume', resume);
            formData.append('job_description', jobDescription);
            formData.append('round_type', 'Tailored Quiz');
            formData.append('difficulty', difficulty);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            const res = await fetch(`${API_URL}/interview/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to start quiz");
            }

            const data = await res.json();
            // Navigate to interview room with quiz ID
            navigate(`/quiz/${data.interview_id}`);
            onClose();

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Brain size={24} className="text-purple-400" />
                        </div>
                        <h2 className="text-xl font-bold">Start Tailored Quiz</h2>
                    </div>
                    <p className="text-slate-400 text-sm">
                        Test your skills against a specific job description.
                    </p>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Job Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Job Description / Role <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Paste the job description or requirements here..."
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-h-[120px] text-sm resize-y"
                            />
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Difficulty Level
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Easy', 'Medium', 'Difficult'].map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setDifficulty(level)}
                                        className={`py-2 px-3 text-sm font-medium rounded-lg border transition ${difficulty === level
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resume Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Your Resume <span className="text-red-500">*</span>
                            </label>
                            <div className={`border-2 border-dashed rounded-xl p-4 transition text-center cursor-pointer ${resume ? 'border-purple-500 bg-purple-50/50' : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
                                }`}>
                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="quiz-resume-upload"
                                />
                                <label htmlFor="quiz-resume-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                    {resume ? (
                                        <>
                                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2">
                                                <FileText size={20} />
                                            </div>
                                            <p className="text-sm font-medium text-purple-700 truncate max-w-[200px]">
                                                {resume.name}
                                            </p>
                                            <p className="text-xs text-purple-500 mt-1">Click to change</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
                                                <Upload size={20} />
                                            </div>
                                            <p className="text-sm text-slate-600">
                                                <span className="font-semibold text-purple-600">Click to upload</span> PDF or Image
                                            </p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Preparing Quiz...
                                    </>
                                ) : (
                                    <>
                                        <Brain size={20} /> Start Quiz
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
