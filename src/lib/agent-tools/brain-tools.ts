import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { supabase } from '../supabase';
import { querySecondBrain } from '../ai';

// ---- Tool definitions ----

export const brainToolDefinitions: Tool[] = [
  {
    name: 'search_brain',
    description: 'Search the Second Brain knowledge base and get an AI-generated answer with cited sources.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The question or topic to search for' },
        area_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of brain area IDs to scope the search',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_brain_areas',
    description: 'List all brain areas (knowledge categories) the user has created.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_document',
    description: 'Get the full content of a specific document from the Second Brain.',
    input_schema: {
      type: 'object' as const,
      properties: {
        document_id: { type: 'string', description: 'The document ID' },
      },
      required: ['document_id'],
    },
  },
];

// ---- Tool implementations ----

interface SearchBrainInput {
  query: string;
  area_ids?: string[];
}

export async function search_brain(input: SearchBrainInput, userId: string): Promise<unknown> {
  const result = await querySecondBrain(
    userId,
    input.query,
    input.area_ids?.length ? input.area_ids : undefined
  );
  return { answer: result.answer, sources: result.sources };
}

export async function list_brain_areas(_input: unknown, userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('brain_areas')
    .select('id, name, color, description')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

interface GetDocumentInput {
  document_id: string;
}

export async function get_document(input: GetDocumentInput, userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, source_type, url, created_at')
    .eq('id', input.document_id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  // Fetch associated areas
  const { data: areaLinks } = await supabase
    .from('document_areas')
    .select('brain_areas(id, name, color)')
    .eq('document_id', input.document_id);

  const areas = (areaLinks ?? []).map((link) => {
    const area = (link as { brain_areas: { id: string; name: string; color: string } | null }).brain_areas;
    return area ?? null;
  }).filter(Boolean);

  // Reconstruct raw text from chunks (sorted by chunk_index)
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('content, chunk_index')
    .eq('document_id', input.document_id)
    .order('chunk_index', { ascending: true });

  const rawText = (chunks ?? []).map((c) => c.content as string).join(' ');
  const truncated = rawText.length > 8000;
  const displayText = truncated ? rawText.slice(0, 8000) : rawText;

  return {
    id: data.id,
    title: data.title,
    source_type: data.source_type,
    url: data.url,
    raw_text: truncated ? `${displayText}\n[truncated — ${rawText.length} chars total]` : displayText,
    areas,
    created_at: data.created_at,
  };
}
