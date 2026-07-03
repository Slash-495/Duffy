import React from 'react';
import { MicIcon, PlayIcon, AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';

const PronunciationCard = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="bg-base-100 rounded-3xl p-6 shadow-xl border border-base-200 max-w-2xl mx-auto w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold font-mono">Pronunciation Analysis</h3>
          <p className="text-sm opacity-70">Powered by Deepgram AI</p>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-base-200 rounded-2xl p-4 text-center">
          <p className="opacity-70 text-sm mb-1">Overall Score</p>
          <div className="radial-progress text-primary font-bold text-xl" style={{ "--value": data.pronunciationScore, "--size": "4rem" }}>
            {data.pronunciationScore}%
          </div>
        </div>
        <div className="bg-base-200 rounded-2xl p-4 text-center">
          <p className="opacity-70 text-sm mb-1">Fluency</p>
          <div className="radial-progress text-secondary font-bold text-xl" style={{ "--value": data.fluencyScore, "--size": "4rem" }}>
            {data.fluencyScore}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold flex items-center gap-2">
          <AlertCircleIcon className="size-5 text-warning" /> 
          Areas for Improvement
        </h4>
        
        {data.mispronouncedWords.map((issue, idx) => (
          <div key={idx} className="bg-base-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{issue.word}</p>
              <div className="flex gap-4 text-sm mt-1">
                <span className="text-error">You said: <span className="font-mono">/{issue.userPhoneme}/</span></span>
                <span className="text-success">Expected: <span className="font-mono">/{issue.expectedPhoneme}/</span></span>
              </div>
            </div>
            <button className="btn btn-circle btn-ghost btn-sm text-primary">
              <PlayIcon className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-success/10 text-success rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2Icon className="size-5 mt-0.5" />
        <div>
          <p className="font-bold">Great job overall!</p>
          <p className="text-sm opacity-80 mt-1">Your stress and intonation are improving. Focus on clearly articulating the ending sounds of your words.</p>
        </div>
      </div>

      <button className="btn btn-primary w-full mt-6" onClick={onClose}>
        Continue Practice
      </button>
    </div>
  );
};

export default PronunciationCard;
