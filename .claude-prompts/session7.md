# SESSION 7 — SCHEMA UPGRADES + NOTES & BRAIN POLISH

Read CLAUDE.md first. This session has two parts: database schema upgrades 
to support new features, and fixing the Notes app UX gaps identified in review.

Enter plan mode before touching any code — this session modifies the schema.

---

## PART A: SCHEMA MIGRATIONS

### Migration 00006_ai_conversations.sql
Create tables to persist AI assistant conversation history:

  ai_conversations:
    id uuid primary key default gen_random_uuid()
    user_id uuid references auth.users not null
    title text not null default 'New conversation'
    created_at timestamptz default now()
    updated_at timestamptz default now()

  ai_messages:
    id uuid primary key default gen_random_uuid()
    conversation_id uuid references ai_conversations(id) on delete cascade not null
    user_id uuid references auth.users not null
    role text not null  -- 'user' | 'assistant'
    content text not null
    tool_calls jsonb null  -- stores tool invocations for display
    created_at timestamptz default now()

RLS on both: user_id = auth.uid()
Index ai_messages on (conversation_id, created_at)
Index ai_conversations on (user_id, updated_at desc)

### Migration 00007_brain_areas.sql
Create brain areas system (separate from document tags):

  brain_areas:
    id uuid primary key default gen_random_uuid()
    user_id uuid references auth.users not null
    name text not null
    description text null
    color text null  -- hex color for UI badge
    icon text null   -- lucide icon name string
    created_at timestamptz default now()

  document_areas:  -- many-to-many join table
    document_id uuid references documents(id) on delete cascade not null
    area_id uuid references brain_areas(id) on delete cascade not null
    primary key (document_id, area_id)
    user_id uuid references auth.users not null  -- for RLS

RLS on brain_areas and document_areas: user_id = auth.uid()

Also add to documents table:
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS description text null;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_count int default 0;

Update match_chunks function to accept optional area filter:
  DROP FUNCTION IF EXISTS match_chunks CASCADE;
  CREATE FUNCTION match_chunks(
    query_embedding vector(1536),
    match_user_id uuid,
    match_count int,
    filter_area_ids uuid[] DEFAULT NULL
  )
  RETURNS TABLE(
    id uuid, content text, document_id uuid, document_title text,
    chunk_index int, similarity float
  )
  LANGUAGE plpgsql AS $$
  BEGIN
    RETURN QUERY
    SELECT 
      dc.id, dc.content, dc.document_id, d.title as document_title,
      dc.chunk_index,
      1 - (dc.embedding <=> query_embedding) as similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE dc.user_id = match_user_id
      AND (
        filter_area_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM document_areas da 
          WHERE da.document_id = dc.document_id 
          AND da.area_id = ANY(filter_area_ids)
        )
      )
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;

### After all migrations:
Regenerate TypeScript types using Supabase MCP generate_typescript_types tool.
Write output to src/types/database.ts. Confirm zero TypeScript errors.

---

## PART B: NOTES UX FIXES

### 1. Right-click context menus
Use shadcn ContextMenu primitives (check if already installed, install if not).

For notes in the notes list — right-click shows:
  - Open note
  - Rename (inline edit of title in the list)
  - Move to folder → submenu showing full folder tree + "No folder (root)"
  - Duplicate
  - Delete (confirm dialog: "Delete this note? This cannot be undone.")

For folders in the folder tree — right-click shows:
  - New note in this folder
  - New subfolder
  - Rename (inline edit)
  - Move to → submenu showing other folders + "Move to root"
  - Delete folder (confirm: "Delete folder and all its notes?" — destructive)

Apply zinc-900/zinc-800 dark styling consistent with the rest of the app.

### 2. Drag-and-drop for notes and folders
Install: npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

Notes:
  - Drag a note and drop onto a folder → moves note to that folder
  - Drop indicator: folder highlights with violet-500 ring on hover
  - On drop: updateNote({ folder_id: targetFolderId })

Folders:
  - Drag a folder onto another folder → makes it a subfolder
  - Drag a folder to root area → moves to root (parent_id = null)
  - Prevent circular nesting (cannot drop into own descendant)
  - On drop: updateFolder({ parent_id: targetFolderId | null })

### 3. Delete note
Add to NoteEditor header: trash icon button (right side).
Add keyboard shortcut: Cmd+Delete when editor focused.
Confirm dialog before deletion. On confirm: delete from Supabase, 
navigate to next note in list or empty state.

### 4. Note folder breadcrumb
In NoteEditor header, show: "Notes / {folder name}" or "Notes / Unfiled"
Clicking the breadcrumb opens a folder picker popover to move the note.

---

## PART C: SECOND BRAIN AREAS UI

### Areas sidebar (left panel, 220px wide):
  - "All Areas" option at top (default, shows all documents)
  - List of brain_areas with color dot + name + doc count badge
  - Click area → filters document library to that area
  - "+" button → create new area (name input, color picker, optional icon)
  - Right-click area → rename, change color, delete
  
### Document upload — area assignment:
  Multi-select area picker in the upload modal.
  After processing, insert rows into document_areas join table.
  Update documents.chunk_count after all chunks are inserted.

### Document cards:
  Show area badges (small colored pills). 
  "Edit areas" option on card → opens area multi-select popover.

### Hooks:
  useBrainAreas() — fetch all areas, mutations: create/update/delete area
  useDocumentAreas(documentId) — fetch areas for a doc, update areas mutation

---

## Verification
- [ ] Run migrations, confirm all new tables exist in Supabase
- [ ] Confirm match_chunks returns only docs in filtered areas when area_ids passed
- [ ] Regenerate types, zero TypeScript errors
- [ ] Right-click note → all menu options appear and work
- [ ] Drag note into folder → note moves, list updates correctly
- [ ] Delete note → confirmation, removed from Supabase
- [ ] Create brain area → appears in sidebar with correct color
- [ ] Upload doc with area assigned → area badge appears on card
- [ ] Zero console errors on all pages

Update CLAUDE.md with mistakes made and anything new learned.