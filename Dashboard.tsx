
import React, { useState } from 'react';
import { Task, UserProfile, JournalEntry } from './types';
import { TaskCard } from './TaskCard';

interface DashboardProps {
    tasks: Task[];
    integrityScore: number;
    showMobile: boolean;
    onCloseMobile: () => void;
    onRequestTaskUpdate: (task: Task) => void;
    profile: UserProfile | null;
    journals: JournalEntry[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    tasks, 
    integrityScore, 
    showMobile, 
    onCloseMobile, 
    onRequestTaskUpdate,
    profile,
    journals
}) => {
    const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);

    // Calendar Logic
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Generate calendar days
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEntry = journals.find(j => j.date === dateStr);
        return { day, dateStr, entry: hasEntry };
    });

    return (
        <div className={`fixed inset-0 z-20 md:static md:w-[400px] md:border-l md:border-current md:border-opacity-10 bg-inherit flex flex-col transition-transform duration-300 ${showMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
            <div className="p-6 border-b border-current border-opacity-10 flex justify-between items-start">
                <div>
                    <h2 className="text-sm font-mono opacity-50 uppercase tracking-widest mb-1">Integrity Score</h2>
                    <div 
                        className={`text-5xl font-light transition-all duration-500 ${
                            integrityScore > 90 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 
                            integrityScore > 50 ? 'text-yellow-400' : 'text-red-500 animate-pulse'
                        }`}
                        title={integrityScore > 90 ? "You are a god among mortals." : "We need to talk."}
                    >
                        {integrityScore}
                    </div>
                </div>
                <button onClick={onCloseMobile} className="md:hidden opacity-50 hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            {/* Psycho Profile Section */}
            {profile?.analysis && !selectedJournal && (
                <div className="px-6 py-6 border-b border-current border-opacity-10 bg-current bg-opacity-[0.02]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <h2 className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Identity Matrix</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <span className="text-[10px] opacity-50 uppercase tracking-widest block mb-1">Archetype</span>
                            <p className="text-lg font-medium leading-none">{profile.analysis.archetype}</p>
                        </div>
                        <div className="pt-2 border-t border-current border-opacity-10">
                            <p className="text-xs opacity-60 italic">"{profile.analysis.summary}"</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Calendar / Journal Viewer */}
            <div className="px-6 py-6 border-b border-current border-opacity-10">
                 <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-mono opacity-50 uppercase tracking-widest">Journal</h2>
                    <span className="text-xs opacity-60 font-mono">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                </div>
                
                {selectedJournal ? (
                    <div className="bg-white/5 rounded-lg p-4 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-emerald-500 font-mono">{selectedJournal.date}</span>
                             <button onClick={() => setSelectedJournal(null)} className="text-xs opacity-50 hover:opacity-100">[CLOSE]</button>
                        </div>
                        <p className="text-sm opacity-80 italic mb-2">"{selectedJournal.mood}"</p>
                        <p className="text-sm opacity-70 leading-relaxed whitespace-pre-wrap">{selectedJournal.content}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((d) => (
                            <button 
                                key={d.day} 
                                onClick={() => d.entry && setSelectedJournal(d.entry)}
                                disabled={!d.entry}
                                className={`
                                    aspect-square rounded flex items-center justify-center text-[10px] font-mono transition-all
                                    ${d.entry 
                                        ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 cursor-pointer' 
                                        : 'bg-transparent opacity-30 cursor-default'
                                    }
                                    ${d.day === today.getDate() ? 'ring-1 ring-current' : ''}
                                `}
                            >
                                {d.day}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
                <h2 className="text-xs font-mono opacity-50 uppercase tracking-widest mb-4">Board of Regret</h2>
                {tasks.length === 0 ? (
                    <div className="text-center py-10 opacity-30">
                        <div className="w-12 h-12 border-2 border-dashed border-current rounded-full mx-auto mb-3"></div>
                        <p className="text-sm">Inbox zero, {profile?.display_name || 'human'}?</p>
                        <p className="text-xs mt-1">Or did you just forget everything?</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskCard key={task.id} task={task} onRequestUpdate={onRequestTaskUpdate} />
                    ))
                )}
            </div>
            
            <div className="p-4 border-t border-current border-opacity-10 bg-current bg-opacity-[0.02] text-center">
                <p className="text-[10px] opacity-50 font-mono">
                    LOCKED BY SANCTUM PROTOCOL
                </p>
            </div>
        </div>
    );
};
