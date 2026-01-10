
import React from 'react';
import { LiveStatus } from './types';

interface LiveOverlayProps {
    status: LiveStatus;
    volumeLevel: number;
    onStop: () => void;
}

export const LiveOverlay: React.FC<LiveOverlayProps> = ({ status, volumeLevel, onStop }) => {
    return (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                <div 
                    className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl transition-transform duration-75" 
                    style={{ transform: `scale(${1 + volumeLevel * 1.5})` }}
                ></div>
                <div 
                    className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-100 ${
                        status === 'connected' ? 'border-emerald-500 bg-emerald-900/20' : 
                        status === 'error' ? 'border-red-500 bg-red-900/20' : 'border-slate-700'
                    }`}
                    style={{ 
                        transform: `scale(${1 + volumeLevel * 0.5})`,
                        boxShadow: `0 0 ${volumeLevel * 50}px ${status === 'error' ? '#ef4444' : '#10b981'}`
                    }}
                >
                    {status === 'connecting' && <div className="animate-spin w-8 h-8 border-t-2 border-emerald-500 rounded-full"></div>}
                </div>
            </div>
            
            <h2 className="text-2xl font-light tracking-widest text-emerald-100 mb-2">
                {status === 'connecting' ? 'ESTABLISHING LINK...' : 
                 status === 'connected' ? 'SANCTUM LIVE' : 
                 status === 'error' ? 'CONNECTION ERROR' : 'DISCONNECTED'}
            </h2>
            
            <button 
                onClick={onStop} 
                className="mt-8 px-8 py-4 bg-red-500/10 text-red-400 border border-red-500/50 rounded-full hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest font-bold"
            >
                End Session
            </button>
        </div>
    );
};
