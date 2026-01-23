import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './useAuthStore';

const API_URL = 'http://localhost:8000';

export const useInterviewStore = create((set) => ({
    interviews: [],
    currentInterviewId: null,
    uploadResume: async (file, jobDescription) => {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('job_description', jobDescription);

        const token = useAuthStore.getState().token;

        const response = await axios.post(`${API_URL}/interview/upload`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data.interview_id;
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
    setCurrentInterviewId: (id) => set({ currentInterviewId: id })
}));
