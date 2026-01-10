
import React, { useState } from 'react';
import { supabase } from './supabaseClient';

interface LandingPageProps {
    onLoginSuccess: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
    const [view, setView] = useState<'landing' | 'login' | 'signup'>('landing');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (view === 'signup') {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                if (data.user && !data.session) {
                    alert("Verification link sent to your email. Confirm it to enter.");
                    setView('login');
                    setLoading(false);
                    return;
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (view === 'landing') {
        return (
            <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-emerald-500/30 overflow-hidden relative">
                {/* Background Core Animation */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] core-glow rounded-full blur-3xl pointer-events-none opacity-20"></div>
                
                <nav className="relative z-10 flex justify-between items-center p-8 max-w-7xl mx-auto">
                    <div className="text-xl font-bold tracking-tighter">SANCTUM</div>
                    <div className="flex gap-6 text-xs uppercase tracking-widest font-bold">
                        <button onClick={() => setView('login')} className="hover:text-emerald-400 transition-colors">Resume Session</button>
                    </div>
                </nav>

                <main className="relative z-10 flex flex-col items-center justify-center pt-20 pb-20 px-4 text-center">
                    <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-900/50 bg-emerald-950/20 text-[10px] uppercase tracking-widest text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        System Online
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-6">
                        YOUR SECOND <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-slate-200 to-slate-600">BRAIN HAS AN ATTITUDE.</span>
                    </h1>
                    
                    <p className="max-w-xl text-slate-400 text-lg leading-relaxed mb-12">
                        Stop treating your to-do list like a graveyard. Sanctum is an AI executive proxy that parses your venting into action and judges you when you slack off.
                    </p>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setView('signup')}
                            className="group relative px-8 py-4 bg-emerald-500 text-black font-bold text-sm tracking-widest uppercase hover:bg-emerald-400 transition-all overflow-hidden"
                        >
                            <span className="relative z-10 group-hover:hidden">Initialize Protocol</span>
                            <span className="relative z-10 hidden group-hover:inline">Ready to work?</span>
                        </button>
                        <button 
                            onClick={() => setView('login')}
                            className="px-8 py-4 border border-slate-800 text-slate-300 font-bold text-sm tracking-widest uppercase hover:bg-slate-800 transition-all"
                        >
                            Login
                        </button>
                    </div>
                </main>

                <section className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pb-20">
                    <FeatureCard 
                        title="The Ear" 
                        desc="Vent via voice. We turn your whining into structured tasks."
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                    />
                    <FeatureCard 
                        title="The Whip" 
                        desc="An integrity score that visibly drops when you procrastinate."
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    />
                    <FeatureCard 
                        title="The Memory" 
                        desc="We remember what you promised yesterday. No escaping context."
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                    />
                </section>

                <footer className="relative z-10 border-t border-slate-900 py-8 text-center">
                    <p className="text-xs text-slate-600 font-mono">MADE WITH ANXIETY AND COFFEE // SANCTUM V1.0</p>
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-900/10 rounded-full blur-3xl pointer-events-none"></div>
             
             <div className="w-full max-w-md relative z-10 border border-slate-800 bg-slate-950/80 backdrop-blur-xl p-8 shadow-2xl">
                <button onClick={() => setView('landing')} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className="text-2xl font-bold tracking-tighter text-white mb-2">
                    {view === 'login' ? 'WELCOME BACK, SLACKER.' : 'INITIATE PROTOCOL'}
                </h2>
                <p className="text-sm text-slate-500 mb-8">
                    {view === 'login' ? 'Your tasks missed you.' : 'Time to get your life together.'}
                </p>

                <form onSubmit={handleAuth} className="space-y-6">
                     {error && (
                        <div className="p-3 border border-red-900 bg-red-950/20 text-red-500 text-xs font-mono">
                            ERROR: {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-slate-500 font-bold">Identity</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 p-3 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-slate-500 font-bold">Cipher</label>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 p-3 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <button 
                        disabled={loading}
                        className="w-full py-4 bg-emerald-600 text-white font-bold text-xs tracking-widest uppercase hover:bg-emerald-500 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : view === 'login' ? 'Enter Sanctum' : 'Create Identity'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(null); }}
                        className="text-xs text-slate-500 hover:text-emerald-400 transition-colors underline decoration-dotted underline-offset-4"
                    >
                        {view === 'login' ? "New here? Create account" : "Already have an identity? Login"}
                    </button>
                </div>
             </div>
        </div>
    );
};

const FeatureCard = ({ title, desc, icon }: { title: string, desc: string, icon: React.ReactNode }) => (
    <div className="p-6 border border-slate-900 bg-slate-950/50 hover:border-emerald-900/50 transition-colors group">
        <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-slate-400 mb-4 group-hover:text-emerald-400 group-hover:bg-emerald-950/30 transition-colors">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-200 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
            {desc}
        </p>
    </div>
);
