
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { generateEmbedding } from './memory'; // We still keep the helper to generate, but not the local cosine math

export function useMemory(apiKey: string | undefined, userId: string | undefined) {
    
    // Add a new memory (Generate embedding -> Store in Supabase)
    const addMemory = async (text: string) => {
        if (!apiKey || !userId) return;

        // 1. Generate Embedding
        const embedding = await generateEmbedding(text, apiKey);
        if (!embedding) return;

        // 2. Store in DB
        const { error } = await supabase.from('memories').insert({
            user_id: userId,
            content: text,
            embedding: embedding
        });

        if (error) console.error("Failed to save memory:", error);
    };

    // Retrieve relevant context string for RAG using Supabase pgvector
    const retrieveContext = async (query: string): Promise<string> => {
        if (!apiKey || !userId) return "";
        
        // 1. Generate embedding for current query
        const queryEmbedding = await generateEmbedding(query, apiKey);
        if (!queryEmbedding) return "";

        // 2. Call Supabase RPC function 'match_memories'
        const { data: memories, error } = await supabase.rpc('match_memories', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // Sensitivity
            match_count: 5 // Top K
        });

        if (error) {
            console.error("Vector search failed:", error);
            return "";
        }

        if (!memories || memories.length === 0) return "";

        const contextString = memories.map((m: any) => {
            return `- "${m.content}"`; // Note: RPC returns content, similarity
        }).join("\n");

        return `\n\n[Relevant Past Journal Entries]:\n${contextString}\n[End Memory Context]\n\n`;
    };

    const clearMemories = async () => {
        if (!userId) return;
        await supabase.from('memories').delete().eq('user_id', userId);
    };

    return {
        addMemory,
        retrieveContext,
        clearMemories
    };
}
