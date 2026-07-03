import React from 'react';
import { PlaneIcon, CoffeeIcon, BriefcaseIcon, HeartIcon, ShoppingCartIcon, StethoscopeIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

export const scenarios = [
  { id: 1, title: "Airport Immigration", icon: PlaneIcon, difficulty: "Beginner", description: "Answer standard customs questions.", color: "text-blue-500", bg: "bg-blue-500/10", border: "hover:border-blue-500", systemPrompt: "Scenario Started: Airport Immigration. You are handing over your passport to the officer.", firstMessage: "Good morning. Passport and customs declaration form, please.", persona: "Officer Persona" },
  { id: 2, title: "Ordering Coffee", icon: CoffeeIcon, difficulty: "Beginner", description: "Order a drink and a pastry.", color: "text-amber-600", bg: "bg-amber-600/10", border: "hover:border-amber-600", systemPrompt: "Scenario Started: Ordering Coffee. You are at a busy cafe.", firstMessage: "Hi there! What can I get for you today?", persona: "Barista Persona" },
  { id: 3, title: "Tech Interview", icon: BriefcaseIcon, difficulty: "Advanced", description: "Explain your past experience.", color: "text-purple-500", bg: "bg-purple-500/10", border: "hover:border-purple-500", systemPrompt: "Scenario Started: Tech Interview. You are speaking with the lead engineer.", firstMessage: "Thanks for coming in. Can you walk me through a complex technical challenge you've solved?", persona: "Interviewer Persona" },
  { id: 4, title: "First Date", icon: HeartIcon, difficulty: "Intermediate", description: "Make small talk at a restaurant.", color: "text-rose-500", bg: "bg-rose-500/10", border: "hover:border-rose-500", systemPrompt: "Scenario Started: First Date. You just sat down at the table.", firstMessage: "This place looks nice! Have you been here before?", persona: "Date Persona" },
  { id: 5, title: "Buying Clothes", icon: ShoppingCartIcon, difficulty: "Beginner", description: "Ask for a different size.", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "hover:border-emerald-500", systemPrompt: "Scenario Started: Retail Store. You are in the fitting room area.", firstMessage: "Did everything work out for you, or do you need a different size?", persona: "Clerk Persona" },
  { id: 6, title: "Doctor Visit", icon: StethoscopeIcon, difficulty: "Intermediate", description: "Describe your symptoms.", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "hover:border-cyan-500", systemPrompt: "Scenario Started: Doctor's Office. The doctor enters the room.", firstMessage: "Hello. I see you're here for some stomach pain. When did it start?", persona: "Doctor Persona" },
];

const RoleplayHub = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      <div className="text-center mb-10 mt-6">
        <h1 className="text-4xl font-bold font-mono tracking-tight mb-3">Immersive Roleplay</h1>
        <p className="text-base-content/70 max-w-2xl mx-auto">
          Practice real-world situations with our AI personas. They will adapt to your level and stay completely in character.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <div 
              key={scenario.id} 
              onClick={() => navigate(`/roleplay/${scenario.id}`)}
              className={`bg-base-100 rounded-3xl p-6 shadow-sm border-2 border-transparent ${scenario.border} transition-all cursor-pointer group`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-4 rounded-2xl ${scenario.bg}`}>
                  <Icon className={`size-8 ${scenario.color}`} />
                </div>
                <span className={`badge ${scenario.difficulty === 'Beginner' ? 'badge-success' : scenario.difficulty === 'Intermediate' ? 'badge-warning' : 'badge-error'} badge-sm`}>
                  {scenario.difficulty}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{scenario.title}</h3>
              <p className="text-base-content/70 text-sm mb-6">{scenario.description}</p>
              
              <button className="btn btn-outline btn-sm w-full group-hover:bg-primary group-hover:text-primary-content group-hover:border-primary transition-all">
                Start Scenario
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoleplayHub;
