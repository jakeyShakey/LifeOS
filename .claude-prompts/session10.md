# SESSION 10 — AI ASSISTANT UI 

Read CLAUDE.md first. Build the AI Assistant UI: the global modal, the full 
conversation history page, and the # context picker.

---

## PART A: SMART CONTEXT INPUT COMPONENT
/src/components/ai/ContextInput.tsx

This is the shared input used in both the modal and the full-page assistant.
It's a rich textarea that handles three types of # triggers.

Behaviour:
  - User types normally
  - When user types "#", a floating Command-style popover appears
  - Popover has three tabs:
      "Notes"     — live search over user notes by title as user types
      "Documents" — live search over documents table by title
      "Tags"      — list all unique tags from user's notes
  - Arrow keys navigate, Enter selects, Escape closes
  - Tab key switches between the three tabs in the popover

Selection outcomes (different per type):
  NOTES tab selection:
    → Fetch full note content (get_note), 
    → Add an AttachedNote chip in the input area:
       📄 {note title}  ×
    → The note's full text will be injected into agent system prompt

  DOCUMENTS tab selection:
    → Fetch document raw_text from documents table
    → Truncate to 8000 chars if needed
    → Add an AttachedDocument chip:
       📎 {doc title}  ×

  TAGS tab selection:
    → Adds a tag scope filter (NOT a content attachment — different visual):
    → Add a TagScope chip with a filter icon:
       🏷 {tag name}  ×
    → Multiple tags can be selected (each adds a chip)
    → When present, agent system prompt instructs search_notes to filter by these tags

The raw "#sometext" is removed from the textarea after selection.
The actual message text sent to the agent is the textarea content 
with all # triggers removed (chips are tracked separately in component state).

Export from component:
  { 
    messageText: string,            -- clean text without # syntax
    attachments: ContextAttachment[]  -- all chips as typed attachments
  }

Also support @ for brain area scoping (from Session 8 design — reuse the 
same popover pattern, different trigger character, shows brain_areas list):
  → AreaScope chip: 🔬 {area name}  ×
  → When present, instructs search_brain to filter by these area IDs

Visual design for chips (all inline in textarea area, above the text input):
  - Chips sit in a flex-wrap row above the text input line
  - Note/Doc chips: zinc-800 bg, violet-400 border, 📄/📎 icon, title, × button
  - Tag scope chips: zinc-800 bg, emerald-500 border, 🏷 icon, tag name, × button
  - Area scope chips: zinc-800 bg, amber-500 border, 🔬 icon, area name, × button
  - The border color difference makes it immediately clear which chips are 
    "content attachments" vs "scope filters"
  - Clicking × removes chip and clears scope/attachment

Loading behaviour:
  When Notes/Docs tab is shown, debounce search by 200ms as user types after "#".
  Show a small spinner in the popover while fetching.
  If no results: "No notes found" / "No documents found" / "No tags yet"

---

## PART B: GLOBAL AI ASSISTANT MODAL
/src/components/ai/AssistantModal.tsx

Trigger:
  - Keyboard shortcut: Cmd+Shift+A (global listener in App.tsx)
  - "AI Assistant" button in sidebar (SparklesIcon + label)
  - Register in App.tsx as always-mounted global component (like QuickCaptureModal)

Layout: right-side drawer, 480px wide, full viewport height, slides in from right.
Not a blocking overlay — user can see and interact with app behind it.

Structure:
  Header (48px):
    SparklesIcon + "AI Assistant"
    Conversation dropdown (shows title of active convo, click to switch)
    "Open full page →" link → navigates to /ai
    Close button (×)

  Conversation switcher dropdown:
    Shows last 5 conversations by updated_at
    "New conversation" option at top
    Selecting one loads that conversation's messages

  Message list (flex-grow, scrollable):
    User messages: right-aligned, violet-600 bubble, rounded-2xl
    Assistant messages: left-aligned, zinc-800 bubble, markdown rendered 
      (use react-markdown or similar — check if already installed, install if not)
    Tool call indicators: between messages (or under assistant message),
      small collapsible row:
        "Used: 🔍 Searched notes · 📅 Checked calendar"  ▾
        Collapsed by default. Expand to see each tool + brief summary.
    Loading indicator: three animated dots in a zinc-800 bubble on the left

  Input area (shrink-0, bottom):
    ContextInput component (from Part A)
    Send button (violet-500) — right of textarea
    Cmd+Enter to send
    Small context indicator above input (read from AgentContextStore):
      If on notes page with note open: "📝 {note title}"
      If on calendar page: "📅 Calendar"
      If on brain page: "🧠 Second Brain"
      etc.

Active conversation state:
  On mount: load most recent conversation, or create one if none exist
  On "New conversation": call createConversation, set as active
  On send: call useConversation.sendMessage(text, {
    ...agentContextStore state,
    attachments: contextInput.attachments
  })

---

## PART C: FULL AI ASSISTANT PAGE
/src/app/ai/AIAssistantPage.tsx

Add route /ai in App.tsx.

Layout: two-panel

Left panel (260px, dark sidebar):
  "New Conversation" button — violet-500, full width, top
  Search input — filter conversations by title
  Conversation list:
    Each item: title (truncated), relative timestamp ("2h ago")
    Active: violet-950 bg + violet-500 left border
    Right-click → "Rename", "Delete" (confirm dialog)
    Click → load conversation in right panel
  Empty state: "No conversations yet."

Right panel (flex-grow):
  If no conversation selected:
    Centered empty state:
      SparklesIcon (large, violet-400)
      "How can I help you today?"
      Grid of 4 suggestion pills (click → pre-fill input and send):
        "What's on my calendar this week?"
        "Summarise my recent notes"
        "Find deep work slots for tomorrow"
        "What do I know about [topic]?"

  If conversation selected:
    Conversation title (top, inline editable on click)
    Scrollable message list (same MessageList component as modal)
    "Scroll to bottom" FAB (ChevronDown) — appears only when scrolled up >200px
    ContextInput at bottom — identical to modal, same behaviour

Shared components (create these, used by both modal and full page):
  /src/components/ai/MessageList.tsx
    Props: { messages: Message[], isLoading: boolean }
    Renders all messages with tool indicators, markdown, loading dots
  
  /src/components/ai/ToolCallIndicator.tsx
    Props: { toolCalls: ToolCallSummary[] }
    Collapsible row showing tools used in a turn

  /src/components/ai/ChatInput.tsx  (wraps ContextInput + send button)
    Props: { onSend: (text, attachments) => void, isLoading: boolean }

---

## PART D: AGENT CONTEXT STORE
/src/stores/agentContext.ts (Zustand)

  interface AgentContextStore {
    currentPage: string
    currentNoteId: string | null
    currentNoteTitle: string | null
    setCurrentPage: (page: string) => void
    setCurrentNote: (id: string | null, title: string | null) => void
  }

Wire up:
  AppLayout or a route-change useEffect: call setCurrentPage(pathname) on 
    every route change (use useLocation from react-router-dom)
  NoteEditor: call setCurrentNote(note.id, note.title) on mount,
    setCurrentNote(null, null) on unmount

The AssistantModal reads this store and:
  1. Displays the context chip in the input area
  2. Passes { currentPage, currentNoteId, currentNoteTitle } to runAgentTurn

---

## PART E: REMAINING INTEGRATIONS

Sidebar update:
  Add "AI Assistant" nav item with SparklesIcon between Reminders and Settings
  Also add a small sparkle icon button at top of sidebar (icon only) 
    that opens the modal (different from the nav link which goes to /ai page)

Keyboard shortcuts:
  Cmd+Shift+A → toggle AssistantModal (add to App.tsx global listener)
  Add to ShortcutsModal: "Open AI Assistant    ⌘⇧A"

CommandPalette (Cmd+K):
  Add commands: "Open AI Assistant" (opens modal), 
                "New AI Conversation" (navigates to /ai, creates new convo)

Dashboard AI bar:
  Wire to real agent using a persistent "Dashboard" conversation.
  On first use: createConversation with title "Dashboard Assistant".
  Store this conversation ID in a stable location (e.g. localStorage key 
  'dashboard_conversation_id' — acceptable for a non-sensitive ID).
  On submit: call runAgentTurn with the dashboard conversation ID.
  Show response inline in the dashboard bar.
  Add "Continue in AI Assistant →" link after response — opens modal 
    loaded with the dashboard conversation.

---

## Verification
- [ ] Cmd+Shift+A opens modal from every page
- [ ] Type # in ContextInput → popover opens with Notes/Documents/Tags tabs
- [ ] Search in Notes tab → results filter as you type
- [ ] Select a note → chip appears with violet border, note content injected into next turn
- [ ] Select a tag → chip appears with emerald border, next search_notes call 
      uses that tag filter (verify in network/console that tag is passed)
- [ ] Select a brain area with @ → chip appears with amber border, search_brain 
      scoped correctly
- [ ] Remove a chip with × → scope/attachment cleared
- [ ] Tool call indicator shows after a response that used tools, collapses/expands
- [ ] Full page /ai — conversation list loads, switching conversations works
- [ ] New conversation button creates conversation, auto-titles after first turn
- [ ] Suggestion pills on empty state send message on click
- [ ] Inline rename of conversation title works
- [ ] Right-click → delete conversation → confirm → conversation removed
- [ ] Context chip in modal updates when navigating between pages
- [ ] Context chip shows note title when a note is open
- [ ] Dashboard AI bar works end-to-end with real agent response
- [ ] Zero TypeScript errors, zero console errors

Update CLAUDE.md with full architecture notes: agent tool registry, 
MCP compatibility design, context injection pattern, attachment types.
Note any tech debt for future sessions.