import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAIStore = create(
  persist(
    (set, get) => ({
      // Settings
      isSidebarOpen: false,
      suggestionsEnabled: true,
      strictness: 'medium', // loose, medium, strict
      tone: 'natural', // formal, casual, natural
      targetLanguage: 'spanish', // Default, should sync with user profile
      
      // Cache for tokens
      cache: {},

      // State for current active AI actions
      activeTab: 'suggestions', // suggestions, corrections, vocabulary, translation, flashcards, analysis
      currentAnalysis: null,
      
      // Actions
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      setActiveTab: (tab) => set({ activeTab: tab, isSidebarOpen: true }),
      
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      
      setCache: (key, value) => set((state) => ({
        cache: { ...state.cache, [key]: value }
      })),
      
      clearCache: () => set({ cache: {} }),
      
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
    }),
    {
      name: 'ai-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        suggestionsEnabled: state.suggestionsEnabled,
        strictness: state.strictness,
        tone: state.tone,
        targetLanguage: state.targetLanguage
      }),
    }
  )
);

export default useAIStore;
