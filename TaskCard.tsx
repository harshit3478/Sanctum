
import React from 'react';
import { Task } from './types';

interface TaskCardProps {
    task: Task;
    onRequestUpdate: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onRequestUpdate }) => {
    const progress = task.progress || 0;
    
    // Calculate urgency based on deadline
    const getDeadlineStatus = () => {
        if (!task.deadline) return null;
        const now = Date.now();
        const diff = task.deadline - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        if (diff < 0) return { text: "OVERDUE", color: "text-red-500 animate-pulse" };
        if (days <= 2) return { text: "CRITICAL", color: "text-orange-500" };
        return { text: `${days} DAYS LEFT`, color: "text-slate-500" };
    };

    const deadlineInfo = getDeadlineStatus();

    // Border Colors
    const borderColors = {
        crushing: 'border-red-500/50',
        heavy: 'border-orange-500/50',
        medium: 'border-yellow-500/50',
        light: 'border-emerald-500/50'
    };

    const getBackgroundStyle = () => {
        let color = 'rgba(16, 185, 129, 0.1)'; 
        if (task.weight === 'crushing') color = 'rgba(239, 68, 68, 0.15)';
        if (task.weight === 'heavy') color = 'rgba(249, 115, 22, 0.15)';

        return {
            background: `linear-gradient(90deg, ${color} ${progress}%, rgba(15, 23, 42, 0.6) ${progress}%)`
        };
    };

    return (
        <div 
            onClick={() => onRequestUpdate(task)}
            className={`cursor-pointer p-4 rounded-xl border ${borderColors[task.weight]} mb-3 transition-all hover:scale-[1.01] hover:bg-slate-900/50 group relative overflow-hidden select-none`}
            style={getBackgroundStyle()}
            title="Click to discuss this task with Sanctum"
        >
            {/* Progress Bar Glow Line */}
            <div 
                className="absolute bottom-0 left-0 h-1 bg-current opacity-50 transition-all duration-1000"
                style={{ width: `${progress}%`, color: task.weight === 'crushing' ? '#ef4444' : '#10b981' }}
            />

            <div className="flex justify-between items-start z-10 relative">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold tracking-widest uppercase opacity-80 ${task.weight === 'crushing' ? 'text-red-400' : 'text-slate-400'}`}>
                            {task.weight} • {progress}%
                        </span>
                        {deadlineInfo && (
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${deadlineInfo.color}`}>
                                • {deadlineInfo.text}
                            </span>
                        )}
                    </div>
                    
                    <p className="font-medium text-lg leading-tight text-slate-200">{task.title}</p>
                    {task.context && <p className="mt-2 text-xs opacity-60 italic text-slate-400 line-clamp-2">"{task.context}"</p>}
                </div>

                <div className="flex flex-col items-center justify-center gap-1">
                    {/* Locked Status Indicator */}
                    <div className="w-8 h-8 rounded-full border border-slate-800 bg-black/40 flex items-center justify-center">
                        {progress >= 100 ? (
                            <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
