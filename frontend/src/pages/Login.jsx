import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, ArrowRight, CheckCircle2, Sparkles, Globe2 } from 'lucide-react';

export const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, register } = useAuthStore();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Simulate API latency
            await new Promise(r => setTimeout(r, 800));

            if (isLogin) {
                await login(email, password);
                navigate('/dashboard');
            } else {
                await register(email, password);
                alert('Account created! Logging you in...');
                await login(email, password);
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Authentication failed. Please verify your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">

            {/* LEFT SIDE: HERO visually rich area */}
            <div className="hidden lg:flex w-1/2 relative bg-zinc-900 overflow-hidden flex-col justify-between p-12">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-900/80 to-transparent"></div>

                {/* Brand */}
                <div className="relative z-10 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Elevate AI</span>
                </div>

                {/* Hero Text */}
                <div className="relative z-10 max-w-lg">
                    <h1 className="text-5xl font-bold leading-tight mb-6">
                        Master your next <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">technical interview.</span>
                    </h1>
                    <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                        AI-powered mock interviews with real-time feedback, vision analysis for resumes, and live coding environments.
                    </p>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 size={18} className="text-green-500" />
                            <span>Real-time Voice-to-Voice AI Coach</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 size={18} className="text-green-500" />
                            <span>Vision-enabled Resume Parsing</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <CheckCircle2 size={18} className="text-green-500" />
                            <span>Detailed Performance Analytics</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500">
                    <p>© 2024 ExpertHire AI Inc.</p>
                    <div className="flex items-center gap-4">
                        <span>Privacy Policy</span>
                        <span>Terms of Service</span>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-black relative">
                {/* Mobile Background styling */}
                <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black z-0"></div>

                <div className="w-full max-w-md z-10 relative">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome back' : 'Create an account'}</h2>
                        <p className="text-zinc-400">
                            {isLogin ? 'Enter your details to access your dashboard.' : 'Start your journey to interview mastery today.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-all text-white placeholder:text-zinc-600"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <KeyRound className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-all text-white placeholder:text-zinc-600"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 hover:shadow-blue-600/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-zinc-900 text-center">
                        <p className="text-zinc-500 text-sm">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <button
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors ml-1"
                                onClick={() => setIsLogin(!isLogin)}
                            >
                                {isLogin ? 'Sign up' : 'Log in'}
                            </button>
                        </p>
                    </div>

                    <div className="mt-8 flex justify-center gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                        {/* Fake logos for social proof */}
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold">
                            <Globe2 size={16} /> TRUSTED BY DEVELOPERS
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
