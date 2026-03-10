# Life OS — One-Shot Prompt Pack

Use these prompts in order. Each is a complete, self-contained session brief.
Paste the full prompt into Claude Code — do not summarise or truncate it.

---

## BEFORE YOU START — ENVIRONMENT SETUP

```bash
# 1. Create project
npm create vite@latest life-os -- --template react-ts
cd life-os

# 2. Install all deps upfront
npm install @supabase/supabase-js @supabase/auth-helpers-react
npm install @tanstack/react-query
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
npm install lucide-react date-fns
npm install pdf-parse
npm install openai
npm install @anthropic-ai/sdk
npm install react-router-dom
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn-ui@latest init

# 3. Set up git + worktrees
git init && git add . && git commit -m "init"
git worktree add ../life-os-backend feature/backend
git worktree add ../life-os-ai feature/ai-layer

# 4. Copy CLAUDE.md to project root
cp /path/to/CLAUDE.md ./CLAUDE.md

# 5. Create .env.local with your keys (fill these in before running)
```

---

## SESSION 1 — BACKEND FOUNDATION

**Worktree:** `zb` (life-os-backend)  
**Estimated time:** 1 Claude session

```
Read CLAUDE.md first. Then build the complete Supabase backend foundation for Life OS.

## What to build:

### 1. Database Schema
Create all migrations in /supabase/migrations/ in this order:

a) 00001_extensions.sql
   - Enable pgvector extension
   - Enable uuid-ossp

b) 00002_core_tables.sql
   Create these tables with full RLS:
   
   - calendar_connections: id, user_id, provider (text), 
     access_token (text), refresh_token (text), 
     calendar_ids (text[]), email (text), created_at
   
   - calendar_events: id, user_id, external_id (text), 
     calendar_id (text), title (text), description (text),
     start_time (timestamptz), end_time (timestamptz), 
     is_all_day (boolean), color (text), created_at
   
   - notes: id, user_id, title (text), content (jsonb),
     tags (text[]), folder_id (uuid nullable), 
     is_pinned (boolean default false),
     created_at, updated_at
   
   - folders: id, user_id, name (text), parent_id (uuid nullable),
     color (text), created_at
   
   - documents: id, user_id, title (text), type (text),
     storage_path (text), raw_text (text), 
     url (text nullable), created_at
   
   - document_chunks: id, document_id (references documents),
     user_id, content (text), embedding (vector(1536)),
     chunk_index (int), created_at
   
   - reminders: id, user_id, title (text), due_at (timestamptz),
     recurrence (text nullable), completed (boolean default false),
     created_at

c) 00003_rls_policies.sql
   For EVERY table above:
   - Enable RLS
   - Create policy: "Users can only access own data"
   - SELECT/INSERT/UPDATE/DELETE all scoped to auth.uid()
   
   For document_chunks specifically, also add:
   - A vector similarity search function:
     CREATE FUNCTION match_chunks(query_embedding vector(1536), user_id uuid, match_count int)
     RETURNS TABLE(id uuid, content text, document_id uuid, similarity float)
     LANGUAGE plpgsql AS $$
       SELECT id, content, document_id, 
              1 - (embedding <=> query_embedding) as similarity
       FROM document_chunks
       WHERE document_chunks.user_id = $2
       ORDER BY embedding <=> query_embedding
       LIMIT match_count;
     $$

d) 00004_indexes.sql
   - Index calendar_events on (user_id, start_time)
   - Index document_chunks on user_id
   - HNSW index on document_chunks embedding column for fast similarity search

### 2. Supabase Client + Type Generation
Create /src/lib/supabase.ts:
- Single createClient instance
- Export typed client using Supabase generated types
- Export helper: getCurrentUser() → User | null
- Export helper: requireAuth() → User (throws if not authenticated)

### 3. Google OAuth Configuration
Create /src/lib/google-auth.ts:
- Configure Supabase Google OAuth with these scopes:
  https://www.googleapis.com/auth/calendar
  https://www.googleapis.com/auth/calendar.events  
  https://www.googleapis.com/auth/gmail.readonly
  https://www.googleapis.com/auth/userinfo.email
- Export: signInWithGoogle() — initiates OAuth flow
- Export: signOut()
- Export: getGoogleAccessToken() — retrieves stored token from calendar_connections
- Export: refreshGoogleToken(connectionId) — handles token refresh

### 4. Calendar Sync Service
Create /src/lib/google-calendar.ts:
- fetchAndSyncCalendars(userId) — hits Google Calendar API, upserts into calendar_events
- getFreeBusy(userId, startDate, endDate) — returns array of busy blocks from cached events
- createEvent(userId, event) — creates via Google API then syncs to cache
- deleteEvent(userId, eventId) — deletes from Google + removes from cache

### 5. Verification
After building, verify:
- Run supabase db push and confirm all tables exist
- Test RLS by confirming a query without auth.uid() returns 0 rows
- Confirm pgvector extension is active with: SELECT * FROM pg_extension WHERE extname = 'vector';

Update CLAUDE.md with anything you learned. Add any new known mistakes.
```

---

## SESSION 2 — DASHBOARD & NAVIGATION UI

**Worktree:** `zf` (life-os-frontend)  
**Estimated time:** 1 Claude session

```
Read CLAUDE.md first. Build the complete shell UI and dashboard for Life OS.

## Design Direction
Dark, refined productivity OS aesthetic — think Raycast meets Linear.
- Background: zinc-950 base, zinc-900 panels, zinc-800 borders
- Primary accent: violet-500 
- Success: emerald-400
- Text: zinc-100 primary, zinc-400 secondary, zinc-600 muted
- Font: Use "GeistMono" or "JetBrains Mono" for data/times, 
  "Geist" or a clean sans for body
- Panels have subtle 1px borders and very slight backdrop blur
- Micro-animations on hover states (150ms ease)

## What to build:

### 1. App Shell (/src/App.tsx)
React Router setup with these routes:
- / → redirect to /dashboard
- /dashboard → DashboardPage
- /calendar → CalendarPage  
- /notes → NotesPage (with :noteId optional param)
- /brain → BrainPage
- /reminders → RemindersPage
- /settings → SettingsPage
- /auth → AuthPage

Wrap everything in:
- QueryClientProvider (React Query)
- SupabaseAuthProvider
- AuthGuard (redirect to /auth if not logged in)

### 2. Sidebar Navigation (/src/components/layout/Sidebar.tsx)
Fixed left sidebar, 240px wide:
- App logo/name "Life OS" at top with a subtle icon
- Navigation items with icons (lucide-react):
  - Dashboard (LayoutDashboard)
  - Calendar (CalendarDays)  
  - Notes (FileText)
  - Second Brain (Brain)
  - Reminders (Bell)
- Bottom: Settings, user avatar + email, sign out button
- Active state: violet-500 left border + violet-950 background
- Collapsed state on mobile (icon only)

### 3. Dashboard Page (/src/app/dashboard/DashboardPage.tsx)

Layout: Bento grid — 12 column, responsive

Widgets to build (all fetch real data from Supabase):

a) TODAY HEADER — full width
   - Large date: "Wednesday, 4 March"
   - Greeting: time-based ("Good morning Jake", "Good afternoon Jake")
   - Quick summary: "You have 3 events today, 2 reminders due"

b) TODAY'S AGENDA — spans 7 cols
   - List of today's calendar events (from calendar_events table)
   - Each event: time range, title, color dot matching calendar color
   - Empty state: "Nothing scheduled — enjoy the space"
   - "View full calendar" link at bottom

c) REMINDERS — spans 5 cols
   - Due today + overdue reminders at top (highlighted in amber)
   - Upcoming reminders below
   - Checkbox to complete inline
   - "+ Add reminder" button opens a quick modal
   - Shows max 8, "See all" link

d) UPCOMING EVENTS — spans 7 cols
   - Next 7 days timeline view
   - Day headers with event count badges
   - Click event to see details

e) AI ASSISTANT BAR — full width, prominent
   - Large text input: "Ask me anything or tell me what to schedule..."
   - Examples shown as pill suggestions:
     "Block 2h for deep work this week"
     "What did I read about pricing strategies?"
     "Summarise my day tomorrow"
   - Submits to AI handler (stub the handler for now, wire up in Session 3)
   - Shows response inline below the bar with a subtle animation

f) RECENT NOTES — spans 5 cols
   - Last 4 notes: title, first line of content, relative time
   - "+ New note" button
   - Click to navigate to note

g) QUICK CAPTURE — spans 5 cols (or inline in notes widget)
   - Single text input: "Capture a thought..."
   - On Enter: creates a note titled with timestamp, saves to Supabase
   - Success: subtle flash + note appears in Recent Notes

h) SECOND BRAIN STATS — spans 2 cols
   - Count of documents stored
   - Count of notes
   - Storage used

### 4. Auth Page (/src/app/auth/AuthPage.tsx)
Clean centered card:
- Life OS logo
- "Sign in with Google" button (triggers signInWithGoogle())
- Subtext explaining what Google permissions are needed and why
- Handle OAuth callback (Supabase handles redirect automatically)

### 5. Responsive Behaviour
- Sidebar collapses to bottom nav on mobile
- Bento grid goes single column on mobile
- Dashboard widgets stack vertically on tablet

### Verification
- Run the app: npm run dev
- Confirm routing works for all pages
- Confirm dashboard renders without errors (use mock data if Supabase not yet connected)
- Confirm sidebar navigation highlights active route
- Confirm auth redirect works

Update CLAUDE.md with anything you learned.
```

---

## SESSION 3 — AI SCHEDULING + CALENDAR VIEW

**Worktree:** `za` (life-os-ai) then merge to main

```
Read CLAUDE.md first. Build the AI scheduling system and full calendar view.

## What to build:

### 1. AI Scheduling Engine (/src/lib/scheduling.ts)

parseSchedulingIntent(input: string): Promise<SchedulingIntent>
  - Call Claude API with the user's text
  - Extract: { duration_minutes, purpose, window_days, constraints }
  - System prompt: "You are a scheduling assistant. Extract scheduling intent 
    from natural language. Return JSON only with fields: 
    duration_minutes (number), purpose (string), window_days (number, default 7), 
    constraints (string[]). Example input: 'block 2 hours for budgeting over next 3 days'
    Example output: {duration_minutes: 120, purpose: 'budgeting', window_days: 3, constraints: []}"

findAvailableSlots(userId, intent: SchedulingIntent): Promise<TimeSlot[]>
  - Fetch calendar_events for the window from Supabase
  - Build free/busy map: 9am-6pm working hours, mark busy blocks
  - Find slots of intent.duration_minutes that are free
  - Return top 3 slots as { start, end, label } objects
  - Label format: "Tomorrow 2:00–4:00pm" or "Wed 10:00am–12:00pm"

createScheduledEvent(userId, slot: TimeSlot, intent: SchedulingIntent): Promise<void>
  - Create event via google-calendar.ts createEvent()
  - Title: intent.purpose (capitalised)
  - Description: "Scheduled by Life OS"

### 2. AI Dashboard Handler (/src/lib/ai.ts)

handleDashboardQuery(userId: string, query: string): Promise<AIResponse>
  Routes the query to the right handler:
  
  - If scheduling intent detected (contains time/duration/block/schedule):
    → parseSchedulingIntent → findAvailableSlots → return slot options
    → Response type: "scheduling_options" with slots array
  
  - If question about stored knowledge (contains "what did I", "find", "search"):
    → querySecondBrain(userId, query)
    → Response type: "knowledge_answer" with answer + sources
  
  - If general question:
    → Answer directly with Claude, include today's context (events, reminders)
    → Response type: "general_answer"

querySecondBrain(userId, question): Promise<KnowledgeAnswer>
  - Embed the question using OpenAI embeddings
  - Call Supabase match_chunks RPC with embedding + userId
  - Build context from top 5 chunks
  - Call Claude with context + question
  - Return { answer, sources: [{title, document_id}] }

### 3. Calendar View (/src/app/calendar/CalendarPage.tsx)

Three views: Month, Week, Day (toggle buttons in header)

Month view:
  - 7-column grid
  - Each day cell shows event count + first 2 event titles
  - Click day → zooms to day view
  - Color dots for different calendars

Week view (default):
  - Time grid 6am-10pm
  - Events as positioned blocks (position based on start/end time)
  - Event colors from calendar
  - Click event → detail popover (title, time, description, edit/delete)

Day view:
  - Same as week but single column, more detail

AI Scheduling UI (floating panel, accessible from calendar):
  - Text input: "Schedule something..."
  - On submit → calls handleDashboardQuery
  - If scheduling_options returned: show 3 slot cards with "Book this" buttons
  - On "Book this" → createScheduledEvent → success toast → calendar refreshes

Connect dashboard AI bar to handleDashboardQuery (wire up the stub from Session 2).

### Verification
- Test with input: "block 2 hours for deep work tomorrow afternoon"
- Confirm intent is parsed correctly (log to console)
- Confirm free slots are returned (use mock events if Google not yet connected)
- Confirm calendar renders in all 3 views
- Confirm event creation flow completes without errors

Update CLAUDE.md with what you learned.
```

---

## SESSION 4 — NOTES APP

**Worktree:** `zf` (life-os-frontend)

```
Read CLAUDE.md first. Build the complete notes application.

## What to build:

### 1. Notes Layout (/src/app/notes/NotesPage.tsx)
Two-panel layout:
- Left panel (280px): folder tree + notes list
- Right panel: active note editor

Left panel:
- Folder tree (recursive, supports nesting)
  - Right click folder → rename, delete, add subfolder
  - Drag notes between folders
- Notes list below folders (or filtered by selected folder)
  - Each note: title, first line preview, relative timestamp, tags
  - Sort: updated_at desc
- "+ New Note" button at top
- Search input that filters notes by title + content

Right panel (no note selected):
- Empty state: "Select a note or create a new one"
- Large "+ New Note" CTA

### 2. Note Editor (/src/components/notes/NoteEditor.tsx)
Using Tiptap:
- Toolbar: Bold, Italic, Underline, Strikethrough, Code, 
  Heading 1/2/3, Bullet list, Ordered list, Blockquote, 
  Horizontal rule, Link
- Title input (large, plain text, separate from body)
- Body uses Tiptap with starter-kit
- Placeholder: "Start writing..."
- Auto-save: debounced 1000ms after last keystroke
- Save indicator: "Saving..." → "Saved" with subtle animation
- Tags: inline tag input below title (type tag + Enter to add, click to remove)
- Note metadata in footer: created date, word count, character count

### 3. Hooks
useNotes(folderId?: string): 
  - Fetch notes from Supabase (filtered by folder if provided)
  - React Query with 30s stale time
  
useNote(noteId: string):
  - Fetch single note
  - Returns note + updateNote mutation + deleteNote mutation

useFolders():
  - Fetch folder tree
  - Returns folders + createFolder + renameFolder + deleteFolder mutations

### 4. Quick Capture (global)
Already on dashboard — also accessible via keyboard shortcut:
- Cmd+Shift+N (or Ctrl+Shift+N) anywhere in the app
- Opens a floating modal with a simple text input
- Creates note with current timestamp as title
- Auto-focuses, Enter to save and close

### Verification
- Create a folder, create a note inside it
- Edit the note, confirm auto-save works (check Supabase)
- Test quick capture shortcut
- Confirm notes list updates after save
- Test search filters correctly

Update CLAUDE.md with what you learned.
```

---

## SESSION 5 — SECOND BRAIN

**Worktree:** `za` (life-os-ai)

```
Read CLAUDE.md first. Build the Second Brain — document storage, embedding pipeline, and RAG query interface.

## What to build:

### 1. Document Processing Pipeline (/src/lib/embeddings.ts)

chunkText(text: string, chunkSize = 500, overlap = 50): string[]
  - Split text into chunks by token count approximation (1 token ≈ 4 chars)
  - Each chunk overlaps with previous by `overlap` tokens
  - Return array of chunk strings

embedChunks(chunks: string[]): Promise<number[][]>
  - Call OpenAI text-embedding-ada-002
  - Batch in groups of 20 (API limit)
  - Return array of embedding vectors (1536 dims each)

extractTextFromPDF(file: File): Promise<string>
  - Use pdf-parse to extract raw text
  - Handle encrypted/image PDFs gracefully (return empty string + warn user)

extractTextFromURL(url: string): Promise<string>
  - Fetch URL, strip HTML tags, clean whitespace
  - Return plain text content

processAndStoreDocument(userId, file: File | string, type: 'pdf' | 'url' | 'text'):
  Promise<Document>
  - If PDF: extract text, upload file to Supabase Storage
  - If URL: extract text from URL
  - If text: use as-is
  - Insert row into documents table
  - Chunk the text
  - Embed all chunks
  - Batch insert into document_chunks with embeddings
  - Return the created document

### 2. RAG Query (/src/lib/ai.ts — add to existing)

querySecondBrain(userId, question): Promise<KnowledgeAnswer>
  (implement the stub from Session 3 fully)
  
  - Embed question using OpenAI
  - Call Supabase RPC: match_chunks(embedding, userId, 5)
  - If no results: return "I don't have anything stored about that yet."
  - Build context string from chunks
  - Call Claude with:
    System: "You are a personal knowledge assistant. Answer questions using 
    only the provided context from the user's personal documents. 
    Always cite which document your answer comes from."
    User: "Context:\n{chunks}\n\nQuestion: {question}"
  - Return { answer: string, sources: [{title, documentId}][] }

### 3. Second Brain UI (/src/app/brain/BrainPage.tsx)

Three sections:

a) QUERY BAR (top, prominent)
   - Large search/question input
   - Placeholder: "Ask anything from your stored knowledge..."
   - Submit button + Enter to submit
   - Loading state with subtle pulse animation
   - Answer renders below with:
     - Answer text (markdown rendered)
     - Source cards: document title + type icon, link to view document

b) UPLOAD AREA (right panel or modal)
   - Drag and drop zone: "Drop PDFs, images, or paste a URL"
   - Or click to file picker (accepts .pdf, .txt, .md, images)
   - URL input field: paste a URL to save + index a webpage
   - Upload progress indicator per file
   - After processing: success state showing chunk count

c) DOCUMENT LIBRARY (main area)
   - Grid of document cards: title, type icon, date added, chunk count
   - Click to view: opens modal with raw_text content
   - Delete button (removes document + all its chunks)
   - Search/filter by title
   - Empty state: "Your second brain is empty. Add your first document above."

### Verification
- Upload a PDF, confirm it appears in document library
- Confirm document_chunks rows exist in Supabase with non-null embeddings
- Ask a question related to the PDF content
- Confirm answer references content from the PDF with source citation
- Test URL extraction with a public URL

Update CLAUDE.md with what you learned.
```

---

## SESSION 6 — REMINDERS + POLISH

**Worktree:** `zf` (life-os-frontend)

```
Read CLAUDE.md first. Build the reminders system and complete the polish pass.

## Reminders (/src/app/reminders/RemindersPage.tsx)

Full reminders page:
- Sections: Overdue (red), Due Today (amber), Upcoming, Completed
- Each reminder: checkbox, title, due date/time, recurrence badge
- Click to edit (inline or modal): title, date, time, recurrence
- Recurrence options: None, Daily, Weekly, Monthly
- "+ New Reminder" → quick form at top of page
- Bulk actions: mark all overdue as complete, clear completed

Browser Notifications:
- On app load, request Notification permission
- Check for due/overdue reminders every 5 minutes
- Fire browser notification for reminders due within 15 minutes
- Notification click → focus app + navigate to reminders

Dashboard integration (already built — confirm wiring):
- Reminders widget shows due today + overdue
- Inline checkbox marks complete
- "+ Quick reminder" button opens modal

## Polish Pass

### 1. Loading Skeletons
Every data-loading section needs a skeleton state:
- Dashboard widgets: shimmer placeholder matching widget shape
- Notes list: 4 skeleton note cards
- Calendar: skeleton event blocks
- Document library: skeleton cards

### 2. Error States
- Each widget: "Failed to load — retry" button
- Network error toast (bottom right, zinc-900 bg, red-400 border)
- Auth expiry: intercept 401s, redirect to /auth with "Session expired" message

### 3. Empty States
Every list needs an illustrated empty state (use a simple SVG or Lucide icon + message):
- No events today: calendar icon + "Nothing scheduled"
- No notes: pencil icon + "Start capturing your thoughts"
- No documents: brain icon + "Add your first document"
- No reminders: bell icon + "You're all caught up"

### 4. Keyboard Shortcuts
Implement and show in a /shortcuts modal (triggered by ?):
- Cmd+K — command palette (navigate to any page)
- Cmd+Shift+N — quick capture note
- Cmd+Shift+R — quick add reminder
- / — focus AI bar on dashboard

### 5. Settings Page (/src/app/settings/SettingsPage.tsx)
- Connected Accounts: show connected Google accounts with calendar list
  - Toggle which calendars to sync (stored in calendar_connections.calendar_ids)
  - "Connect another Google account" button
- Working Hours: start time, end time (used by scheduling engine)
- AI Preferences: preferred response length (concise/detailed)
- Appearance: (placeholder for future theme options)

### Verification
Run through every page:
- [ ] Dashboard loads with real data, all widgets render
- [ ] AI bar accepts input and returns a response
- [ ] Calendar shows events in week view
- [ ] Notes create/edit/save/delete all work
- [ ] Second Brain upload + query works
- [ ] Reminders create/complete/delete work
- [ ] Keyboard shortcuts work
- [ ] No console errors
- [ ] Mobile layout is usable

Final CLAUDE.md update: document the complete system state, known limitations, and what Phase 2 should tackle first.
```

---

## TIPS FOR RUNNING THESE SESSIONS

1. **Always start** by opening the session in the right worktree and saying:
   "Read CLAUDE.md first, then proceed with the following task:"
   Then paste the session brief.

2. **If it goes sideways** midway through (failing tests, cascading errors):
   "Stop. Go back to plan mode. Re-plan from [specific point]. Do not continue fixing, re-plan."

3. **After each session** ends:
   "Before we finish: update CLAUDE.md with any mistakes you made and anything you learned about this codebase today."

4. **To use subagents** on the harder sessions (3 and 5):
   Append "Use subagents — one for the data layer, one for the UI, one for the AI integration" to the prompt.

5. **To force elegance** if it gives you something messy:
   "Knowing everything you know now, scrap the [specific part] and implement the elegant solution."
