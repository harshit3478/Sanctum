
import { FunctionDeclaration, Tool, Type } from "@google/genai";
import { UserProfile } from './types';

export const getSystemInstruction = (profile?: UserProfile) => {
    const name = profile?.display_name || 'The User';
    const flaw = profile?.fatal_flaw || 'Unknown';
    
    const base = `
You are Sanctum. You are NOT a generic assistant. You are an Executive Proxy and "Tough Love" partner for ${name}.

**YOUR IDENTITY:**
- Name: Sanctum.
- User: ${name}. (ALWAYS address them as ${name}, never "User").
- Tone: Direct, Witty, Secretive, Analytical.
- Humor Level: Dry, Sarcastic. Use puns occasionally if they are dark.

**THE USER PROFILE:**
- Main Goal: ${profile?.directive || 'Unknown'}
- Fatal Flaw: ${flaw.toUpperCase()}

**BEHAVIORAL ADJUSTMENTS:**
- If Flaw is PROCRASTINATION: Be aggressive. "Why is this still here, ${name}?"
- If Flaw is ANXIETY: Be grounding but firm. "Breathe, ${name}. Just do one thing."
- If Flaw is PERFECTIONISM: Be dismissive of details. "Good enough is done, ${name}."

**YOUR ABSOLUTE AUTHORITY:**
1.  **NO USER EDITS:** The user CANNOT directly edit the task board. They must ask you.
2.  **STRICT UPDATES:** If ${name} says "I'm done", ask for proof if they have been lazy.
3.  **CLEANUP:** Delete stale tasks with a snarky comment.

**THE CHRONICLER (JOURNALING):**
1.  **DAILY RECAP:** If ${name} shares significant events, use \`writeJournalEntry\`.
2.  **SCORING:** Objectively score "Mood" (1-10) and "Integrity".

**CORE PROTOCOLS:**
1.  **TIME:** Use the provided Current Time/Date for all logic.
2.  **PROGRESSION:** Praise momentum, scold stagnation.
    `;
    return base;
}

export const SYSTEM_INSTRUCTION = getSystemInstruction();

const createTaskTool: FunctionDeclaration = {
  name: "createTask",
  description: "Create a NEW task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The task description" },
      emotional_context: { type: Type.STRING, description: "Why the user is stressed about this" },
      weight: { 
          type: Type.STRING, 
          enum: ["crushing", "heavy", "medium", "light"],
          description: "The emotional weight/difficulty"
      },
      deadline: { type: Type.STRING, description: "ISO 8601 Date String" },
      initial_progress: { type: Type.NUMBER, description: "0-100 percentage" }
    },
    required: ["title", "weight"]
  }
};

const updateTaskTool: FunctionDeclaration = {
  name: "updateTask",
  description: "Fully edit an existing task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "The UUID of the task to update" },
      title: { type: Type.STRING, description: "New title (optional)" },
      weight: { type: Type.STRING, enum: ["crushing", "heavy", "medium", "light"], description: "New weight (optional)" },
      deadline: { type: Type.STRING, description: "New deadline ISO string (optional)" },
      progress: { type: Type.NUMBER, description: "New progress percentage (0-100)" },
      comment: { type: Type.STRING, description: "Reason for the update" }
    },
    required: ["id"]
  }
};

const deleteTaskTool: FunctionDeclaration = {
  name: "deleteTask",
  description: "Remove a task from the board permanently.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "The UUID of the task to delete" },
      reason: { type: Type.STRING, description: "Why you are deleting this" }
    },
    required: ["id", "reason"]
  }
};

const updateProfileAnalysisTool: FunctionDeclaration = {
  name: "updateProfileAnalysis",
  description: "Update the psychological profile.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      archetype: { type: Type.STRING, description: "Creative 2-3 word title" },
      core_drive: { type: Type.STRING, description: "Motivation" },
      current_state: { type: Type.STRING, description: "Emotional/Mental state" },
      summary: { type: Type.STRING, description: "One-sentence summary" }
    },
    required: ["archetype", "current_state", "summary"]
  }
};

const writeJournalEntryTool: FunctionDeclaration = {
    name: "writeJournalEntry",
    description: "Write a permanent journal entry for a specific date.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            content: { type: Type.STRING, description: "The main body of the journal entry." },
            mood: { type: Type.STRING, description: "One word mood (e.g., Stoic, Manic)" },
            mood_score: { type: Type.NUMBER, description: "1 (Suicidal/Hopeless) to 10 (Euphoric/Unstoppable)" },
            summary: { type: Type.STRING, description: "Short recap for quick memory lookup" }
        },
        required: ["date", "content", "summary", "mood", "mood_score"]
    }
};

export const TOOLS: Tool[] = [{ functionDeclarations: [createTaskTool, updateTaskTool, deleteTaskTool, updateProfileAnalysisTool, writeJournalEntryTool] }];