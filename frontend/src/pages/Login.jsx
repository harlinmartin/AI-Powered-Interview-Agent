import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, ArrowRight, CheckCircle2, Sparkles, Globe2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

export const Login = () => {
    const [view, setView] = useState('login'); // 'login', 'register', 'forgot'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                await register(email, password);
                alert('Account created! Logging you in...');
                await login(email, password);
                navigate('/dashboard');
            } else if (view === 'forgot') {
                await resetPassword(email, newPassword);
                setSuccessMsg('Password reset successfully! You can now login.');
                setTimeout(() => {
                    setView('login');
                    setSuccessMsg('');
                    setPassword('');
                }, 2000);
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {view === 'login' ? 'Welcome Back' : view === 'register' ? 'Create Account' : 'Reset Password'}
                    </h2>
                    <p className="text-gray-600 mt-2">
                        {view === 'login' ? 'Please sign in to continue' : view === 'register' ? 'Sign up to get started' : 'Enter your email to reset password'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 text-green-600 p-3 rounded mb-4 text-sm">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {view === 'login' && (
                        <div className="mb-6">
                            <div className="flex justify-center w-full mb-4">
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
                                    width="100%"
                                />
                            </div>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="name@company.com"
                        />
                    </div>

                    {view !== 'forgot' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {view === 'forgot' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="New Password"
                            />
                        </div>
                    )}

                    {view === 'login' && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setView('forgot')}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : (view === 'login' ? 'Sign In' : view === 'register' ? 'Sign Up' : 'Reset Password')}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    {view === 'login' ? (
                        <button onClick={() => setView('register')} className="text-blue-600 hover:underline">
                            Don't have an account? Sign up
                        </button>
                    ) : (
                        <button onClick={() => setView('login')} className="text-blue-600 hover:underline">
                            Back to Sign In
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
