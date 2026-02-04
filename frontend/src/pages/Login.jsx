import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, ArrowRight, CheckCircle2, Sparkles, Globe2, User } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

export const Login = () => {
    const [view, setView] = useState('login'); // 'login', 'register', 'forgot'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [newPassword, setNewPassword] = useState(''); // For reset
    const [isLoading, setIsLoading] = useState(false);
    const { login, register, resetPassword, googleLogin } = useAuthStore();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsLoading(true);
        try {
            // Simulate API latency
            await new Promise(r => setTimeout(r, 800));

            if (view === 'login') {
                await login(email, password);
                navigate('/dashboard');
            } else if (view === 'register') {
                // Password Validation
                const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
                if (!passwordRegex.test(password)) {
                    setError('Password must be at least 8 characters, contain 1 uppercase letter, and 1 number.');
                    setIsLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setIsLoading(false);
                    return;
                }
                await register(email, password, name);
                alert('Account created! Logging you in...');
                await login(email, password);
                navigate('/dashboard');
            } else if (view === 'forgot') {
                await resetPassword(email);
                setSuccessMsg('Reset link sent! Please check your email.');
                setTimeout(() => {
                    setView('login');
                    setSuccessMsg('');
                }, 5000);
            }
        } catch (err) {
            console.error("Auth Error:", err);
            const errorMessage = err.response?.data?.detail || 'Authentication failed. Please verify your credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-3xl -ml-32 -mb-32"></div>
            </div>

            <div className="max-w-md w-full bg-theme-surface rounded-[2.5rem] shadow-soft border border-white/60 p-8 md:p-10 relative z-10 animate-fade-in-up">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 mb-6 transform rotate-3 hover:rotate-6 transition-transform">
                        <KeyRound size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                        {view === 'login' ? 'Welcome Back' : view === 'register' ? 'Join ElevateAI' : 'Reset Password'}
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">
                        {view === 'login' ? 'Sign in to access your interview dashboard' : view === 'register' ? 'Start your journey to interview success' : 'Enter your email to recover your account'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 animate-fade-in">
                        <CheckCircle2 size={16} className="rotate-45" /> {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 animate-fade-in">
                        <CheckCircle2 size={16} /> {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {view === 'login' && (
                        <div className="mb-8">
                            <div className="flex justify-center w-full mb-6">
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        try {
                                            const decoded = jwtDecode(credentialResponse.credential);
                                            console.log("Google Login Success", decoded);
                                            await googleLogin(credentialResponse.credential, decoded.email, decoded.name);
                                            navigate('/dashboard');
                                        } catch (error) {
                                            console.error("Google Login Error:", error);
                                            setError("Google Login Failed");
                                        }
                                    }}
                                    onError={() => {
                                        console.log('Login Failed');
                                        setError("Google Login Failed");
                                    }}
                                    useOneTap
                                    theme="filled_blue"
                                    shape="pill"
                                    size="large"
                                    text="continue_with"
                                    width="100%"
                                />
                            </div>

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-slate-400 font-medium">Or continue with email</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'register' && (
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    {view !== 'forgot' && (
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {view === 'register' && (
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {view === 'login' && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setView('forgot')}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Sparkles className="animate-spin" /> : <ArrowRight />}
                        {isLoading ? 'Processing...' : (view === 'login' ? 'Sign In' : view === 'register' ? 'Create Account' : 'Send Reset Link')}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    {view === 'login' ? (
                        <p className="text-slate-500 text-sm">
                            Don't have an account?{' '}
                            <button onClick={() => setView('register')} className="text-blue-600 font-bold hover:underline">
                                Sign up free
                            </button>
                        </p>
                    ) : (
                        <button onClick={() => setView('login')} className="text-slate-500 font-bold hover:text-slate-800 text-sm flex items-center justify-center gap-2 w-full">
                            Back to Sign In
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
