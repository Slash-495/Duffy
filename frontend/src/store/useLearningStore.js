import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';

const useLearningStore = create((set) => ({
  profile: null,
  roadmap: [],
  missions: [],
  activeLesson: null,
  activeQuiz: null,
  loading: false,

  fetchLearningData: async () => {
    set({ loading: true });
    try {
      const [profileRes, roadmapRes] = await Promise.all([
        axiosInstance.get('/learning/profile'),
        axiosInstance.get('/learning/roadmap')
      ]);
      set({ 
        profile: profileRes.data, 
        roadmap: roadmapRes.data.roadmap,
        missions: roadmapRes.data.missions,
        loading: false 
      });
    } catch (error) {
      console.error("Error fetching learning data:", error);
      set({ loading: false });
    }
  },

  setActiveLesson: (lesson) => set({ activeLesson: lesson }),
  setActiveQuiz: (quiz) => set({ activeQuiz: quiz }),

  awardXP: async (amount) => {
    try {
      const res = await axiosInstance.post('/learning/xp', { amount });
      set((state) => ({
        profile: {
          ...state.profile,
          xp: res.data.xp,
          currentStreak: res.data.currentStreak
        }
      }));
    } catch (error) {
      console.error("Error awarding XP:", error);
    }
  }
}));

export default useLearningStore;
