
import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, UserPreferences } from './types';

interface SettingsProps {
    profile: UserProfile;
    onClose: () => void;
    onUpdateProfile: (p: UserProfile) => void;
}

export const Settings: React.FC<SettingsProps> = ({ profile, onClose, onUpdateProfile }) => {
    const [preferences, setPreferences] = useState<UserPreferences>(profile.preferences || { journal_mode: 'auto_morning', theme: 'obsidian' });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase.from('profiles').update({ preferences }).eq('id', profile.id);
        if (!error) {
            onUpdateProfile({ ...profile, preferences });
            onClose();
        } else {
            alert("Failed to save settings");
        }
        setSaving(false);
    };

    const themes = [
        { id: 'obsidian', name: 'Obsidian', desc: 'The Void. Default.', colors: 'bg-slate-950 border-slate-800' },
        { id: 'nebula', name: 'Nebula', desc: 'Vaporwave Dreams.', colors: 'bg-[#1a1638] border-indigo-900' },
        { id: 'dawn', name: 'Dawn', desc: 'Minimalist Light.', colors: 'bg-slate-100 border-slate-300' },
    ];

    return (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in-up">
            <div className={`w-full max-w-lg border p-8 rounded-2xl shadow-2xl ${
                preferences.theme === 'dawn' ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}>
                <div className="flex justify-between items-center mb-8 border-b pb-4 border-current opacity-50">
                    <h2 className="text-xl font-bold tracking-widest">SYSTEM CONFIG</h2>
                    <button onClick={onClose} className="text-xs hover:opacity-100 opacity-50">[ESC]</button>
                </div>

                <div className="space-y-8">
                    {/* Theme Preference */}
                    <div>
                        <h3 className="text-xs font-mono opacity-50 uppercase tracking-widest mb-4">Visual Theme</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {themes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setPreferences({ ...preferences, theme: t.id as any })}
                                    className={`p-3 rounded-lg border text-left transition-all ${
                                        preferences.theme === t.id 
                                        ? 'ring-2 ring-emerald-500 border-transparent' 
                                        : 'border-current opacity-40 hover:opacity-100'
                                    }`}
                                >
                                    <div className={`w-full h-8 rounded mb-2 ${t.colors}`}></div>
                                    <div className="font-bold text-xs">{t.name}</div>
                                    <div className="text-[10px] opacity-60 truncate">{t.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Journaling Preference */}
                    <div>
                        <h3 className="text-xs font-mono opacity-50 uppercase tracking-widest mb-4">Journaling Protocol</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <button 
                                onClick={() => setPreferences({ ...preferences, journal_mode: 'auto_morning' })}
                                className={`text-left p-4 border rounded-lg transition-all ${preferences.journal_mode === 'auto_morning' ? 'border-emerald-500 bg-emerald-500/10' : 'border-current opacity-40 hover:opacity-100'}`}
                            >
                                <div className="font-bold text-sm mb-1">Morning Briefing (Auto)</div>
                                <div className="text-xs opacity-70">Sanctum analyzes yesterday's events automatically when you first log in the next day.</div>
                            </button>
                            <button 
                                onClick={() => setPreferences({ ...preferences, journal_mode: 'manual_evening' })}
                                className={`text-left p-4 border rounded-lg transition-all ${preferences.journal_mode === 'manual_evening' ? 'border-emerald-500 bg-emerald-500/10' : 'border-current opacity-40 hover:opacity-100'}`}
                            >
                                <div className="font-bold text-sm mb-1">Evening Reflection (Manual)</div>
                                <div className="text-xs opacity-70">Adds a "Conclude Day" trigger. You decide when to close the loop on the current day.</div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-current opacity-100 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-bold tracking-widest uppercase disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Confirm Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
