import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { useAuthStore } from './store/useAuthStore';
import 'regenerator-runtime/runtime';
import { InterviewRoom } from './pages/InterviewRoom';
import { CodingTest } from './pages/CodingTest';
import { FeedbackReport } from './pages/FeedbackReport';

function ProtectedRoute({ children }) {
    const token = useAuthStore((state) => state.token);
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/interview/:id"
                    element={
                        <ProtectedRoute>
                            <InterviewRoom />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/code-test/:id"
                    element={
                        <ProtectedRoute>
                            <CodingTest />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/feedback/:id"
                    element={
                        <ProtectedRoute>
                            <FeedbackReport />
                        </ProtectedRoute>
                    }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
