# Phase 2: The Extractor (Developer Blueprint)

**Status:** Ready for Implementation
**Objective:** Transform Sanctum from a passive listener into an active executive proxy.

---

## 1. The Core Concept: "Invisible Action"
In standard todo apps, the friction is **entry**. You have to stop thinking, open a form, and type.
In **Sanctum Phase 2**, entry is **implicit**. You just complain or brainstorm, and the system structurally parses your intent.

**The Loop:**
1.  **User:** "I'm stressed because I haven't started the Q3 report and my car is making that weird noise again."
2.  **Sanctum (AI):** Acknowledges the stress (Text/Voice) AND silently calls a function.
3.  **Sanctum (UI):** Two cards materialize in the "Dashboard" panel.
    *   *Task:* Q3 Report (Tag: Work, Weight: Heavy)
    *   *Task:* Check Car Noise (Tag: Personal, Weight: Annoying)

---

## 2. User Interface Design (The "Split Mind")

We will evolve the UI from a single column to a **Reactive Split-View**.

### A. Desktop (Landscape)
*   **Left 60% (The Confessor):** The existing Chat/Live interface.
*   **Right 40% (The Mirror):** A persistent dashboard that updates in real-time.
    *   **Top:** "Integrity Score" (0-100). A metric of how well you keep promises to yourself.
    *   **Body:** The Task List, sorted not by date, but by **Emotional Weight**.

### B. Mobile (Portrait)
*   **Main View:** Chat/Live Interface.
*   **Drawer/Tab:** A "breathe" bar at the bottom. When tasks are detected, it glows. Swiping up reveals the Dashboard.

### C. Visual Language for Tasks
Tasks shouldn't look like spreadsheets. They should feel like "objects" in the room.
*   **Heavy Tasks:** Darker, larger, static.
*   **Quick Tasks:** Lighter, smaller.
*   **Decay:** Tasks that stay on the list too long begin to "rot" (visual texture changes or color desaturates), indicating a drop in Integrity Score.

---

## 3. Technical Architecture

### 3.1 Data Schema (The `Task` Object)
We need a robust schema to handle the extracted data.

```typescript
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'ignored';
type EmotionalWeight = 'crushing' | 'heavy' | 'medium' | 'light';

interface Task {
  id: string;
  content: string; // "Finish Q3 Report"
  context: string; // "User mentioned this while stressed about Friday deadline"
  createdAt: number;
  deadline?: number;
  weight: EmotionalWeight; 
  integrityCost: number; // How much the score drops if ignored (1-10)
  status: TaskStatus;
}
```

### 3.2 AI Integration (Function Calling)
We will utilize Gemini's `tools` capability.

**Tool Definition:** `extractActionableItems`
*   **Parameters:**
    *   `items`: Array of objects.
    *   `description`: The action to take.
    *   `emotional_context`: Why is this a task? (e.g., "User is anxious about it").
    *   `urgency`: 1-5.

**Workflow:**
1.  User sends message (Text or Voice).
2.  App sends prompt to Gemini with `tools: [extractActionableItems]`.
3.  Gemini analyzes text.
    *   *If purely conversational:* Returns text response.
    *   *If tasks detected:* Returns a `functionCall`.
4.  App intercepts `functionCall`:
    *   Parses JSON.
    *   Updates React State (`tasks` array).
    *   Triggers "New Task" sound/animation.
    *   Sends "Function Executed" signal back to Gemini.
5.  Gemini generates a text response confirming the capture: "I've added the report to your list. Let's break it down."

### 3.3 State Management
*   **Storage:** Continue using `localStorage` for MVP, but structure it under a `sanctum_db` key containing both `history` and `tasks`.
*   **Synchronization:** The Chat and the Task List must share state. If I check off a task in the list, the Chat context should know it's done.

---

## 4. The "Tough Love" Algorithm (Integrity Score)
This is the gamification of your conscience.

*   **Starting Score:** 100.
*   **Decay Logic:**
    *   Every 24 hours a task sits in 'pending': -1 point (scaled by weight).
    *   Adding a task and completing it same-day: +2 points.
    *   Moving a deadline: -5 points (Cheating).
*   **UI Feedback:**
    *   Score > 90: Emerald Glow (Serene).
    *   Score < 50: Red/Orange Ambience (Anxious).
    *   *The app's visual theme literally darkens as you procrastinate.*

---

## 5. Implementation Steps

1.  **Refactor App.tsx:** Move state up or create a Context Provider (`SanctumContext`) to manage `messages` and `tasks` globally.
2.  **Create Tool Definitions:** Write the JSON schema for Gemini function calling.
3.  **Build The Dashboard Component:** The right-hand visualization panel.
4.  **Wiring:** Connect the chat loop to the tool handler.
5.  **Polish:** Add the animations for task materialization.

---

## 6. Prompt Engineering Updates
We need to update the `SYSTEM_INSTRUCTION` to make Sanctum aware of its new power.

*   *Old:* "You are a journal."
*   *New:* "You are a journal and an executive assistant. You aggressively hunt for implied responsibilities. If the user says 'I have to call mom', you MUST trigger the `extractActionableItems` tool. Do not ask for permission."
