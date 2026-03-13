import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Json } from '@/types/database';
import { supabase } from '../supabase';

// ---- Tiptap helpers ----

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
}

function tiptapToText(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const node = json as TiptapNode;
  const parts: string[] = [];
  if (node.text) parts.push(node.text);
  if (node.content) {
    for (const child of node.content) {
      parts.push(tiptapToText(child));
    }
  }
  return parts.join(' ');
}

function textToTiptap(text: string): object {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

// ---- Tool definitions ----

export const notesToolDefinitions: Tool[] = [
  {
    name: 'search_notes',
    description: 'Search through the user\'s notes by keyword, tags, or folder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Text to search for in note titles and content' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        folder_id: { type: 'string', description: 'Filter by folder ID' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_note',
    description: 'Retrieve the full content of a specific note by ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'The note ID' },
      },
      required: ['note_id'],
    },
  },
  {
    name: 'create_note',
    description: 'Create a new note with title and optional content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Note title' },
        content: { type: 'string', description: 'Note content in plain text' },
        folder_id: { type: 'string', description: 'Optional folder ID to place the note in' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_note',
    description: 'Update an existing note\'s title, content, or tags.',
    input_schema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'The note ID to update' },
        title: { type: 'string', description: 'New title (optional)' },
        content: { type: 'string', description: 'New content in plain text (optional)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags (optional)' },
      },
      required: ['note_id'],
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a note. Requires confirmation on first call.',
    input_schema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'The note ID to delete' },
        confirmed: { type: 'boolean', description: 'Set to true to confirm deletion' },
      },
      required: ['note_id'],
    },
  },
];

// ---- Tool implementations ----

interface SearchNotesInput {
  query: string;
  tags?: string[];
  folder_id?: string;
}

export async function search_notes(input: SearchNotesInput, userId: string): Promise<unknown> {
  let query = supabase
    .from('notes')
    .select('id, title, content, folder_id, tags, updated_at')
    .eq('user_id', userId);

  // Supabase JS client does not support column casts (e.g. content::text) inside
  // .or() filter strings — they generate invalid PostgREST syntax and return 400.
  // Title search is sufficient for the agent to locate notes by topic.
  if (input.query && input.query.trim() !== '') {
    query = query.ilike('title', `%${input.query.trim()}%`);
  }

  if (input.tags && input.tags.length > 0) {
    query = query.contains('tags', input.tags);
  }
  if (input.folder_id) {
    query = query.eq('folder_id', input.folder_id);
  }

  const { data, error } = await query.order('updated_at', { ascending: false }).limit(10);
  if (error) throw error;

  return (data ?? []).map((note) => ({
    id: note.id,
    title: note.title,
    preview: tiptapToText(note.content).slice(0, 200),
    folder_id: note.folder_id,
    tags: note.tags,
    updated_at: note.updated_at,
  }));
}

interface GetNoteInput {
  note_id: string;
}

export async function get_note(input: GetNoteInput, userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, folder_id, tags, updated_at')
    .eq('id', input.note_id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    content: tiptapToText(data.content),
    folder_id: data.folder_id,
    tags: data.tags,
    updated_at: data.updated_at,
  };
}

interface CreateNoteInput {
  title: string;
  content?: string;
  folder_id?: string;
  tags?: string[];
}

export async function create_note(input: CreateNoteInput, userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      title: input.title,
      content: (input.content ? textToTiptap(input.content) : textToTiptap('')) as Json,
      folder_id: input.folder_id ?? null,
      tags: input.tags ?? [],
    })
    .select('id, title, folder_id, tags, updated_at')
    .single();

  if (error) throw error;
  return { id: data.id, title: data.title, folder_id: data.folder_id, tags: data.tags };
}

interface UpdateNoteInput {
  note_id: string;
  title?: string;
  content?: string;
  tags?: string[];
}

export async function update_note(input: UpdateNoteInput, userId: string): Promise<unknown> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.content !== undefined) updates.content = textToTiptap(input.content);
  if (input.tags !== undefined) updates.tags = input.tags;

  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', input.note_id)
    .eq('user_id', userId)
    .select('id, title, tags, updated_at')
    .single();

  if (error) throw error;
  return { id: data.id, title: data.title, tags: data.tags, updated: true };
}

interface DeleteNoteInput {
  note_id: string;
  confirmed?: boolean;
}

export async function delete_note(input: DeleteNoteInput, userId: string): Promise<unknown> {
  if (input.confirmed !== true) {
    const { data } = await supabase
      .from('notes')
      .select('title')
      .eq('id', input.note_id)
      .eq('user_id', userId)
      .single();

    return {
      requires_confirmation: true,
      message: `Are you sure you want to delete "${data?.title ?? 'this note'}"? This cannot be undone.`,
    };
  }

  const { data: note } = await supabase
    .from('notes')
    .select('title')
    .eq('id', input.note_id)
    .eq('user_id', userId)
    .single();

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', input.note_id)
    .eq('user_id', userId);

  if (error) throw error;
  return { deleted: true, title: note?.title ?? 'Note' };
}
