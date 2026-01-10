
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { supabase, isSupabaseConfigured } from './supabaseClient';

import { Message, Task, UserProfile, JournalEntry } from './types';
import { getSystemInstruction, TOOLS } from './constants';
import { Dashboard } from './Dashboard';
import { ChatInterface } from './ChatInterface';
import { LiveOverlay } from './LiveOverlay';
import { LandingPage } from './LandingPage';
import { OnboardingWizard } from './OnboardingWizard';
import { Analytics } from './Analytics';
import { Settings } from './Settings';
import { useLiveSession } from './useLiveSession';
import { useMemory } from './useMemory';

type ViewState = 'chat' | 'analytics' | 'settings';

const LOADING_MESSAGES = [
    "Judging your past choices...",
    "Summoning the cyber-demons...",
    "Calculating your integrity score...",
    "Pretending to care...",
    "Loading your procrastination profile...",
    "Calibration of sass module..."
];

export default function App() {
  if (!isSupabaseConfigured) {
    return <div className="flex h-screen bg-black text-red-500 font-mono items-center justify-center p-8 text-center">Config Missing.</div>;
  }

  // --- State ---
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [systemError, setSystemError] = useState<{title: string, message: string, sql?: boolean} | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [showMobileDashboard, setShowMobileDashboard] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('chat');

  const [initialContextInjected, setInitialContextInjected] = useState(false);
  const chatInstanceRef = useRef<Chat | null>(null);

  const apiKey = profile?.api_key_encrypted || process.env.API_KEY; 

  // --- Theme Engine ---
  const getThemeClasses = () => {
      const theme = profile?.preferences?.theme || 'obsidian';
      if (theme === 'nebula') return "bg-[#0f0c29] bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-indigo-100";
      if (theme === 'dawn') return "bg-slate-50 text-slate-900";
      return "bg-slate-950 text-slate-200"; // Obsidian Default
  };

  // --- Initialization ---
  useEffect(() => {
    // Cycle loading messages
    const interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 2000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) fetchProfileAndData(session.user.id);
      else setLoading(false);
    }).catch(err => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) fetchProfileAndData(session.user.id);
      else {
          setProfile(null);
          setMessages([]);
          setTasks([]);
          setJournals([]);
          setLoading(false);
      }
    });
    return () => {
        subscription.unsubscribe();
        clearInterval(interval);
    };
  }, []);

  const fetchProfileAndData = async (userId: string) => {
      if (!userId) return;
      setLoading(true);
      setSystemError(null);
      
      try {
          const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
          if (profileError) {
              if (profileError.code === 'PGRST116') { setNeedsOnboarding(true); setLoading(false); return; } 
              else if (profileError.code === '42P01' || profileError.code === '42703') { 
                  setSystemError({ title: "DATABASE UPDATE REQUIRED", message: "Sanctum requires new columns for Phase 6.", sql: true });
                  setLoading(false);
                  return;
              } else throw profileError;
          }
          setProfile(profileData as UserProfile);

          const { data: taskData } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          if (taskData) {
              setTasks(taskData.map(t => ({
                  id: t.id,
                  title: t.title,
                  context: t.context,
                  weight: t.weight as any,
                  status: t.status as any,
                  createdAt: new Date(t.created_at).getTime(),
                  progress: t.progress || 0,
                  deadline: t.deadline ? new Date(t.deadline).getTime() : undefined,
                  lastProgressUpdate: t.last_progress_update ? new Date(t.last_progress_update).getTime() : undefined
              })));
          }

          const { data: journalData } = await supabase.from('journals').select('*').eq('user_id', userId).order('date', { ascending: false });
          if (journalData) setJournals(journalData);

          const { data: chatData } = await supabase.from('chats').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(50);
          if (chatData) {
              setMessages(chatData.map(c => ({ role: c.role, text: c.text, timestamp: new Date(c.created_at).getTime() })));
          }

      } catch (err: any) {
          console.error("Data Fetch Error:", err);
          setSystemError({ title: "SYSTEM FAILURE", message: err.message, sql: false });
      } finally {
          setLoading(false);
      }
  };

  const { addMemory, retrieveContext, clearMemories } = useMemory(apiKey, profile?.id);

  // --- Integrity Logic ---
  useEffect(() => {
      const now = Date.now();
      let penalty = 0;
      tasks.forEach(t => {
          if (t.status !== 'completed') {
              penalty += 2; 
              if (t.deadline && t.deadline < now) penalty += 10;
          }
      });
      setIntegrityScore(Math.max(0, 100 - penalty));
  }, [tasks]);

  // --- Tool Handlers ---
  const handleCreateTask = async (args: any) => {
      if (!profile) return { result: "Error: No user" };
      const newTask = {
          user_id: profile.id,
          title: args.title,
          context: args.emotional_context || "Identified by Sanctum",
          weight: args.weight || 'medium',
          status: 'pending',
          progress: args.initial_progress || 0,
          deadline: args.deadline || null
      };
      const { data, error } = await supabase.from('tasks').insert(newTask).select().single();
      if (error) return { result: "Failed to create task." };
      if (data) {
          setTasks(prev => [{
              id: data.id,
              title: data.title,
              context: data.context,
              weight: data.weight,
              status: data.status,
              createdAt: new Date(data.created_at).getTime(),
              progress: data.progress,
              deadline: data.deadline ? new Date(data.deadline).getTime() : undefined
          }, ...prev]);
      }
      return { result: `Task "${args.title}" created.` };
  };

  const handleUpdateTask = async (args: any) => {
      if (!profile) return { result: "Error: No user" };
      const updates: any = { last_progress_update: new Date().toISOString() };
      if (args.progress !== undefined) {
          updates.progress = args.progress;
          if (args.progress >= 100) updates.status = 'completed';
      }
      if (args.title) updates.title = args.title;
      if (args.weight) updates.weight = args.weight;
      if (args.deadline) updates.deadline = args.deadline;

      const { error } = await supabase.from('tasks').update(updates).eq('id', args.id);
      if (error) return { result: "Failed to update task." };

      setTasks(prev => prev.map(t => {
          if (t.id === args.id) {
              return { ...t, ...updates, status: updates.status || t.status, deadline: updates.deadline ? new Date(updates.deadline).getTime() : t.deadline };
          }
          return t;
      }));
      return { result: `Task updated. Comment: ${args.comment || 'Changes applied.'}` };
  };

  const handleDeleteTask = async (args: any) => {
      if (!profile) return { result: "Error: No user" };
      const { error } = await supabase.from('tasks').delete().eq('id', args.id);
      if (error) return { result: "Failed to delete task." };
      setTasks(prev => prev.filter(t => t.id !== args.id));
      return { result: `Task deleted. Reason: ${args.reason}` };
  };

  const handleUpdateProfile = async (args: any) => {
      if (!profile) return { result: "Error: No user" };
      const analysis = { archetype: args.archetype, core_drive: args.core_drive, current_state: args.current_state, summary: args.summary };
      const { error } = await supabase.from('profiles').update({ analysis }).eq('id', profile.id);
      if (error) return { result: "Failed to update profile." };
      setProfile(prev => prev ? ({ ...prev, analysis }) : null);
      return { result: "Profile Analysis Updated." };
  };

  const handleWriteJournal = async (args: any) => {
      if (!profile) return { result: "Error: No user" };
      
      const payload = {
          user_id: profile.id,
          date: args.date,
          content: args.content,
          mood: args.mood,
          summary: args.summary,
          mood_score: args.mood_score,
          integrity_snapshot: integrityScore
      };

      const { error } = await supabase.from('journals').upsert(payload, { onConflict: 'user_id, date' });

      if (error) return { result: "Failed to write journal." };
      
      const { data } = await supabase.from('journals').select('*').eq('user_id', profile.id).order('date', { ascending: false });
      if (data) setJournals(data);
      
      return { result: `Journal entry recorded for ${args.date}. Score: ${args.mood_score}/10.` };
  };

  const handleToolCall = async (toolName: string, args: any) => {
      if (toolName === 'createTask') return await handleCreateTask(args);
      if (toolName === 'updateTask') return await handleUpdateTask(args);
      if (toolName === 'deleteTask') return await handleDeleteTask(args);
      if (toolName === 'updateProfileAnalysis') return await handleUpdateProfile(args);
      if (toolName === 'writeJournalEntry') return await handleWriteJournal(args);
      return { result: "Unknown tool" };
  };

  const { isLiveMode, liveStatus, volumeLevel, startLiveSession, stopLiveSession } = useLiveSession(apiKey, handleToolCall, journals);

  // --- Chat Logic ---
  const handleSendText = async (userText: string) => {
    if (!chatInstanceRef.current || !profile) return;
    await supabase.from('chats').insert({ user_id: profile.id, role: 'user', text: userText });

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeString = now.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' });
    const todayJournal = journals.find(j => j.date === dateStr);
    
    const contextHeader = `
[SYSTEM CONTEXT]
Date: ${dateStr} (${timeString})
User: ${profile.display_name}
[JOURNAL]: ${todayJournal ? "Entry exists." : "No entry."}
[TASKS]: ${tasks.length} active.
[INTEGRITY]: ${integrityScore}
    `;

    setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }]);
    setIsThinking(true);

    try {
      const memoryContext = await retrieveContext(userText);
      const fullPrompt = `${contextHeader}\n${memoryContext}\nUser Input: ${userText}`;
      
      let currentResult = await chatInstanceRef.current.sendMessageStream({ message: fullPrompt });
      let fullResponseText = "";
      setMessages(prev => [...prev, { role: 'model', text: "", timestamp: Date.now() }]);
      
      while (true) {
        let functionCallFound = null;
        for await (const chunk of currentResult) {
            if (chunk.text) {
                fullResponseText += chunk.text;
                setMessages(prev => {
                    const newArr = [...prev];
                    newArr[newArr.length - 1].text = fullResponseText;
                    return newArr;
                });
            }
            const fc = chunk.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
            if (fc?.functionCall) functionCallFound = fc.functionCall;
        }

        if (functionCallFound) {
            let result = { result: "Executed" }; 
            result = await handleToolCall(functionCallFound.name, functionCallFound.args);
            currentResult = await chatInstanceRef.current.sendMessageStream({
                message: [{ functionResponse: { name: functionCallFound.name, response: result } }]
            });
        } else {
            break; 
        }
      }
      
      if (fullResponseText) await supabase.from('chats').insert({ user_id: profile.id, role: 'model', text: fullResponseText });
      addMemory(userText); 
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "[System: Connection interrupted. My brain hurts.]", timestamp: Date.now() }]);
    } finally {
      setIsThinking(false);
    }
  };

  // --- Initial Context Injection ---
  useEffect(() => {
    if (!apiKey || !profile) return;
    const ai = new GoogleGenAI({ apiKey });
    const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    
    chatInstanceRef.current = ai.chats.create({
       model: 'gemini-3-flash-preview',
       config: { systemInstruction: getSystemInstruction(profile || undefined), tools: TOOLS },
       history: history
    });

    if (!initialContextInjected) {
        const mode = profile.preferences?.journal_mode || 'auto_morning';
        const lastMsgTime = messages.length > 0 ? messages[messages.length-1].timestamp : 0;
        const hoursSinceLast = (Date.now() - lastMsgTime) / (1000 * 60 * 60);

        if (mode === 'auto_morning' && hoursSinceLast > 6) {
             const yStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
             const yJournal = journals.find(j => j.date === yStr);
             if (yJournal) {
                 chatInstanceRef.current.sendMessage({ message: `[SYSTEM]: New session. Yesterday's Summary: ${yJournal.summary}` });
             }
        }
        setInitialContextInjected(true);
    }
  }, [apiKey, profile, messages.length === 0]); 

  // --- Render ---
  if (loading) return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-emerald-500 font-mono">
          <div className="w-16 h-16 rounded-full border-4 border-t-emerald-500 border-emerald-900 animate-spin mb-8"></div>
          <div className="animate-pulse tracking-widest text-xs uppercase">{loadingMsg}</div>
      </div>
  );

  if (systemError) return <div className="p-8 text-red-500 bg-black h-screen font-mono whitespace-pre-wrap">{systemError.title + "\n\n" + systemError.message + (systemError.sql ? "\n\nSQL NEEDED:\n" + `
alter table journals add column if not exists mood_score integer, add column if not exists integrity_snapshot integer;
alter table profiles add column if not exists preferences jsonb default '{"journal_mode": "auto_morning", "theme": "obsidian"}';
` : "")}</div>;
  
  if (!session) return <LandingPage onLoginSuccess={() => {}} />;
  if (needsOnboarding && session) return <OnboardingWizard userId={session.user.id} onComplete={(p) => { setProfile(p); setNeedsOnboarding(false); }} />;

  return (
    <div className={`flex h-screen font-sans overflow-hidden relative transition-colors duration-500 ${getThemeClasses()}`}>
      {isLiveMode && <LiveOverlay status={liveStatus} volumeLevel={volumeLevel} onStop={stopLiveSession} />}
      
      <div className={`flex flex-col flex-1 h-full ${showMobileDashboard ? 'hidden md:flex' : 'flex'}`}>
          {/* Header Navigation Override */}
          <div className="absolute top-4 right-4 z-20 flex gap-2">
              <button 
                  onClick={() => setCurrentView('analytics')} 
                  className="p-2 bg-slate-900/50 backdrop-blur rounded-full hover:bg-slate-800 text-slate-300 border border-slate-700/50 shadow-lg transition-all" 
                  title="Analytics"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
              </button>
              <button 
                  onClick={() => setCurrentView('settings')} 
                  className="p-2 bg-slate-900/50 backdrop-blur rounded-full hover:bg-slate-800 text-slate-300 border border-slate-700/50 shadow-lg transition-all" 
                  title="Settings"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </button>
          </div>

          <ChatInterface 
              messages={messages}
              isThinking={isThinking}
              onSendMessage={handleSendText}
              onStartLive={startLiveSession}
              onClearHistory={() => {}}
              onToggleMobileDashboard={() => setShowMobileDashboard(true)}
              pendingTasksCount={tasks.filter(t => t.status === 'pending').length}
              userName={profile?.display_name || "User"}
          />

          {/* Manual Journal Trigger (Conditional) */}
          {profile?.preferences?.journal_mode === 'manual_evening' && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                  <button 
                      onClick={() => handleSendText("I am ready to conclude the day. Write my journal entry.")}
                      className="px-4 py-2 bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 rounded-full text-xs uppercase tracking-widest hover:bg-indigo-900 transition-all backdrop-blur"
                  >
                      Conclude Day
                  </button>
              </div>
          )}
      </div>

      <Dashboard 
          tasks={tasks}
          integrityScore={integrityScore}
          showMobile={showMobileDashboard}
          onCloseMobile={() => setShowMobileDashboard(false)}
          onRequestTaskUpdate={() => handleSendText("I want to update a task.")}
          profile={profile}
          journals={journals}
      />

      {currentView === 'analytics' && profile && (
          <Analytics journals={journals} profile={profile} onClose={() => setCurrentView('chat')} />
      )}
      
      {currentView === 'settings' && profile && (
          <Settings profile={profile} onClose={() => setCurrentView('chat')} onUpdateProfile={setProfile} />
      )}
    </div>
  );
}
