# SESSION 9 — AI AGENT ENGINE & TOOL REGISTRY

Read CLAUDE.md first. You are building the core AI agent engine: a 
tool-using Claude agent that can read and write to every part of Life OS.

ENTER PLAN MODE IMMEDIATELY. Do not write a single line of code until 
you have a complete written plan reviewed step by step.

---

## ARCHITECTURE OVERVIEW

The agent uses Claude's native tool_use API. Each capability is a "tool" with:
  1. A JSON definition (name, description, input_schema) — what Claude sees
  2. An execute() function — calls existing lib/* wrappers only, no new data access
  3. MCP-compatible design: each tool module could be wrapped in an MCP transport 
     with zero changes to business logic (see MCP note below)

Agent loop:
  1. User sends message + optional AttachedContext (pinned notes/docs, tag scopes, 
     brain area scopes)
  2. Build system prompt with date, user snapshot, attached content injected inline
  3. Call Claude with all tools defined
  4. If Claude returns tool_use blocks: execute tools, return results, call Claude again
  5. Repeat up to 10 rounds max
  6. Persist user message + assistant response to ai_messages in Supabase
  7. Return AgentResponse to UI

---

## MCP COMPATIBILITY NOTE

Each tool module exports only:
  export const definition: Tool   (Anthropic SDK Tool type)
  export const execute: (input: unknown, userId: string) => Promise<unknown>

No React, no browser APIs, no Vite imports inside tool modules.
All tools must be runnable in a plain Node.js context.
A future MCP server will import these modules directly and register them 
with SSE/stdio transport — zero rework needed.

---

## PART A: ATTACHED CONTEXT TYPES

Define in /src/types/index.ts:

  interface AttachedNote {
    type: 'note'
    id: string
    title: string
    content: string  -- plain text, stripped from Tiptap JSON before passing
  }

  interface AttachedDocument {
    type: 'document'
    id: string
    title: string
    rawText: string  -- full raw_text from documents table (may be long, truncate 
                        to 8000 chars if needed with a "... [truncated]" notice)
  }

  interface TagScope {
    type: 'tag_scope'
    tags: string[]   -- note keyword search will be filtered to these tags
  }

  interface AreaScope {
    type: 'area_scope'
    areaIds: string[]
    areaNames: string[]  -- for display in system prompt
  }

  type ContextAttachment = AttachedNote | AttachedDocument | TagScope | AreaScope

  interface AgentContext {
    currentPage?: string
    currentNoteId?: string
    currentNoteTitle?: string
    attachments?: ContextAttachment[]
  }

---

## PART B: TOOL REGISTRY (/src/lib/agent-tools/)

### notes-tools.ts

  search_notes
    description: "Search the user's notes by keyword. Respects tag filters if provided."
    input: { 
      query: string, 
      limit?: number,       -- default 5
      folder_id?: string,
      tags?: string[]       -- if provided, only return notes with ALL of these tags
    }
    execute:
      Build Supabase query on notes table:
        .ilike on title and content (cast jsonb content to text for search)
        If tags provided: .contains('tags', tags)  -- Postgres array contains
        If folder_id provided: .eq('folder_id', folder_id)
        .limit(limit ?? 5)
        .order('updated_at', { ascending: false })
      Return: array of { id, title, preview (first 200 chars of text content), 
                         folder_id, tags, updated_at }

      IMPORTANT: If the AgentContext contains a TagScope attachment, the 
      agent's system prompt will instruct it to always pass those tags into 
      search_notes automatically. The tool itself just accepts the tags param.

  get_note
    description: "Get the full content of a specific note by ID"
    input: { note_id: string }
    execute: fetch note from Supabase, convert Tiptap JSON to plain text,
      return { id, title, content_text, tags, folder_id, updated_at }

  create_note
    description: "Create a new note. Executes immediately without confirmation."
    input: { title: string, content: string, folder_id?: string, tags?: string[] }
    execute: 
      Convert content string to minimal Tiptap JSON format:
        { type: 'doc', content: [{ type: 'paragraph', 
          content: [{ type: 'text', text: content }] }] }
      Insert into notes table. Return { id, title }.

  update_note
    description: "Update title, content, or tags of an existing note"
    input: { note_id: string, title?: string, content?: string, tags?: string[] }
    execute: update note in Supabase, return { id, title, updated_at }

  delete_note
    description: "Delete a note permanently. ALWAYS ask for user confirmation 
                  in your text response before calling this tool."
    input: { note_id: string, confirmed: boolean }
    execute:
      If confirmed !== true: 
        First fetch the note title, then return:
        { requires_confirmation: true, 
          message: "Are you sure you want to delete '{title}'? This cannot be undone." }
      If confirmed === true:
        Delete from Supabase. Return { deleted: true, title }.

### calendar-tools.ts

  get_events
    description: "Get calendar events for a date range"
    input: { start_date: string, end_date: string }
    execute: query calendar_events for user in date range, 
      return array of { id, title, start_time, end_time, description, location, color }

  create_event
    description: "Create a calendar event. Executes immediately without confirmation."
    input: { 
      title: string, 
      start_time: string,   -- ISO 8601
      end_time: string,     -- ISO 8601
      description?: string,
      location?: string 
    }
    execute: call google-calendar.ts createEvent(), sync to cache,
      return { id, title, start_time, end_time }

  update_event
    description: "Update an existing calendar event"
    input: { event_id: string, title?: string, start_time?: string, 
             end_time?: string, description?: string }
    execute: call Google Calendar API patch, update in Supabase cache,
      return updated event. No confirmation needed (edit action).

  delete_event
    description: "Delete a calendar event. ALWAYS confirm with user before calling."
    input: { event_id: string, confirmed: boolean }
    execute: same confirmation pattern as delete_note

  find_free_slots
    description: "Find available time slots in the calendar for scheduling"
    input: { duration_minutes: number, window_days?: number, after_date?: string }
    execute: call scheduling.ts findAvailableSlots() logic,
      return array of { start, end, label } — top 3 slots

### reminders-tools.ts

  get_reminders
    description: "Get reminders, optionally filtered by status or due date"
    input: { include_done?: boolean, due_before?: string }
    execute: query reminders table, return array of 
      { id, title, body, remind_at, recurrence, is_done }

  create_reminder
    description: "Create a new reminder. Executes immediately."
    input: { title: string, remind_at: string, body?: string, recurrence?: string }
    execute: insert into reminders, return { id, title, remind_at }

  complete_reminder
    description: "Mark a reminder as completed"
    input: { reminder_id: string }
    execute: update is_done = true, return { id, title, completed: true }

  delete_reminder
    description: "Delete a reminder. ALWAYS confirm with user before calling."
    input: { reminder_id: string, confirmed: boolean }
    execute: same confirmation pattern as delete_note

### brain-tools.ts

  search_brain
    description: "Semantic search over the user's second brain documents. 
                  Only call this when the user asks about stored knowledge, 
                  documents, or research — not for general questions."
    input: { 
      query: string, 
      area_ids?: string[],  -- if provided, scope to these brain areas only
      limit?: number        -- default 5
    }
    execute:
      Call embeddings.ts to embed the query.
      Call Supabase match_chunks RPC with embedding, userId, limit, 
        and filter_area_ids (pass area_ids if provided, else null).
      Build context from returned chunks.
      Call Claude (a SEPARATE single-turn call, not the agent loop) with:
        System: "Answer using only the provided document context. Cite sources."
        User: "Context:\n{chunks}\n\nQuestion: {query}"
      Return { answer: string, sources: [{title, documentId, areaNames}] }

      IMPORTANT: If AgentContext contains an AreaScope attachment, the system 
      prompt instructs Claude to always pass those area_ids when calling this tool.

  list_brain_areas
    description: "List the user's brain areas for use in search_brain filtering"
    input: {}
    execute: fetch brain_areas from Supabase,
      return array of { id, name, color, description }

  get_document
    description: "Get the full text content of a specific brain document"
    input: { document_id: string }
    execute: fetch document from documents table, return { id, title, raw_text, 
      source_type, url, areas: [{id, name}] }
      Truncate raw_text to 8000 chars if longer, append "[truncated — {N} chars total]"

### index.ts — AgentToolRegistry

  import all tool modules
  
  export const ALL_TOOLS: Tool[]
    -- flat array of all tool definitions for the Claude API call
  
  export async function executeTool(
    toolName: string,
    input: unknown,
    userId: string
  ): Promise<unknown>
    -- dispatch map: toolName → module.execute(input, userId)
    -- throw ToolNotFoundError if unknown tool name

---

## PART C: CONTEXT INJECTION (/src/lib/agent.ts)

buildSystemPrompt(userId: string, context?: AgentContext): Promise<string>

  Fetch cheaply (single query each, run in parallel with Promise.all):
    - Today's event count (calendar_events where date = today)
    - Due reminders count (reminders where remind_at <= now and is_done = false)
    - User display name from auth

  Inject attached context into the system prompt:

    For each AttachedNote in context.attachments:
      Append to system prompt:
      "--- ATTACHED NOTE: {title} ---\n{content}\n---"

    For each AttachedDocument in context.attachments:
      Append to system prompt:
      "--- ATTACHED DOCUMENT: {title} ---\n{rawText}\n---"

    For TagScope in context.attachments:
      Append to system prompt:
      "The user has scoped note searches to tags: {tags.join(', ')}.
       Always include tags: [{tags}] when calling search_notes."

    For AreaScope in context.attachments:
      Append to system prompt:
      "The user has scoped brain searches to areas: {areaNames.join(', ')}.
       Always include area_ids: [{areaIds}] when calling search_brain."

  Full system prompt structure:
  ---
  You are a personal AI assistant integrated into Life OS.
  Today is {day}, {date}. The time is {time}.
  User: {displayName}
  Snapshot: {N} events today, {M} reminders due.
  Current page: {currentPage}
  {if currentNoteId}: User is viewing note: "{currentNoteTitle}" (ID: {currentNoteId})

  {injected attachments block}

  You have tools to read and write notes, calendar events, reminders, and 
  search the user's second brain knowledge base.

  Tool usage rules:
  - search_brain: ONLY call when the user asks about stored documents or knowledge.
    Do not call it for general questions or things you can answer directly.
  - search_notes: call when user asks about their notes or wants to find something 
    they've written. Apply tag filters from context if present.
  - create_*/create actions: execute immediately, confirm with a brief summary.
  - delete_* actions: ALWAYS include a confirmation request in your text response 
    before calling the tool with confirmed: true. Never delete without confirmation.
  - update_*/edit actions: execute and summarise what changed.

  Be concise. Format responses in markdown. When you create or modify something,
  confirm it with one sentence.
  ---

runAgentTurn(
  userId: string,
  conversationId: string,
  userMessage: string,
  context?: AgentContext
): Promise<AgentResponse>

  Types:
    AgentResponse = {
      message: string
      toolCallsSummary: Array<{ toolName: string, summary: string }>
      requiresConfirmation?: { toolName: string, message: string }
    }

  Implementation:
  1. Insert user message into ai_messages (role: 'user')
  2. Fetch last 20 messages from conversation for history (ordered asc)
  3. Build system prompt (await buildSystemPrompt)
  4. Format message history for Anthropic API
  5. Agentic loop (max 10 iterations):
       Call Claude claude-sonnet-4-20250514:
         model, max_tokens: 4096, system, messages, tools: ALL_TOOLS
       If stop_reason === 'tool_use':
         For each tool_use block:
           result = await executeTool(tool.name, tool.input, userId)
           Append tool_result to messages
         Continue loop
       If stop_reason === 'end_turn' or no tool_use blocks: break
  6. Extract final text response from last message
  7. Collect toolCallsSummary from all tool_use blocks across all iterations:
       Map toolName to a human-readable summary:
         search_notes → "Searched notes"
         get_events → "Checked calendar"
         create_event → "Created calendar event"
         search_brain → "Searched knowledge base"
         etc.
  8. Insert assistant response into ai_messages:
       role: 'assistant', content: finalText,
       tool_calls: JSON.stringify(toolCallsSummary)
  9. Update ai_conversations.updated_at = now()
  10. Return AgentResponse

---

## PART D: CONVERSATION MANAGEMENT (/src/lib/conversations.ts)

createConversation(userId): Promise<Conversation>
  Insert into ai_conversations with title 'New conversation'

autoTitleConversation(conversationId, firstUserMessage): Promise<void>
  Fire-and-forget (do not await in the main turn):
  Call Claude with max_tokens: 20:
    "In 4 words or fewer, give a title for a conversation that starts with: 
     '{firstUserMessage}'. Reply with only the title, no punctuation."
  Update ai_conversations.title with response text.

getConversations(userId): Promise<Conversation[]>
  Fetch all, ordered by updated_at desc

getConversationMessages(conversationId): Promise<Message[]>
  Fetch all messages ordered by created_at asc

deleteConversation(conversationId): Promise<void>
  Delete conversation row (cascades to ai_messages via FK)

---

## Hooks (/src/hooks/)

useConversations():
  React Query, staleTime: 30s
  Returns: { conversations, isLoading, createConversation, deleteConversation }

useConversation(conversationId: string | null):
  React Query fetch of messages for conversation
  Returns: { messages, isLoading, sendMessage }
  sendMessage(text, context?) calls runAgentTurn, then invalidates query

---

## Verification
- [ ] "What notes do I have?" → agent calls search_notes, returns list
- [ ] "Create a note titled Test Agent with content Hello World"
  → agent calls create_note, note appears in Supabase notes table
- [ ] "What's on my calendar tomorrow?" → agent calls get_events
- [ ] "Remind me to call the dentist tomorrow at 9am" → create_reminder
- [ ] "Delete my note titled Test Agent"
  → agent asks for confirmation, does NOT delete yet
- [ ] Follow-up "Yes delete it" → deletes, confirms
- [ ] "What do I know about [topic in your second brain]?"
  → agent calls search_brain (NOT on a generic question)
- [ ] "What is 2+2?" → agent answers directly, zero tool calls
- [ ] Conversation history persists after page refresh
- [ ] tool_calls jsonb column populated correctly in ai_messages
- [ ] Auto-title fires after first turn, conversation title updates

Update CLAUDE.md with mistakes made and anything new learned.