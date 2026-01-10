
import { createClient } from '@supabase/supabase-js';

// Hardcoded configuration as requested
const supabaseUrl = 'https://gjvujzjwftidmatdyhvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdnVqemp3ZnRpZG1hdGR5aHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzcwNTIsImV4cCI6MjA4MzUxMzA1Mn0.bdrdoj24a6OS-UNN1lvIvcrOcwa3KUsZH6QWEbQq-RI';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
