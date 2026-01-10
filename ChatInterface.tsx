
import React, { useRef, useEffect, useState } from 'react';
import { Message, Task } from './types';

interface ChatInterfaceProps {
    messages: Message[];
    isThinking: boolean;
    onSendMessage: (text: string) => void;
    onStartLive: () => void;
    onClearHistory: () => void;
    onToggleMobileDashboard: () => void;
    pendingTasksCount: number;
    userName: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
    messages,
    isThinking,
    onSendMessage,
    onStartLive,
    onClearHistory,
    onToggleMobileDashboard,
    pendingTasksCount,
    userName
}) => {
    const [input, setInput] = useState('');
    const [isListeningLegacy, setIsListeningLegacy] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    // Legacy Dictation Logic
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsListeningLegacy(true);
            recognition.onend = () => setIsListeningLegacy(false);

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                if (finalTranscript) {
                    setInput(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
                }
            };
            recognitionRef.current = recognition;
        }
    }, []);

    const toggleLegacyListening = () => {
        if (!recognitionRef.current) return alert("Dictation not supported");
        isListeningLegacy ? recognitionRef.current.stop() : recognitionRef.current.start();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        if (!input.trim()) return;
        if (isListeningLegacy && recognitionRef.current) recognitionRef.current.stop();
        onSendMessage(input.trim());
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    return (
        <div className="flex flex-col flex-1 h-full transition-all duration-300">
            <header className="flex-none p-4 border-b border-current border-opacity-10 bg-inherit bg-opacity-90 backdrop-blur z-10 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-emerald-500">Sanctum</h1>
                    <p className="text-xs opacity-50 font-mono">HELLO, {userName.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onStartLive} className="p-2 rounded-full bg-white/5 hover:bg-emerald-500 hover:text-black transition-all ring-1 ring-emerald-500/30 text-emerald-500" title="Call Sanctum">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </button>
                    <button onClick={onToggleMobileDashboard} className="md:hidden p-2 opacity-70 relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                        {pendingTasksCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>}
                    </button>
                    <button onClick={onClearHistory} className="text-xs opacity-50 hover:text-red-500 transition-colors uppercase tracking-widest font-mono hidden sm:block">Burn Pages</button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                        <p className="text-sm italic">"I'm listening, {userName}. Unfortunately."</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col max-w-2xl ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        <div className={`px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-white/10 rounded-br-none' 
                            : 'bg-transparent border border-current border-opacity-10 rounded-bl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isThinking && <div className="opacity-50 text-xs animate-pulse ml-4">Judging you...</div>}
                <div ref={messagesEndRef} />
            </main>

            <footer className="flex-none p-4 border-t border-current border-opacity-10 bg-inherit">
                <div className="max-w-3xl mx-auto flex gap-2 items-end">
                    <button onClick={toggleLegacyListening} className={`p-3 rounded-xl transition-all ${isListeningLegacy ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-white/5 opacity-50 hover:opacity-100'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
                    </button>
                    <div className="flex-1 relative">
                        <textarea ref={textareaRef} rows={1} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }} onKeyDown={handleKeyDown} placeholder="Write to your second self..." className="w-full bg-white/5 border-none rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none overflow-hidden max-h-40 placeholder:opacity-30" />
                        <button onClick={handleSend} disabled={!input.trim() || isThinking} className="absolute right-2 bottom-2 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};
