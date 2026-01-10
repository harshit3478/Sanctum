
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile } from './types';

interface OnboardingWizardProps {
    userId: string;
    onComplete: (profile: UserProfile) => void;
}

const STEPS = [
    {
        id: 'name',
        q: "Identify yourself. What is your designator?",
        placeholder: "e.g. Neo, The Architect, Sarah"
    },
    {
        id: 'directive',
        q: "State your primary directive. What are you trying to achieve?",
        placeholder: "e.g. Build a startup, Survive medical school"
    },
    {
        id: 'flaw',
        q: "Analyze your failure patterns. What is your fatal flaw?",
        type: 'select',
        options: [
            { value: 'procrastination', label: 'Procrastination (I wait too long)' },
            { value: 'anxiety', label: 'Anxiety (I overthink everything)' },
            { value: 'perfectionism', label: 'Perfectionism (It is never good enough)' },
            { value: 'distraction', label: 'Distraction (Oh look, a squirrel)' },
        ]
    },
    {
        id: 'apikey',
        q: "Sanctum requires power. Submit your Gemini API Key.",
        sub: "Your key is encrypted. We do not pay for your tokens.",
        placeholder: "AIza..."
    }
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<any>({});
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [displayedQuestion, setDisplayedQuestion] = useState('');
    
    // Typewriter effect
    useEffect(() => {
        const question = STEPS[currentStep].q;
        setDisplayedQuestion('');
        setIsTyping(true);
        let i = 0;
        const timer = setInterval(() => {
            if (i < question.length) {
                setDisplayedQuestion(prev => prev + question.charAt(i));
                i++;
            } else {
                clearInterval(timer);
                setIsTyping(false);
            }
        }, 30);
        return () => clearInterval(timer);
    }, [currentStep]);

    const handleNext = async () => {
        const step = STEPS[currentStep];
        const value = inputValue;
        
        if (!value) return;

        const newAnswers = { ...answers, [step.id]: value };
        setAnswers(newAnswers);
        setInputValue('');

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            // FINISH
            await saveProfile(newAnswers);
        }
    };

    const saveProfile = async (finalAnswers: any) => {
        const profileData = {
            id: userId,
            display_name: finalAnswers.name,
            directive: finalAnswers.directive,
            fatal_flaw: finalAnswers.flaw,
            api_key_encrypted: finalAnswers.apikey // In a real app, encrypt this client-side first
        };

        const { error } = await supabase.from('profiles').insert(profileData);
        
        if (error) {
            console.error(error);
            alert("Database Error: " + error.message);
        } else {
            onComplete(profileData as UserProfile);
        }
    };

    const step = STEPS[currentStep];

    return (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-8 font-mono text-emerald-500">
            <div className="w-full max-w-2xl">
                <div className="mb-12 opacity-50 text-xs tracking-widest">
                    CALIBRATION SEQUENCE: {currentStep + 1}/{STEPS.length}
                </div>

                <h2 className="text-2xl md:text-3xl mb-8 leading-relaxed h-24">
                    {displayedQuestion}
                    {isTyping && <span className="animate-pulse">_</span>}
                </h2>

                {step.sub && <p className="text-sm text-slate-500 mb-6 -mt-4">{step.sub}</p>}

                {!isTyping && (
                    <div className="animate-fade-in-up">
                        {step.type === 'select' ? (
                            <div className="grid grid-cols-1 gap-4">
                                {step.options?.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            const newAnswers = { ...answers, [step.id]: opt.value };
                                            setAnswers(newAnswers);
                                            if (currentStep < STEPS.length - 1) {
                                                setCurrentStep(prev => prev + 1);
                                            } else {
                                                saveProfile(newAnswers);
                                            }
                                        }}
                                        className="text-left p-4 border border-emerald-900 hover:bg-emerald-900/20 hover:border-emerald-500 transition-all text-emerald-200"
                                    >
                                        [ {opt.value.toUpperCase()} ] <span className="text-slate-400 ml-2">{opt.label.split('(')[1].replace(')', '')}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                <input
                                    autoFocus
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleNext()}
                                    className="flex-1 bg-transparent border-b-2 border-emerald-900 py-2 text-xl focus:outline-none focus:border-emerald-500 text-white"
                                    placeholder={step.placeholder}
                                />
                                <button 
                                    onClick={handleNext}
                                    className="px-6 py-2 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
                                >
                                    ENTER
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
