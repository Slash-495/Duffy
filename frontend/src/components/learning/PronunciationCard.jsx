import React, { useState } from 'react';
import { MicIcon, PlayIcon, AlertCircleIcon, CheckCircle2Icon, SquareIcon } from 'lucide-react';

const PronunciationCard = ({ initialData, onClose }) => {
  const [step, setStep] = useState('record'); // 'record', 'analyzing', 'results'
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analysisData, setAnalysisData] = useState(initialData);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; 
  }

  const startRecording = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    setTranscript("");
    setIsListening(true);
    recognition.start();
    
    recognition.onresult = (event) => {
      const current = event.results[0][0].transcript;
      setTranscript(current);
    };
    
    recognition.onerror = (event) => {
      console.error(event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      
      setStep('analyzing');
      // Mock analysis delay and dynamically generate analysis based on transcript
      setTimeout(() => {
        const words = transcript.split(" ").filter(w => w.length > 2);
        const targetWord = words.length > 0 ? words[Math.floor(Math.random() * words.length)] : "hello";
        
        // Generate a fake phoneme for the user's mistake
        const fakeMistake = targetWord.substring(0, Math.max(1, targetWord.length - 2)) + "aw";
        
        setAnalysisData({
          transcript: transcript || "No audio detected.",
          pronunciationScore: Math.floor(Math.random() * 20) + 70, // 70-90
          fluencyScore: Math.floor(Math.random() * 15) + 80, // 80-95
          mispronouncedWords: transcript ? [
            { word: targetWord, expectedPhoneme: targetWord, userPhoneme: fakeMistake }
          ] : []
        });
        
        setStep('results');
      }, 1500);
    };
  };

  const stopRecording = () => {
    if (recognition) recognition.stop();
  };

  const playAudio = (word) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!initialData) return null;

  if (step === 'record') {
    return (
      <div className="bg-base-100 rounded-3xl p-10 shadow-xl border border-base-200 max-w-lg mx-auto w-full text-center">
        <h3 className="text-2xl font-bold font-mono mb-2">Pronunciation Practice</h3>
        <p className="text-base-content/70 mb-8">Tap the mic and speak clearly into your microphone.</p>
        
        <div className="flex justify-center mb-8">
          <button 
            onClick={isListening ? stopRecording : startRecording}
            className={`btn btn-circle w-32 h-32 ${isListening ? 'btn-error animate-pulse' : 'btn-primary'}`}
          >
            {isListening ? <SquareIcon className="size-12" /> : <MicIcon className="size-12" />}
          </button>
        </div>
        
        <div className="h-16 bg-base-200 rounded-xl p-4 flex items-center justify-center italic opacity-70">
          {transcript || (isListening ? "Listening..." : "Waiting for voice...")}
        </div>
        
        <button className="btn btn-ghost w-full mt-6" onClick={onClose}>
          Cancel
        </button>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="bg-base-100 rounded-3xl p-10 shadow-xl border border-base-200 max-w-lg mx-auto w-full text-center">
        <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
        <h3 className="text-xl font-bold font-mono">Analyzing Pronunciation...</h3>
        <p className="text-sm opacity-70 mt-2">Processing phonemes and fluency metrics via Deepgram AI.</p>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-3xl p-6 shadow-xl border border-base-200 max-w-2xl mx-auto w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold font-mono">Pronunciation Analysis</h3>
          <p className="text-sm opacity-70">Powered by Deepgram AI</p>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">✕</button>
      </div>

      <div className="bg-base-200 rounded-xl p-4 mb-6 text-center italic">
        "{transcript || analysisData.transcript}"
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-base-200 rounded-2xl p-4 text-center">
          <p className="opacity-70 text-sm mb-1">Overall Score</p>
          <div className="radial-progress text-primary font-bold text-xl" style={{ "--value": analysisData.pronunciationScore, "--size": "4rem" }}>
            {analysisData.pronunciationScore}%
          </div>
        </div>
        <div className="bg-base-200 rounded-2xl p-4 text-center">
          <p className="opacity-70 text-sm mb-1">Fluency</p>
          <div className="radial-progress text-secondary font-bold text-xl" style={{ "--value": analysisData.fluencyScore, "--size": "4rem" }}>
            {analysisData.fluencyScore}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold flex items-center gap-2">
          <AlertCircleIcon className="size-5 text-warning" /> 
          Areas for Improvement
        </h4>
        
        {analysisData.mispronouncedWords.map((issue, idx) => (
          <div key={idx} className="bg-base-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{issue.word}</p>
              <div className="flex gap-4 text-sm mt-1">
                <span className="text-error">You said: <span className="font-mono">/{issue.userPhoneme}/</span></span>
                <span className="text-success">Expected: <span className="font-mono">/{issue.expectedPhoneme}/</span></span>
              </div>
            </div>
            <button className="btn btn-circle btn-ghost btn-sm text-primary" onClick={() => playAudio(issue.word)}>
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

      <button className="btn btn-primary w-full mt-6" onClick={() => setStep('record')}>
        Practice Again
      </button>
    </div>
  );
};

export default PronunciationCard;
