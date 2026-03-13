# SESSION 8 — AREA PICKER + RAG SCOPING + BRAIN CHAT

Read CLAUDE.md first. This session wires up the brain area scoping system 
to the RAG query pipeline, and builds the @ mention area picker UX in the 
Second Brain query bar.

Enter plan mode before touching code.

---

## PART A: @ MENTION AREA PICKER COMPONENT

Create /src/components/brain/AreaMentionInput.tsx

This is a specialised textarea/input that intercepts "@" keypresses:

Behaviour:
  - User types normally in the query input
  - When user types "@", a floating popover appears above the cursor
  - Popover shows list of brain_areas filtered by what user types after "@"
    e.g. "@trail" → shows "Trail Running" area
  - Arrow keys navigate the list, Enter selects, Escape dismisses
  - Selected area appears as a coloured pill/chip inline in the input text
    (visually replace "@trailrunning" with a pill showing the area name + color)
  - Multiple areas can be mentioned: "@running @ml what techniques..."
  - Backspace on a pill removes it
  - If user types "@all" or selects "All Areas" option → clears specific filters

Implementation approach:
  - Use a contenteditable div (not a plain <textarea>) to support inline pills
  - OR: use a two-layer approach — display div with pills overlaid, hidden input
    stores the raw text for extraction. Whichever is cleaner to implement.
  - Export: { text: string, selectedAreaIds: string[] } from the component
  - The popover uses shadcn Popover + Command primitives for the fuzzy list
  - Keyboard accessibility is required

Also add a fallback UI: below the query input, show small area filter checkboxes
(collapsed by default, "Filter by area ▾" toggle) as an alternative to @ syntax.

---

## PART B: RAG SCOPING IN THE QUERY PIPELINE

Update /src/lib/embeddings.ts and /src/lib/ai.ts:

querySecondBrain(userId, question, areaIds?: string[]): Promise<KnowledgeAnswer>
  - If areaIds is empty/undefined → pass NULL to match_chunks (searches all)
  - If areaIds provided → pass the array to match_chunks filter_area_ids param
  - The updated match_chunks function from Session 7 handles the filtering in SQL
  - Everything else (embedding, context building, Claude call) stays the same
  - Include area names in the source citations:
    Return sources as: { title, documentId, areaNames: string[] }

Update the Second Brain page query bar to use AreaMentionInput and pass 
selectedAreaIds through to querySecondBrain.

---

## PART C: SECOND BRAIN PAGE — DEDICATED CHAT BOT

The Second Brain page (/src/app/brain/BrainPage.tsx) should have its own 
persistent chat interface (separate from the global AI assistant):

Layout update — add a right panel (chat, 380px wide) alongside the existing 
document library:

BrainChat component (/src/components/brain/BrainChat.tsx):
  - Header: "Brain Chat" with a small brain icon
  - Message history: scrollable, shows user questions + AI answers
  - Sources section under each AI answer: collapsible, shows which docs/chunks 
    were used (document title, area badges, similarity score as %)
  - Query input at bottom: uses AreaMentionInput component
  - Session-only history (no Supabase persistence — this is intentional, 
    unlike the global AI assistant which is persistent)
  - "Clear chat" button in header
  - Loading state: animated "Searching your brain..." with a subtle pulse

This chat ONLY calls querySecondBrain — it does not have access to other 
tools. Make this clear in the UI header: "Answers from your documents only"

---

## Verification
- [ ] Type "@" in the brain query bar → popover appears with area list
- [ ] Type "@run" → list filters to matching areas
- [ ] Select an area → pill appears in input
- [ ] Submit query with area filter → only documents in that area are searched
  (verify by checking which doc chunks come back — should only be from docs 
  assigned to selected areas)
- [ ] Submit query with no area filter → searches all documents
- [ ] Source citations show area names
- [ ] Brain Chat history displays correctly
- [ ] Clearing chat resets to empty state

Update CLAUDE.md with mistakes made and anything new learned.