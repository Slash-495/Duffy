import React, { useState } from 'react';
import { SendIcon, SparklesIcon, BotIcon } from 'lucide-react';

const AICoach = () => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I'm your personal AI Learning Coach. I've analyzed your recent conversations and flashcard stats. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // Mock AI response for demo purposes (In real app, call /api/ai/chat)
    setTimeout(() => {
      let aiResponse = "I notice you've been struggling with Present Continuous verbs. Would you like me to generate a quick practice quiz for you?";
      if (userMsg.toLowerCase().includes("weakness")) {
        aiResponse = "Based on your recent chats, your biggest weakness is vocabulary related to 'Business'. Let's focus on that this week!";
      } else if (userMsg.toLowerCase().includes("progress")) {
        aiResponse = "You're doing great! Your 3-day streak is impressive. You've earned 150 XP this week.";
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 h-[90vh] flex flex-col">
      <div className="bg-primary text-primary-content p-6 rounded-t-3xl shadow-lg flex items-center gap-4">
        <div className="p-3 bg-white/20 rounded-full">
          <BotIcon className="size-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">AI Learning Coach <SparklesIcon className="size-5 text-yellow-300"/></h1>
          <p className="opacity-90">Ask for study advice, grammar explanations, or progress reports.</p>
        </div>
      </div>

      <div className="flex-1 bg-base-200 p-6 overflow-y-auto flex flex-col gap-4 border-x border-base-300">
        {messages.map((msg, i) => (
          <div key={i} className={`chat ${msg.role === 'ai' ? 'chat-start' : 'chat-end'}`}>
            <div className="chat-image avatar">
              <div className="w-10 rounded-full bg-base-300 flex items-center justify-center">
                {msg.role === 'ai' ? <BotIcon className="size-6" /> : <div className="size-6 bg-primary rounded-full" />}
              </div>
            </div>
            <div className={`chat-bubble ${msg.role === 'ai' ? 'chat-bubble-primary' : 'chat-bubble-neutral'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat chat-start">
             <div className="chat-image avatar">
              <div className="w-10 rounded-full bg-base-300 flex items-center justify-center">
                <BotIcon className="size-6" />
              </div>
            </div>
            <div className="chat-bubble chat-bubble-primary">
              <span className="loading loading-dots loading-sm"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-base-100 rounded-b-3xl border border-t-0 border-base-300 shadow-lg flex gap-2">
        <input 
          type="text" 
          className="input input-bordered flex-1 rounded-full" 
          placeholder="Ask me anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn btn-primary btn-circle" onClick={handleSend} disabled={isTyping}>
          <SendIcon className="size-5" />
        </button>
      </div>
    </div>
  );
};

export default AICoach;
