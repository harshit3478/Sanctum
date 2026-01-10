
export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type EmotionalWeight = 'crushing' | 'heavy' | 'medium' | 'light';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'ignored';

export interface Task {
  id: string;
  title: string;
  context: string;
  weight: EmotionalWeight;
  status: TaskStatus;
  createdAt: number;
  progress: number; // 0 to 100
  deadline?: number; // Timestamp
  lastProgressUpdate?: number; // Timestamp
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  mood: string;
  mood_score: number; // 1-10 scale
  integrity_snapshot: number; // 0-100 score at time of entry
  summary: string;
}

export interface MemoryEntry {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
}

export type LiveStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ProfileAnalysis {
  archetype: string; 
  core_drive: string; 
  current_state: string; 
  summary: string; 
}

export interface UserPreferences {
    journal_mode: 'auto_morning' | 'manual_evening';
    theme: 'obsidian' | 'nebula' | 'dawn';
}

export interface UserProfile {
  id: string;
  display_name: string;
  directive: string;
  fatal_flaw: 'procrastination' | 'anxiety' | 'perfectionism' | 'distraction';
  api_key_encrypted?: string;
  analysis?: ProfileAnalysis;
  preferences?: UserPreferences;
}