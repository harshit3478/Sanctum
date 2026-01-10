
import React, { useState, useMemo } from 'react';
import { JournalEntry, UserProfile } from './types';
import { GoogleGenAI } from "@google/genai";

interface AnalyticsProps {
    journals: JournalEntry[];
    profile: UserProfile;
    onClose: () => void;
}

type TimeRange = 'week' | 'month' | 'year';

export const Analytics: React.FC<AnalyticsProps> = ({ journals, profile, onClose }) => {
    const [generating, setGenerating] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [range, setRange] = useState<TimeRange>('month');

    // Filter Logic
    const filteredJournals = useMemo(() => {
        const now = new Date();
        const sorted = [...journals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let cutoff = new Date();
        if (range === 'week') cutoff.setDate(now.getDate() - 7);
        if (range === 'month') cutoff.setMonth(now.getMonth() - 1);
        if (range === 'year') cutoff.setFullYear(now.getFullYear() - 1);
        
        return sorted.filter(j => new Date(j.date) >= cutoff);
    }, [journals, range]);

    // Chart Helpers
    const width = 600;
    const height = 200;
    const padding = 20;

    const dataPoints = filteredJournals.length > 0 ? filteredJournals : [];

    // Mood Line Path
    const getMoodPath = () => {
        if (dataPoints.length < 2) return "";
        const points = dataPoints.map((j, i) => {
            const x = padding + (i / (dataPoints.length - 1)) * (width - 2 * padding);
            const rawScore = j.mood_score || 5;
            const score = isNaN(rawScore) ? 5 : rawScore;
            const y = height - padding - (score / 10) * (height - 2 * padding);
            return `${x},${y}`;
        });
        return `M ${points.join(" L ")}`;
    };

    // Integrity Area Path
    const getIntegrityPath = () => {
        if (dataPoints.length < 2) return "";
        const points = dataPoints.map((j, i) => {
            const x = padding + (i / (dataPoints.length - 1)) * (width - 2 * padding);
            const rawScore = j.integrity_snapshot || 50;
            const score = isNaN(rawScore) ? 50 : rawScore;
            const y = height - padding - (score / 100) * (height - 2 * padding);
            return `${x},${y}`;
        });
        return `M ${points[0].split(',')[0]},${height-padding} L ${points.join(" L ")} L ${points[points.length-1].split(',')[0]},${height-padding} Z`;
    };

    const handleGenerateReport = async () => {
        setGenerating(true);
        const apiKey = profile.api_key_encrypted || process.env.API_KEY;
        if (!apiKey) return;

        const ai = new GoogleGenAI({ apiKey });
        const context = dataPoints.map(j => `[${j.date}] Mood: ${j.mood} (${j.mood_score}/10). Summary: ${j.summary}`).join('\n');
        const prompt = `
        Act as a Psychological Analyst. Analyze these journal entries from the user "${profile.display_name}" over the last ${range}.
        Provide a "State of the Union" report (max 200 words) covering:
        1. Emotional Trajectory.
        2. Hidden Patterns.
        3. Strategic Advice.
        
        DATA:
        ${context}
        `;

        try {
            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
            });
            setAiReport(result.text || "Analysis failed.");
        } catch (e) {
            console.error(e);
            setAiReport("Connection failed during analysis.");
        }
        setGenerating(false);
    };

    const moodPath = getMoodPath();
    const integrityPath = getIntegrityPath();

    // Stats
    const avgMood = dataPoints.length ? (dataPoints.reduce((acc, c) => acc + (c.mood_score || 0), 0) / dataPoints.length).toFixed(1) : '-';
    const avgIntegrity = dataPoints.length ? (dataPoints.reduce((acc, c) => acc + (c.integrity_snapshot || 0), 0) / dataPoints.length).toFixed(0) : '-';

    return (
        <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in-up overflow-hidden">
            <div className="w-full max-w-5xl h-full max-h-[90vh] border border-slate-800 bg-slate-900/90 p-8 rounded-2xl flex flex-col overflow-y-auto shadow-2xl">
                
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-widest text-slate-200">QUANTIFIED SELF</h2>
                        <p className="text-xs text-slate-500 font-mono mt-1">PERFORMANCE METRICS & PSYCHOLOGICAL ANALYSIS</p>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg">
                        {(['week', 'month', 'year'] as TimeRange[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${range === r ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-xs text-slate-300 rounded hover:bg-slate-700">CLOSE</button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                     <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-center">
                         <div className="text-xs text-slate-500 uppercase">Entries</div>
                         <div className="text-2xl font-light text-white">{dataPoints.length}</div>
                     </div>
                     <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-center">
                         <div className="text-xs text-slate-500 uppercase">Avg Mood</div>
                         <div className="text-2xl font-light text-indigo-400">{avgMood}<span className="text-xs opacity-50">/10</span></div>
                     </div>
                     <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-center">
                         <div className="text-xs text-slate-500 uppercase">Avg Integrity</div>
                         <div className="text-2xl font-light text-emerald-400">{avgIntegrity}<span className="text-xs opacity-50">%</span></div>
                     </div>
                     <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-center">
                         <div className="text-xs text-slate-500 uppercase">Velocity</div>
                         <div className="text-2xl font-light text-white">{dataPoints.length > 2 && (dataPoints[dataPoints.length-1].mood_score || 0) >= (dataPoints[0].mood_score || 0) ? '↑' : '↓'}</div>
                     </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Chart 1: Emotional Velocity */}
                    <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                        <h3 className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-4">Emotional Velocity (Mood)</h3>
                        {dataPoints.length > 1 ? (
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
                                <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#334155" strokeDasharray="4" />
                                <path d={moodPath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                {dataPoints.map((j, i) => {
                                    const x = padding + (i / (dataPoints.length - 1)) * (width - 2 * padding);
                                    const rawScore = j.mood_score || 5;
                                    const score = isNaN(rawScore) ? 5 : rawScore;
                                    const y = height - padding - (score / 10) * (height - 2 * padding);
                                    return <circle key={i} cx={x} cy={y} r="4" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />;
                                })}
                            </svg>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-slate-600 text-xs italic">Insufficient Data Points</div>
                        )}
                    </div>

                    {/* Chart 2: Integrity Trend */}
                    <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                        <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-4">Integrity Baseline</h3>
                        {dataPoints.length > 1 ? (
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
                                <defs>
                                    <linearGradient id="integrityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                                    </linearGradient>
                                </defs>
                                <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#334155" strokeDasharray="4" />
                                <path d={integrityPath} fill="url(#integrityGrad)" stroke="none" />
                                {integrityPath && <path d={integrityPath.replace('Z','').replace(/L [0-9.]+,180/g, '')} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
                            </svg>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-slate-600 text-xs italic">Insufficient Data Points</div>
                        )}
                    </div>
                </div>

                {/* AI Analysis Section */}
                <div className="flex-1 border-t border-slate-800 pt-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest">Psychological Analysis ({range})</h3>
                        <button 
                            onClick={handleGenerateReport} 
                            disabled={generating}
                            className="px-6 py-2 bg-indigo-900/30 text-indigo-400 border border-indigo-900 rounded hover:bg-indigo-900/50 transition-all text-xs font-bold uppercase disabled:opacity-50"
                        >
                            {generating ? "Analyzing..." : "Generate AI Report"}
                        </button>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-xl min-h-[150px] border border-slate-800/50">
                        {aiReport ? (
                            <p className="whitespace-pre-wrap leading-relaxed text-slate-300 font-serif text-lg">{aiReport}</p>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-30">
                                <div className="w-12 h-12 border-2 border-indigo-500/50 rounded-full mb-4"></div>
                                <p className="text-sm">Initiate analysis to generate report.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
