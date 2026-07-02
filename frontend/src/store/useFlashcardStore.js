import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useFlashcardStore = create(
  persist(
    (set, get) => ({
      activeDeck: null,
      reviewQueue: [],
      
      // We store actions that failed while offline
      offlineQueue: [],
      
      setActiveDeck: (deck) => set({ activeDeck: deck }),
      
      setReviewQueue: (cards) => set({ reviewQueue: cards }),
      
      popReviewCard: () => set((state) => {
        const newQueue = [...state.reviewQueue];
        newQueue.shift();
        return { reviewQueue: newQueue };
      }),

      enqueueOfflineAction: (action) => set((state) => ({
        offlineQueue: [...state.offlineQueue, action]
      })),

      clearOfflineQueue: () => set({ offlineQueue: [] }),
    }),
    {
      name: 'flashcard-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useFlashcardStore;
