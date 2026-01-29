import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                    <div className="bg-gray-800 p-8 rounded-xl border border-red-500/50 max-w-2xl w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-red-900/50 rounded-full text-red-400">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                                <p className="text-gray-400">The application encountered a critical error.</p>
                            </div>
                        </div>

                        <div className="bg-black/50 p-4 rounded-lg border border-gray-700 font-mono text-sm text-red-300 overflow-auto max-h-64 mb-6">
                            <p className="font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre className="text-gray-500 text-xs">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition w-full"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
