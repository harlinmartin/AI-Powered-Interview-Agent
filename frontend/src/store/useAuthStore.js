import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useAuthStore = create((set) => ({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user')) || null,
    login: async (email, password) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        // Use form-data for OAuth2PasswordRequestForm compatibility
        const response = await axios.post(`${API_URL}/login`, formData);
        const token = response.data.access_token;

        // Attempt to preserve existing user data if email matches, or create new default
        const existingUser = JSON.parse(localStorage.getItem('user'));
        const userObj = (existingUser && existingUser.email === email) ? existingUser : { email };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userObj));
        set({ token, user: userObj });
    },
    register: async (email, password, name) => {
        await axios.post(`${API_URL}/register`, { email, password, full_name: name });
    },
    googleLogin: async (token, email, name) => {
        const response = await axios.post(`${API_URL}/google-login`, { token });
        const accessToken = response.data.access_token;
        const userObj = { email, name };
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(userObj));
        set({ token: accessToken, user: userObj });
    },
    resetPassword: async (email) => {
        await axios.post(`${API_URL}/forgot-password`, { email });
    },
    confirmPasswordReset: async (token, newPassword) => {
        await axios.post(`${API_URL}/reset-password`, { token, new_password: newPassword });
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ token: null, user: null });
    },
    updateUser: (updates) => set((state) => {
        const newUser = { ...state.user, ...updates };
        localStorage.setItem('user', JSON.stringify(newUser));
        return { user: newUser };
    }),
}));
