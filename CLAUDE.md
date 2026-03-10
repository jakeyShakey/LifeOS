# CLAUDE.md — Life OS

This file is your engineering contract. Read it at the start of every session.
Update it when you make a mistake or learn something new about this codebase.

---

## Project Overview

Life OS is a personal productivity application with:
- Google Calendar integration (multi-calendar, AI scheduling)
- Gmail integration (read/summarise)
- Notes app with rich text editor
- Second Brain with vector search (RAG over personal documents)
- Dashboard with reminders, agenda, quick capture

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript (strict) + Tailwind CSS + shadcn/ui |
| Backend | Supabase (Postgres + pgvector + Auth + Storage + RLS) |
| Calendar/Email | Google Calendar API + Gmail API (via OAuth) |
| AI | Anthropic Claude API (scheduling logic, RAG answers) |
| Embeddings | OpenAI text-embedding-ada-002 (1536 dims) via pgvector |
| Hosting | Vercel (frontend) |

---

## Architecture Rules

### Supabase
- Project ID: `xrkpxtqazpywwmhzvfmn` (eu-west-1)
- ALWAYS implement RLS on every table. Policy: `user_id = auth.uid()`
- NEVER expose a table without RLS — not even in dev
- Single Supabase client instance in `/src/lib/supabase.ts` — never instantiate inline
- Use environment variables for all keys. Never hardcode them.
- Migrations go in `/supabase/migrations/` — named `NNNNN_description.sql` (e.g. `00005_add_tags.sql`)
- Apply migrations via Supabase MCP `apply_migration` tool — the tool prepends a timestamp automatically
- After any schema change, regenerate types using the Supabase MCP tool `generate_typescript_types` — write output to `src/types/database.ts`. Do NOT use the `npx supabase gen types` CLI — it fails with "Forbidden resource" (requires service role auth the CLI doesn't have).

### React
- TypeScript strict mode always — no `any` types without explicit justification
- All async components must handle loading, error, and empty states
- Components in `/src/components/`, hooks in `/src/hooks/`, utilities in `/src/lib/`
- No console.log in production code
- All API calls go through the wrappers in `/src/lib/` — never inline fetch in components
- Use React Query (TanStack Query) for all server state — no manual useEffect fetching

### Google APIs
- OAuth token management in `/src/lib/google-auth.ts`
- Always refresh tokens before API calls — handle 401s gracefully
- Cache calendar events in Supabase — don't hit Google API on every render
- Requested scopes: calendar, calendar.events, gmail.readonly, userinfo.email

### AI / Embeddings
- AI calls in `/src/lib/ai.ts` only
- Embedding logic in `/src/lib/embeddings.ts`
- Chunk size: 500 tokens with 50 token overlap
- Always store source document_id + chunk_index for citations
- For scheduling: build free/busy map from cached events, never from raw Google API calls

### Styling
- Tailwind utility classes only — no inline styles, no CSS modules
- Dark mode first — this is a productivity tool used late at night
- shadcn/ui for all form elements, dialogs, dropdowns
- Design aesthetic: refined dark OS — think Raycast / Linear / Arc browser
  - Background: zinc-950/900 palette
  - Accent: violet-500 primary, emerald-400 for success states
  - Typography: sharp, functional, generous line height

---

## Folder Structure

```
src/
├── app/           # Page-level components (route views)
├── components/    # Reusable UI components
│   ├── ui/        # shadcn primitives
│   ├── calendar/
│   ├── notes/
│   ├── brain/
│   └── dashboard/
├── hooks/         # Custom React hooks
├── lib/           # Pure utility/API wrappers
│   ├── supabase.ts
│   ├── google-calendar.ts
│   ├── google-auth.ts
│   ├── embeddings.ts
│   ├── ai.ts
│   └── scheduling.ts
└── types/         # TypeScript interfaces
    └── index.ts
```

---

## Known Mistakes — Do Not Repeat

- Do NOT use localStorage for auth tokens — use Supabase session management
- Do NOT create a new Supabase client per component or hook — use the singleton
- Do NOT hit the Google Calendar API directly from React components — sync to cache first
- Do NOT skip error boundaries on the dashboard — it renders multiple async sources
- Do NOT forget to add pgvector extension before creating vector columns: `CREATE EXTENSION IF NOT EXISTS vector;`
- Do NOT chunk documents without overlap — retrieval quality degrades significantly
- Do NOT mark a task complete without running the app and verifying the feature works
- Do NOT implement a hacky fix — if execution goes sideways, STOP and re-plan
- Do NOT leave `any` types in `supabase.ts` long-term — run `supabase gen types` after every schema migration and import `Database` type into the client
- Do NOT use `npx supabase gen types` CLI — it fails with "Forbidden resource". Always use the Supabase MCP `generate_typescript_types` tool instead, then write the output to `src/types/database.ts`
- Do NOT set `"noEmit": true` in `tsconfig.node.json` — when used as a TypeScript project reference it must have `"composite": true` instead, otherwise `tsc` errors with TS6306/TS6310
- Do NOT forget `src/vite-env.d.ts` containing `/// <reference types="vite/client" />` — without it, `import.meta.env` types are missing and TypeScript errors on all env var accesses
- Do NOT forget to run `npm install` in the main repo root after merging a worktree branch — `node_modules` live in the worktree directory and don't carry over to the main working tree
- Do NOT mix static and dynamic imports of the same module — if a module is already statically imported, use it directly; dynamic `import()` of the same path causes a Vite bundler warning and serves no benefit
- Do NOT use `dangerousAllowBrowser` for the OpenAI client — the correct option is `dangerouslyAllowBrowser: true`

---

## AI Scheduling Protocol

When a user makes a natural language scheduling request:
1. Parse: extract duration, purpose, time window, any constraints
2. Load free/busy from Supabase cache (NOT Google API directly)
3. Apply working hours (9am-6pm default, configurable in user settings)
4. Find 3 candidate slots minimum
5. Present options — never auto-create without user confirmation
6. On confirmation: create via Google Calendar API, then sync to cache

---

## Second Brain RAG Protocol

Upload flow:
1. Accept file (PDF, image, text, URL)
2. Extract raw text (pdf-parse for PDFs, fetch+strip for URLs)
3. Chunk into 500-token segments with 50-token overlap
4. Embed each chunk with OpenAI embeddings
5. Store in `document_chunks` with document_id, chunk_index, embedding

Query flow:
1. Embed the user's question
2. pgvector cosine similarity search — top 5 chunks
3. Build context from chunks, include source titles
4. Pass to Claude with: chunks + question + "cite your sources"
5. Return answer with source document names

---

## Session End Checklist

At the end of every session, run through:
- [ ] Did you make any mistakes? Update the "Known Mistakes" section above.
- [ ] Did you discover anything about the codebase architecture? Document it.
- [ ] Is there a /techdebt note to add? Create one in `/tasks/techdebt.md`
- [ ] Did you add any new env vars? Add them to `.env.example` (not `.env.local`)

---

## Environment Variables Required

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # server-side only

# Google
VITE_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=       # server-side only

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=             # for embeddings
VITE_ANTHROPIC_API_KEY=     # browser-side AI calls (scheduling, RAG, general)
VITE_OPENAI_API_KEY=        # browser-side embeddings
```

---

## Plan Mode Rules

- ANY task with more than 3 steps: enter plan mode before touching code
- Architectural decisions (schema changes, new lib additions): plan mode mandatory
- If execution fails twice on the same problem: STOP, re-plan, do not brute-force
- Verification steps get their own plan — don't just build, prove it works
