import React, { useState, useEffect } from 'react';
import useAIStore from '../../store/useAIStore';
import { 
  Wand2Icon, 
  MessageSquareIcon, 
  BookAIcon, 
  LanguagesIcon, 
  SparklesIcon, 
  XIcon, 
  CheckIcon,
  ChevronRightIcon
} from 'lucide-react';

const AISidebar = ({ selectedMessage, selectedMessageContext }) => {
  const { isSidebarOpen, setSidebarOpen, activeTab, setActiveTab } = useAIStore();
  const [loading, setLoading] = useState(false);
  const [streamData, setStreamData] = useState('');
  
  // Tab Content States
  const [grammarResult, setGrammarResult] = useState(null);
  const [vocabResult, setVocabResult] = useState(null);

  // When a message is selected (e.g. from Stream Chat custom action), we can automatically explain or translate it.
  useEffect(() => {
    if (selectedMessage && activeTab === 'translation') {
       // Placeholder: In a real app we'd call the translate API here
       setStreamData(`Translating: "${selectedMessage}"...`);
    } else if (selectedMessage && activeTab === 'suggestions') {
       // Explain message via SSE stream
       setStreamData('');
       setLoading(true);
       
       const token = localStorage.getItem('token');
       // In a real app, this would point to the full URL or use a proxy properly
       const eventSource = new EventSource(`http://localhost:5001/api/ai/stream-explain?message=${encodeURIComponent(selectedMessage)}`);
       
       eventSource.onmessage = (event) => {
         if (event.data === '[DONE]') {
           eventSource.close();
           setLoading(false);
           return;
         }
         try {
           const parsed = JSON.parse(event.data);
           if (parsed.chunk) {
             setStreamData(prev => prev + parsed.chunk);
           }
         } catch(e) {}
       };
       
       eventSource.onerror = () => {
         eventSource.close();
         setLoading(false);
       };

       return () => eventSource.close();
    }
  }, [selectedMessage, activeTab]);

  if (!isSidebarOpen) return null;

  return (
    <div className="w-80 border-l border-base-300 bg-base-100 flex flex-col h-full shadow-xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
        <div className="flex items-center gap-2 text-primary font-bold">
          <SparklesIcon className="size-5" />
          <span>AI Copilot</span>
        </div>
        <button className="btn btn-ghost btn-xs btn-square" onClick={() => setSidebarOpen(false)}>
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-base-300 scrollbar-hide">
        <button 
          className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 flex flex-col items-center gap-1 min-w-[70px] ${activeTab === 'suggestions' ? 'border-primary text-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
          onClick={() => setActiveTab('suggestions')}
        >
          <Wand2Icon className="size-4" /> Suggest
        </button>
        <button 
          className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 flex flex-col items-center gap-1 min-w-[70px] ${activeTab === 'corrections' ? 'border-primary text-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
          onClick={() => setActiveTab('corrections')}
        >
          <CheckIcon className="size-4" /> Correct
        </button>
        <button 
          className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 flex flex-col items-center gap-1 min-w-[70px] ${activeTab === 'vocabulary' ? 'border-primary text-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
          onClick={() => setActiveTab('vocabulary')}
        >
          <BookAIcon className="size-4" /> Vocab
        </button>
        <button 
          className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 flex flex-col items-center gap-1 min-w-[70px] ${activeTab === 'translation' ? 'border-primary text-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
          onClick={() => setActiveTab('translation')}
        >
          <LanguagesIcon className="size-4" /> Translate
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-base-100">
        
        {/* Empty State / Welcome */}
        {!selectedMessage && streamData === '' && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <MessageSquareIcon className="size-12" />
            <p className="text-sm">Select a message in the chat or start typing to see AI insights.</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && streamData === '' && (
          <div className="flex justify-center p-4">
            <span className="loading loading-dots loading-md text-primary"></span>
          </div>
        )}

        {/* Streaming Data Display */}
        {streamData && activeTab === 'suggestions' && (
          <div className="prose prose-sm max-w-none">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {streamData}
              {loading && <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />}
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab === 'translation' && streamData && (
          <div className="bg-base-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase opacity-60 mb-2">Translation Result</h4>
            <p className="text-sm">{streamData}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AISidebar;
