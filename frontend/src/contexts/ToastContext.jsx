import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const success = (msg) => addToast(msg, 'success');
    const error = (msg) => addToast(msg, 'error');
    const warning = (msg) => addToast(msg, 'warning');
    const info = (msg) => addToast(msg, 'info');

    return (
        <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            min-w-[300px] max-w-md p-4 rounded-xl shadow-2xl flex items-start gap-3 border animate-slide-in-right backdrop-blur-md
                            ${toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100' : ''}
                            ${toast.type === 'error' ? 'bg-red-900/90 border-red-500/50 text-red-100' : ''}
                            ${toast.type === 'warning' ? 'bg-amber-900/90 border-amber-500/50 text-amber-100' : ''}
                            ${toast.type === 'info' ? 'bg-blue-900/90 border-blue-500/50 text-blue-100' : ''}
                        `}
                    >
                        <div className="mt-0.5">
                            {toast.type === 'success' && <CheckCircle size={18} className="text-emerald-400" />}
                            {toast.type === 'error' && <AlertCircle size={18} className="text-red-400" />}
                            {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-400" />}
                            {toast.type === 'info' && <Info size={18} className="text-blue-400" />}
                        </div>
                        <div className="flex-1 text-sm font-medium leading-relaxed">
                            {toast.message}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-white/40 hover:text-white transition"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
