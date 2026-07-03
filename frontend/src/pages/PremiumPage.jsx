import React from 'react';
import { SparklesIcon, CheckCircle2Icon, ZapIcon, CrownIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

const PremiumPage = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      id: 'free',
      name: 'Basic Learner',
      price: '$0',
      period: 'forever',
      description: 'Essential tools to get started on your language journey.',
      features: [
        'Basic Flashcards & Spaced Repetition',
        'Standard Community Decks',
        '10 AI Grammar Checks per day',
        'Basic Learner Profile'
      ],
      buttonText: 'Current Plan',
      buttonClass: 'btn-outline',
      icon: <CheckCircle2Icon className="size-6 text-base-content/50" />
    },
    {
      id: 'premium',
      name: 'Duffy Premium',
      price: '$9.99',
      period: 'per month',
      description: 'Supercharge your learning with advanced AI capabilities.',
      features: [
        'Unlimited AI Grammar & Translation',
        '5 AI Roleplay Scenarios per day',
        'Basic Voice Analysis',
        'Ad-free experience',
        'Priority Matchmaking in chat'
      ],
      buttonText: 'Upgrade to Premium',
      buttonClass: 'btn-primary',
      icon: <SparklesIcon className="size-6 text-primary" />,
      popular: true
    },
    {
      id: 'pro',
      name: 'Duffy Pro',
      price: '$19.99',
      period: 'per month',
      description: 'The ultimate immersive experience for serious polyglots.',
      features: [
        'Unlimited AI Roleplay Scenarios',
        'Deepgram Advanced Voice Analysis',
        'Custom Persona Creation',
        'Early access to new features',
        'Export progress to PDF/CSV'
      ],
      buttonText: 'Get Pro',
      buttonClass: 'btn-secondary',
      icon: <CrownIcon className="size-6 text-secondary" />
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      <div className="text-center mb-16 mt-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm mb-4">
          <SparklesIcon className="size-4" /> 
          Unlock Your Full Potential
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tight mb-4">
          Learn faster with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Duffy AI</span>
        </h1>
        <p className="text-base-content/70 max-w-2xl mx-auto text-lg">
          Choose the plan that fits your learning style. Upgrade or downgrade at any time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {tiers.map((tier) => (
          <div 
            key={tier.id} 
            className={`bg-base-100 rounded-3xl p-8 shadow-sm border-2 transition-all relative ${
              tier.popular ? 'border-primary shadow-xl scale-105 z-10' : 'border-base-200 hover:border-base-300'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-content text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-base-200`}>
                {tier.icon}
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
            <p className="text-base-content/70 text-sm mb-6 h-10">{tier.description}</p>
            
            <div className="mb-8">
              <span className="text-4xl font-bold font-mono">{tier.price}</span>
              <span className="text-base-content/50 ml-1">/{tier.period}</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2Icon className="size-5 text-success shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className={`btn w-full ${tier.buttonClass}`}>
              {tier.popular && <ZapIcon className="size-4 mr-1" />}
              {tier.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PremiumPage;
