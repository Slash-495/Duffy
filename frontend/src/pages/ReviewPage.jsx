import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDueCards, submitReview, getDeckById } from '../lib/api';
import { XIcon, CheckIcon, HelpCircleIcon, ArrowRightIcon } from 'lucide-react';
import useFlashcardStore from '../store/useFlashcardStore';

const ReviewPage = () => {
  const { id: deckId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Actually in a real app, if deckId is omitted we could review ALL due cards across decks.
  // We will assume deckId is always passed for now.

  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });

  const { data: dueCards = [], isLoading } = useQuery({
    queryKey: ['dueCards', deckId],
    queryFn: () => getDueCards(deckId),
  });

  const { data: deckData } = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => getDeckById(deckId),
    enabled: !!deckId,
  });

  const { mutate: submitReviewMutation, isPending } = useMutation({
    mutationFn: ({ cardId, quality }) => submitReview(cardId, quality),
    onSuccess: (data, variables) => {
      // Optimistically remove card from current view
      queryClient.setQueryData(['dueCards', deckId], (old) => old.filter(c => c._id !== variables.cardId));
      
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (variables.quality >= 3 ? 1 : 0)
      }));
      setIsFlipped(false);
    }
  });

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

  const currentCard = dueCards[0];

  if (!currentCard) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-base-100 p-4 text-center">
        <div className="size-24 bg-success/10 rounded-full flex items-center justify-center mb-6">
          <CheckIcon className="size-12 text-success" />
        </div>
        <h1 className="text-3xl font-bold mb-2">You're all caught up!</h1>
        <p className="opacity-70 mb-8 max-w-md">
          You've reviewed all due cards in {deckData?.deck?.name || 'this deck'}. Great job!
        </p>
        <div className="flex gap-4">
          <div className="stat bg-base-200 rounded-xl p-4">
            <div className="stat-title">Cards Reviewed</div>
            <div className="stat-value text-primary">{sessionStats.reviewed}</div>
          </div>
          <div className="stat bg-base-200 rounded-xl p-4">
            <div className="stat-title">Accuracy</div>
            <div className="stat-value text-success">
              {sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0}%
            </div>
          </div>
        </div>
        <button className="btn btn-primary mt-8" onClick={() => navigate('/flashcards')}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleGrade = (quality) => {
    submitReviewMutation({ cardId: currentCard._id, quality });
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-base-100 shadow-sm">
        <button className="btn btn-ghost btn-sm btn-square" onClick={() => navigate('/flashcards')}>
          <XIcon className="size-5" />
        </button>
        <div className="text-sm font-semibold opacity-70">
          {dueCards.length} cards remaining
        </div>
        <div className="w-8" /> {/* Spacer */}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-base-300 h-1">
        <div 
          className="bg-primary h-1 transition-all duration-300" 
          style={{ width: `${sessionStats.reviewed > 0 ? (sessionStats.reviewed / (sessionStats.reviewed + dueCards.length)) * 100 : 0}%` }}
        />
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div 
          className={`w-full max-w-lg aspect-[4/3] relative perspective-1000 cursor-pointer`}
          onClick={() => !isFlipped && setIsFlipped(true)}
        >
          <div className={`w-full h-full absolute transform-style-preserve-3d transition-transform duration-500 shadow-xl rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front */}
            <div className="absolute w-full h-full backface-hidden bg-base-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <span className="badge badge-primary badge-outline absolute top-4 left-4">{currentCard.language}</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">{currentCard.word}</h2>
              {currentCard.pronunciation && (
                <p className="text-lg opacity-60">/{currentCard.pronunciation}/</p>
              )}
              {!isFlipped && (
                <div className="absolute bottom-6 opacity-50 flex items-center gap-2 animate-pulse">
                  <p className="text-sm">Tap to flip</p>
                </div>
              )}
            </div>

            {/* Back */}
            <div className="absolute w-full h-full backface-hidden bg-base-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center rotate-y-180">
              <h2 className="text-3xl font-bold mb-2 text-primary">{currentCard.meaning}</h2>
              {currentCard.translation && (
                <p className="text-xl font-medium mb-6 opacity-90">{currentCard.translation}</p>
              )}
              {currentCard.exampleSentence && (
                <div className="bg-base-200 p-4 rounded-xl w-full">
                  <p className="italic text-sm opacity-80 text-left">"{currentCard.exampleSentence}"</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className={`w-full max-w-lg mt-8 flex justify-center gap-2 md:gap-4 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button className="btn btn-error flex-1" onClick={(e) => { e.stopPropagation(); handleGrade(0); }} disabled={isPending}>
            Again
          </button>
          <button className="btn btn-warning flex-1" onClick={(e) => { e.stopPropagation(); handleGrade(3); }} disabled={isPending}>
            Hard
          </button>
          <button className="btn btn-success flex-1" onClick={(e) => { e.stopPropagation(); handleGrade(4); }} disabled={isPending}>
            Good
          </button>
          <button className="btn btn-info flex-1" onClick={(e) => { e.stopPropagation(); handleGrade(5); }} disabled={isPending}>
            Easy
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
