# Life OS — Architecture & Strategy

## What We're Building

A unified personal operating system: intelligent calendar + email integration, 
AI scheduling assistant, second brain with vector search, notes, and a rich 
dashboard. Web-first, mobile-responsive, phased delivery.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite + Tailwind + shadcn/ui | Fast, composable, good ecosystem |
| Backend / DB | Supabase (Postgres + pgvector + RLS + Auth) | You know it, handles vector + relational |
| Calendar / Email | Google Calendar API + Gmail API via OAuth | Broadest coverage, free tier generous |
| AI | Google Gemini 1.5 Pro (via Vertex) or Anthropic Claude | Gemini has 1M context for second brain queries |
| Vector Embeddings | Supabase pgvector + text-embedding-ada-002 or Gemini embeddings | Stored alongside content in Supabase |
| File Storage | Supabase Storage (S3-compatible) | PDFs, images, attachments |
| Hosting | Vercel (frontend) + Supabase (backend) | Free tiers cover MVP |
| Auth | Supabase Auth + Google OAuth | Single sign-in, grants Calendar + Gmail scopes |

---

## Feature Modules (MVP → Later)

### Phase 1 — MVP (One-Shot Target)

**1. Dashboard Home**
- Today's agenda (merged calendars)
- Weather + date/time widget
- Active reminders with snooze/complete
- Quick capture bar (text note in one click)
- Upcoming tasks / events next 7 days
- Recent notes / documents
- "Ask anything" AI input bar

**2. Calendar Intelligence**
- Connect multiple Google Calendars via OAuth
- View merged calendar (month/week/day)
- AI Scheduling: natural language → find free slot → create event
  - "Block 2 hours for budgeting over the next 3 days"
  - Claude reads free/busy, proposes options, user confirms, event created
- Smart conflict detection

**3. Notes & Quick Capture**
- Rich text editor (Tiptap or Lexical)
- Markdown support
- Tag system
- Nested notebooks / folders
- Quick capture from any screen via floating button

**4. Second Brain / Knowledge Store**
- Upload PDFs, images, text files, URLs
- Auto-embedded into pgvector on upload
- "Ask my second brain" — semantic search + RAG over all your content
- Source citations on answers

**5. Reminders**
- Simple recurring + one-off reminders
- Browser notifications
- Shows on dashboard

### Phase 2 — Extensions

- Gmail integration (read/summarise/draft emails via AI)
- Mobile PWA (works on iPhone/Android from browser)
- Obsidian-style graph view of notes
- Weekly review AI digest ("Here's what happened, here's what needs attention")
- Notion import
- Voice capture

---

## Database Schema (Supabase)

```sql
-- Users handled by Supabase Auth

-- Calendar connections
CREATE TABLE calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  provider text, -- 'google'
  access_token text,
  refresh_token text,
  calendar_ids text[], -- which calendars to sync
  created_at timestamptz DEFAULT now()
);

-- Cached events (synced from Google)
CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  external_id text,
  calendar_id text,
  title text,
  start_time timestamptz,
  end_time timestamptz,
  description text,
  is_all_day boolean,
  created_at timestamptz DEFAULT now()
);

-- Notes
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  title text,
  content text, -- JSON (Tiptap format)
  tags text[],
  folder_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Second Brain documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  title text,
  type text, -- 'pdf', 'image', 'url', 'text'
  storage_path text, -- Supabase Storage path
  raw_text text, -- extracted text for embedding
  created_at timestamptz DEFAULT now()
);

-- Vector chunks (for RAG)
CREATE TABLE document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents,
  user_id uuid REFERENCES auth.users,
  content text,
  embedding vector(1536), -- OpenAI ada-002 or Gemini
  chunk_index int,
  created_at timestamptz DEFAULT now()
);

-- Reminders
CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  title text,
  due_at timestamptz,
  recurrence text, -- 'daily', 'weekly', null
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Folders (for notes)
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  name text,
  parent_id uuid,
  created_at timestamptz DEFAULT now()
);
```

RLS: Every table has `user_id = auth.uid()` policy. Nothing is readable cross-user.

---

## Google OAuth Scopes Needed

```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/userinfo.email
```

These are requested during the Supabase Google OAuth flow. You configure them in Google Cloud Console under your OAuth app.

---

## AI Scheduling Flow

```
User: "Block 2 hours for budgeting over the next 3 days"
  ↓
Parse intent (Claude/Gemini): duration=2h, purpose="budgeting", window=next 3 days
  ↓
Fetch calendar events for window from Supabase (synced cache)
  ↓
Build free/busy map (working hours 9-6, exclude existing events)
  ↓
Find 3 candidate slots
  ↓
Present options to user: "I found: Mon 2-4pm, Tue 10am-12pm, Wed 3-5pm"
  ↓
User picks one
  ↓
Create event via Google Calendar API
  ↓
Sync back to Supabase cache
```

---

## Second Brain RAG Flow

```
User uploads PDF
  ↓
Extract text (pdf-parse or pdfjs)
  ↓
Chunk into ~500 token segments with overlap
  ↓
Embed each chunk (OpenAI / Gemini embeddings API)
  ↓
Store chunks + embeddings in document_chunks (pgvector)
  ↓
User asks: "What did I read about compound interest?"
  ↓
Embed the question
  ↓
pgvector similarity search → top 5 chunks
  ↓
Claude/Gemini answers with source citations
```

---

## Project Structure

```
life-os/
├── CLAUDE.md                    ← your engineering contract
├── .env.local                   ← secrets (never commit)
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── calendar/
│   │   ├── notes/
│   │   ├── brain/               ← second brain
│   │   ├── reminders/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/                  ← shadcn components
│   │   ├── calendar/
│   │   ├── notes/
│   │   └── brain/
│   ├── lib/
│   │   ├── supabase.ts          ← single client instance
│   │   ├── google-calendar.ts   ← Calendar API wrapper
│   │   ├── embeddings.ts        ← chunking + embedding logic
│   │   ├── ai.ts                ← Claude/Gemini wrapper
│   │   └── scheduling.ts        ← free/busy + slot finding
│   ├── hooks/
│   │   ├── useCalendar.ts
│   │   ├── useNotes.ts
│   │   └── useBrain.ts
│   └── types/
│       └── index.ts
├── supabase/
│   ├── migrations/              ← all schema SQL
│   └── functions/               ← edge functions if needed
└── public/
```

---

## Worktree Strategy for Claude Code

```bash
git init life-os && cd life-os

# Three parallel worktrees
git worktree add ../life-os-frontend feature/frontend
git worktree add ../life-os-backend feature/backend  
git worktree add ../life-os-ai feature/ai-layer

# Aliases
alias zf="cd ~/life-os-frontend && claude"
alias zb="cd ~/life-os-backend && claude"
alias za="cd ~/life-os-ai && claude"
```

Session allocation:
- **zf** — React frontend, dashboard, notes editor, UI components
- **zb** — Supabase schema, RLS, Google OAuth, Calendar API sync
- **za** — AI scheduling logic, embedding pipeline, RAG query layer

---

## Phased Delivery

| Phase | Scope | Est. Time |
|-------|-------|-----------|
| 1a | Supabase schema + RLS + Google OAuth | 1 session |
| 1b | Dashboard UI + Calendar view (read-only) | 1 session |
| 1c | AI Scheduling assistant (natural language → event) | 1 session |
| 1d | Notes app (editor + folders + tags) | 1 session |
| 1e | Second Brain (upload + embed + RAG query) | 1 session |
| 1f | Reminders + polish | 1 session |
| 2 | Gmail integration | 1 session |
| 3 | Mobile PWA | 1 session |
