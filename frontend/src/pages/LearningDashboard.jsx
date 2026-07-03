import React, { useEffect, useState } from 'react';
import useLearningStore from '../store/useLearningStore';
import { TrophyIcon, FlameIcon, MapIcon, TargetIcon, BotIcon } from 'lucide-react';
import { Link } from 'react-router';
import LessonViewer from '../components/learning/LessonViewer';
import QuizUI from '../components/learning/QuizUI';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const LearningDashboard = () => {
  const { profile, roadmap, missions, loading, fetchLearningData, activeLesson, activeQuiz, setActiveLesson, setActiveQuiz } = useLearningStore();
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    fetchLearningData();
  }, [fetchLearningData]);

  const handleStartQuiz = async () => {
    setGeneratingQuiz(true);
    try {
      // Hardcoded topic for demo. In a real app, this comes from weakTopics.
      const res = await axiosInstance.post('/learning/quiz', { topic: 'Present Simple vs Present Continuous', targetLanguage: 'English' });
      setActiveQuiz(res.data);
    } catch (error) {
      toast.error('Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  if (loading || !profile) {
    return <div className="p-8 flex justify-center"><span className="loading loading-spinner text-primary"></span></div>;
  }

  if (activeLesson) {
    return <LessonViewer lesson={activeLesson} onComplete={() => setActiveLesson(null)} />;
  }

  if (activeQuiz) {
    return <QuizUI quizData={activeQuiz} onComplete={() => setActiveQuiz(null)} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Stats */}
      <div className="flex justify-between items-center bg-base-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-3xl font-bold">Your Learning Hub</h1>
          <p className="text-base-content/60">Keep up the great work! You're on track for CEFR {profile.targetCEFR}.</p>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <TrophyIcon className="text-yellow-500 size-8" />
            <div>
              <p className="text-2xl font-bold">{profile.xp}</p>
              <p className="text-xs uppercase font-bold opacity-50">Total XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FlameIcon className="text-orange-500 size-8" />
            <div>
              <p className="text-2xl font-bold">{profile.currentStreak}</p>
              <p className="text-xs uppercase font-bold opacity-50">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Roadmap Column */}
        <div className="col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><MapIcon /> Syllabus Roadmap</h2>
          <div className="bg-base-100 rounded-2xl shadow-sm p-6 border border-base-200">
            {roadmap.map((lesson, index) => (
              <div key={lesson._id} className="flex items-center gap-4 py-4 border-b last:border-0 border-base-200">
                <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{lesson.topic}</h3>
                  <p className="text-sm opacity-60">Level {lesson.level} • {lesson.type}</p>
                </div>
                <button onClick={() => setActiveLesson(lesson)} className="btn btn-primary btn-sm">Start Lesson</button>
              </div>
            ))}
            {roadmap.length === 0 && (
              <p className="opacity-60 py-4">You have completed all standard lessons for your level! Talk to the AI coach to generate custom lessons.</p>
            )}
          </div>
        </div>

        {/* Missions & Quizzes Column */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><TargetIcon /> Daily Missions</h2>
          <div className="bg-base-100 rounded-2xl shadow-sm p-6 border border-base-200 space-y-4">
            {missions.map((mission, idx) => (
              <div key={idx} className="bg-base-200 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">{mission.description}</span>
                  <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded-full">{mission.progress}/{mission.target}</span>
                </div>
                <progress className="progress progress-primary w-full" value={mission.progress} max={mission.target}></progress>
              </div>
            ))}
          </div>
          
          <div className="bg-gradient-to-br from-primary to-secondary text-primary-content rounded-2xl p-6 shadow-lg">
            <h3 className="font-bold text-lg mb-2">Ready for a challenge?</h3>
            <p className="text-sm opacity-90 mb-4">Take a personalized quiz generated by AI based on your recent weak points.</p>
            <button onClick={handleStartQuiz} disabled={generatingQuiz} className="btn btn-neutral w-full">
              {generatingQuiz ? <span className="loading loading-spinner"></span> : <><BotIcon className="w-5 h-5 mr-1" /> Start AI Quiz</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LearningDashboard;
