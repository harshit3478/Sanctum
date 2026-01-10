
# SANCTUM: MASTER ARCHITECTURAL BLUEPRINT
## The Executive Function Proxy & Self-Critical Journal

---

### 1. PHILOSOPHY & VISION
**The Problem:** Traditional todo lists are passive graveyards of intention. Journaling is active but disconnected from action.
**The Solution:** Sanctum is a "Second Self" that bridges the gap. It uses AI to listen to your unstructured venting ("I'm so stressed about x"), parses it into structured tasks, and manages them via an "Integrity Score" that gamifies self-respect.

**Core Pillars:**
1.  **Implicit Entry:** User never inputs tasks manually. They just talk.
2.  **Tough Love:** The system is not a polite assistant. It is a rigorous partner that calls out procrastination.
3.  **Visual Consequence:** The UI darkens and "rots" as Integrity drops.

---

### 2. TECHNICAL ARCHITECTURE

#### 2.1 Technology Stack
*   **Frontend:** React 19 + TypeScript + Tailwind CSS.
*   **AI Inference:** Google Gemini 1.5/2.0 Flash (Fast, Cheap, Large Context).
*   **Database:** Supabase (PostgreSQL).
*   **Auth:** Supabase Auth (Email/Password).
*   **Vector Search:** `pgvector` on Supabase for Long-Term Memory (RAG).
*   **Voice:** Web Audio API + Gemini Live API (Real-time WebSockets).

#### 2.2 Data Flow
1.  **Input:** User speaks/types.
2.  **Processing:** 
    *   Input is sent to Gemini.
    *   Gemini checks `tools` definitions.
    *   Gemini retrieves `memories` via Vector Search (RAG).
3.  **Action:** 
    *   If task detected -> Triggers `extractActionableItems` -> Updates `tasks` DB.
    *   If conversational -> Returns text/audio -> Updates `messages` state.
4.  **Storage:** 
    *   User input is embedded (text-embedding-004) and stored in `memories` table.

---

### 3. THE "BOARD OF REGRET" (TASK ENGINE)

This is the right-hand panel (desktop) or drawer (mobile).

#### 3.1 Task Schema
```typescript
interface Task {
  id: UUID;
  title: string;          // "Finish Q3 Report"
  context: string;        // "User mentioned anxiety about this on Tuesday"
  weight: 'crushing' | 'heavy' | 'medium' | 'light';
  status: 'pending' | 'completed' | 'failed';
  created_at: timestamp;
  deadline?: timestamp;   // Optional, inferred from conversation
}
```

#### 3.2 Parsing Logic (AI Tool)
The AI is instructed to look for **implied responsibilities**.
*   *User:* "I haven't called Mom in weeks."
*   *AI Action:* Creates Task { title: "Call Mom", weight: "medium", context: "Guilt detected" }

#### 3.3 Visual Language
*   **Crushing (High Weight):** Red glow, large card, static border.
*   **Light (Low Weight):** Emerald/Slate, small card.
*   **Feedback:** Completing a task triggers a particle burst and sound effect.

---

### 4. THE "SECOND SELF" (PERSONA)

The System Instruction is dynamic based on user profile.

#### 4.1 Onboarding Profiler
Users answer 3 questions to set the AI's personality:
1.  **Name/Designator**
2.  **Prime Directive** (Goal)
3.  **Fatal Flaw** (Procrastination, Anxiety, Perfectionism)

#### 4.2 Dynamic Prompts
*   *If Flaw == Procrastination:* AI becomes aggressive. "You said you'd do this yesterday. Why is it still here?"
*   *If Flaw == Anxiety:* AI becomes grounding. "Let's just do the first 5 minutes."

---

### 5. DATABASE SCHEMA (SUPABASE SQL)

Run this in SQL Editor to initialize the backend.

```sql
-- 1. Enable Vector Support
create extension if not exists vector;

-- 2. Profiles (User Identity)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  directive text,
  fatal_flaw text,
  api_key_encrypted text, -- Optional: Allow user to bring their own key
  created_at timestamptz default now()
);

-- 3. Tasks (The Board)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  context text,
  weight text not null check (weight in ('crushing', 'heavy', 'medium', 'light')),
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- 4. Memories (The Journal / RAG)
create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  embedding vector(768), -- Matches Gemini Embedding Dimensions
  created_at timestamptz default now()
);

-- 5. Security (RLS)
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table memories enable row level security;

-- Policy: Users see only their own data
create policy "User Owns Profile" on profiles for all using (auth.uid() = id);
create policy "User Owns Tasks" on tasks for all using (auth.uid() = user_id);
create policy "User Owns Memories" on memories for all using (auth.uid() = user_id);

-- 6. Similarity Search Function
create or replace function match_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query(
    select
      memories.id,
      memories.content,
      1 - (memories.embedding <=> query_embedding) as similarity
    from memories
    where memories.user_id = auth.uid()
    and 1 - (memories.embedding <=> query_embedding) > match_threshold
    order by memories.embedding <=> query_embedding
    limit match_count
  );
end;
$$;
```

---

### 6. GAMIFICATION LOGIC (INTEGRITY SCORE)

The "Integrity Score" (0-100) measures alignment between intent and action.

**Algorithm:**
```javascript
StartScore = 100;

// Decay (Daily)
for (task in pendingTasks) {
  daysOld = (now - task.createdAt) / 24h;
  weightMult = task.weight == 'crushing' ? 2 : 1;
  Score -= (daysOld * weightMult); 
}

// Boost (Action)
OnCompleteTask(task) {
   Score += (task.weight == 'crushing' ? 5 : 2);
}

// Cap
Score = Clamp(Score, 0, 100);
```

---

### 7. API & PRIVACY STRATEGY

*   **Development:** Use User's own Gemini API Key (Bring Your Own Key - BYOK).
*   **Privacy:** Since data is stored in user's own Supabase row (RLS enabled) and Gemini API (Paid/BYOK) does not train on data, this system is **private by design**.
*   **Cost:** Gemini 1.5 Flash is ~$0.075 per 1M tokens. Effectively free for personal use.

---

### 8. EXECUTION PROTOCOL (For AI Builders)

If you are an AI attempting to build this:
1.  **Initialize DB:** Check if tables exist. If error 42P01, render SQL setup screen.
2.  **Auth First:** Do not load main app without `session`.
3.  **Context Loading:** Fetch `tasks` and `profile` immediately on load.
4.  **Optimistic UI:** When adding a task via AI, show it immediately in UI with a temporary ID before waiting for DB confirmation.
5.  **Fail Gracefully:** If RAG (Vector Search) fails, fallback to simple chat.

