
import { GoogleGenAI } from "@google/genai";
import { MemoryEntry } from "./types";

// Calculate Cosine Similarity between two vectors
// Returns a value between -1 and 1 (1 being identical)
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
}

// Generate an embedding for a text string using Gemini
export async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Use text-embedding-004 for high performance and low cost
        const response = await ai.models.embedContent({
            model: "text-embedding-004",
            contents: [{ parts: [{ text }] }]
        });
        
        return response.embeddings?.[0]?.values || null;
    } catch (error) {
        console.error("Embedding generation failed:", error);
        return null;
    }
}

// Find the most relevant memories for a given query text
export async function findRelevantMemories(
    queryText: string,
    memories: MemoryEntry[],
    apiKey: string,
    topK: number = 3
): Promise<MemoryEntry[]> {
    if (memories.length === 0) return [];

    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText, apiKey);
    if (!queryEmbedding) return [];

    // 2. Calculate similarity for all memories
    const scoredMemories = memories.map(memory => ({
        memory,
        score: cosineSimilarity(queryEmbedding, memory.embedding)
    }));

    // 3. Sort by score (descending) and take top K
    scoredMemories.sort((a, b) => b.score - a.score);

    // Filter out low relevance if needed (e.g., score < 0.4)
    return scoredMemories.slice(0, topK).map(item => item.memory);
}
