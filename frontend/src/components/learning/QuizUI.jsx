import React, { useState } from 'react';
import useLearningStore from '../../store/useLearningStore';
import { ArrowLeftIcon, TrophyIcon, XCircleIcon } from 'lucide-react';

const QuizUI = ({ quizData, onComplete }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  
  const { awardXP } = useLearningStore();

  const handleSelect = (opt) => {
    if (isAnswered) return;
    setSelectedOpt(opt);
    setIsAnswered(true);
    
    if (opt === quizData.questions[currentQ].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQ < quizData.questions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelectedOpt(null);
      setIsAnswered(false);
    } else {
      awardXP(50); // Give 50 XP for completing quiz
      onComplete();
    }
  };

  if (!quizData || !quizData.questions) return null;

  const q = quizData.questions[currentQ];

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-[70vh] flex flex-col">
       <button onClick={onComplete} className="btn btn-ghost btn-sm w-fit mb-4">
        <ArrowLeftIcon className="w-4 h-4 mr-2" /> Exit Quiz
      </button>

      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-8">{q.prompt}</h2>

        <div className="grid grid-cols-1 gap-4">
          {q.options.map((opt, i) => {
            let btnClass = "btn btn-outline btn-lg normal-case justify-start";
            if (isAnswered) {
              if (opt === q.correctAnswer) btnClass = "btn btn-success text-white normal-case justify-start";
              else if (opt === selectedOpt) btnClass = "btn btn-error text-white normal-case justify-start";
            }
            return (
              <button 
                key={i} 
                onClick={() => handleSelect(opt)}
                className={btnClass}
                disabled={isAnswered}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="mt-8 p-4 bg-base-200 rounded-xl flex gap-4 items-start animate-fade-in-up">
            {selectedOpt === q.correctAnswer ? (
              <TrophyIcon className="text-success mt-1 size-6 shrink-0" />
            ) : (
              <XCircleIcon className="text-error mt-1 size-6 shrink-0" />
            )}
            <div>
              <h4 className="font-bold">{selectedOpt === q.correctAnswer ? 'Correct!' : 'Incorrect'}</h4>
              <p className="text-sm opacity-80 mt-1">{q.explanation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button 
          onClick={handleNext} 
          disabled={!isAnswered}
          className="btn btn-primary w-full rounded-full text-lg shadow-lg"
        >
          {currentQ === quizData.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
        </button>
      </div>
    </div>
  );
};

export default QuizUI;
