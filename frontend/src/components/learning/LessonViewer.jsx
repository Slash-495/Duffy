import React, { useState } from 'react';
import { ArrowLeftIcon, CheckCircle2Icon } from 'lucide-react';
import useLearningStore from '../../store/useLearningStore';

const LessonViewer = ({ lesson, onComplete }) => {
  const [step, setStep] = useState(0);
  const { awardXP } = useLearningStore();

  const handleNext = () => {
    if (step < lesson.content.examples.length) {
      setStep(step + 1);
    } else {
      awardXP(25);
      onComplete();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-[60vh] flex flex-col">
      <button onClick={onComplete} className="btn btn-ghost btn-sm w-fit mb-4">
        <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Hub
      </button>

      <div className="flex-1 flex flex-col justify-center">
        {step === 0 ? (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-primary">{lesson.topic}</h2>
            <p className="text-xl leading-relaxed">{lesson.content.explanation}</p>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <h3 className="text-2xl font-bold">Example {step}</h3>
            <div className="bg-base-200 p-8 rounded-2xl">
              <p className="text-3xl font-bold mb-4">{lesson.content.examples[step - 1].original}</p>
              <p className="text-xl opacity-70">{lesson.content.examples[step - 1].translation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between items-center border-t border-base-200 pt-6">
        <div className="flex gap-2">
          {Array.from({ length: lesson.content.examples.length + 1 }).map((_, i) => (
            <div key={i} className={`h-2 rounded-full w-12 transition-all ${i <= step ? 'bg-primary' : 'bg-base-300'}`} />
          ))}
        </div>
        <button onClick={handleNext} className="btn btn-primary btn-wide rounded-full text-lg shadow-lg">
          {step === lesson.content.examples.length ? (
            <><CheckCircle2Icon className="mr-2" /> Finish (+25 XP)</>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
};

export default LessonViewer;
