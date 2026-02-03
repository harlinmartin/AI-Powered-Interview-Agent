import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './useAuthStore';

const API_URL = 'http://localhost:8000';

export const useInterviewStore = create((set) => ({
    interviews: [],
    currentInterviewId: null,
    uploadResume: async (file, jobDescription, roundType = "Technical", difficulty = "Medium") => {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('job_description', jobDescription);
        formData.append('round_type', roundType);
        formData.append('difficulty', difficulty);

        try {
            const token = useAuthStore.getState().token;
            console.log("Uploading resume...");

            const response = await axios.post(`${API_URL}/interview/upload`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 60000 // 60 second timeout
            });
            console.log("Upload success:", response.data);
            return response.data.interview_id;
        } catch (error) {
            console.error("Upload Error:", error);
            if (error.code === 'ECONNABORTED') {
                alert("Upload timed out. The server is taking too long to process your resume. Please try again.");
            } else {
                alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
            }
            throw error;
        }
    },
    fetchInterviews: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        try {
            const response = await axios.get(`${API_URL}/interview/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            set({ interviews: response.data });
        } catch (e) {
            console.error("Failed to fetch interviews");
        }
    },
    analyticsData: null,
    fetchAnalytics: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;
        try {
            const response = await axios.get(`${API_URL}/analytics/user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            set({ analyticsData: response.data });
        } catch (e) {
            console.error("Failed to fetch analytics", e);
        }
    },
    setCurrentInterviewId: (id) => set({ currentInterviewId: id })
}));
