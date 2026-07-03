import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeftIcon, SendIcon, MicIcon } from 'lucide-react';
import useAuthUser from '../hooks/useAuthUser';
import { scenarios } from './RoleplayHub';
import { playRoleplayTurn } from '../lib/api';

const RoleplaySession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const messagesEndRef = useRef(null);

  const scenario = scenarios.find(s => s.id === parseInt(id));
  const Icon = scenario?.icon;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: 'system', content: scenario?.systemPrompt || "Scenario Started." },
    { id: 2, role: 'ai', content: scenario?.firstMessage || "Hello." }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageContent = input.trim();
    const userMessage = { id: Date.now(), role: 'user', content: userMessageContent };
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history payload for the backend (excluding the system message)
      const historyPayload = messages
        .filter(m => m.role !== 'system')
        .concat(userMessage)
        .map(m => ({ role: m.role, text: m.content }));

      const response = await playRoleplayTurn(historyPayload);
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'ai', 
        content: response.message 
      }]);
    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'system', 
        content: "Error: Could not connect to AI. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!scenario) return <div>Scenario not found</div>;

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-base-200 rounded-t-3xl p-4 flex items-center justify-between border-b border-base-300">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/roleplay')} className="btn btn-ghost btn-sm btn-circle">
            <ArrowLeftIcon className="size-5" />
          </button>
          <div className={`p-2 rounded-xl ${scenario.bg}`}>
            <Icon className={`size-6 ${scenario.color}`} />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">{scenario.title}</h2>
            <p className="text-xs opacity-70">{scenario.persona} • {scenario.difficulty}</p>
          </div>
        </div>
        <button onClick={() => navigate('/roleplay')} className="btn btn-outline btn-sm btn-error">End Scenario</button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-base-100 border-x border-base-300 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
            
            {msg.role === 'system' && (
              <div className="bg-base-200 text-xs px-4 py-2 rounded-full opacity-70 font-mono text-center max-w-sm">
                {msg.content}
              </div>
            )}

            {msg.role === 'ai' && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="avatar self-end">
                  <div className="w-8 rounded-full border border-base-300">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Officer" alt="AI" />
                  </div>
                </div>
                <div className="chat chat-start">
                  <div className="chat-bubble bg-base-200 text-base-content">{msg.content}</div>
                </div>
              </div>
            )}

            {msg.role === 'user' && (
              <div className="flex gap-3 max-w-[80%] flex-row-reverse">
                <div className="avatar self-end">
                  <div className="w-8 rounded-full border border-base-300">
                    <img src={authUser?.profilePic || "../public/default-avatar.jpg"} alt="You" />
                  </div>
                </div>
                <div className="chat chat-end">
                  <div className="chat-bubble bg-primary text-primary-content">{msg.content}</div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-base-200 rounded-b-3xl p-4 border-t border-base-300">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" className="btn btn-circle btn-ghost text-base-content/70 hover:text-primary">
            <MicIcon className="size-5" />
          </button>
          <input
            type="text"
            placeholder="Type your response..."
            className="input input-bordered w-full bg-base-100 rounded-full"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn btn-circle btn-primary" disabled={!input.trim()}>
            <SendIcon className="size-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoleplaySession;
