import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabase } from './supabase';
import { parseSchedulingIntent, findAvailableSlots } from './scheduling';
import type { AIResponse, KnowledgeSource } from '@/types';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SCHEDULING_KEYWORDS = [
  'schedule',
  'block',
  'time',
  'hour',
  'minutes',
  'meeting',
  'book',
  'slot',
  'fit in',
  'find time',
  'when can',
];

const KNOWLEDGE_KEYWORDS = [
  'what did i',
  'find',
  'search',
  'notes about',
  'tell me about',
  'do i have',
  'summarise',
  'summarize',
];

export async function handleDashboardQuery(userId: string, query: string): Promise<AIResponse> {
  const lower = query.toLowerCase();

  const isScheduling = SCHEDULING_KEYWORDS.some((kw) => lower.includes(kw));
  const isKnowledge = KNOWLEDGE_KEYWORDS.some((kw) => lower.includes(kw));

  if (isScheduling) {
    const intent = await parseSchedulingIntent(query);
    const slots = await findAvailableSlots(userId, intent);
    return { type: 'scheduling_options', slots };
  }

  if (isKnowledge) {
    const { answer, sources } = await querySecondBrain(userId, query);
    return { type: 'knowledge_answer', answer, sources };
  }

  // General answer
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system:
      'You are a personal productivity assistant inside Life OS. ' +
      'Answer the user\'s question concisely and helpfully.',
    messages: [{ role: 'user', content: query }],
  });

  const answer =
    message.content[0].type === 'text' ? message.content[0].text : 'No response generated.';

  return { type: 'general_answer', answer };
}

export async function querySecondBrain(
  userId: string,
  question: string
): Promise<{ answer: string; sources: KnowledgeSource[] }> {
  // Embed the question
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: question,
  });
  const embedding = embeddingResponse.data[0].embedding;
  const pgvectorStr = `[${embedding.join(',')}]`;

  // Search chunks
  const { data: chunks, error } = await supabase.rpc('match_chunks', {
    query_embedding: pgvectorStr,
    match_user_id: userId,
    match_count: 5,
  });

  if (error) throw error;

  if (!chunks || chunks.length === 0) {
    return {
      answer: 'I couldn\'t find any relevant information in your Second Brain.',
      sources: [],
    };
  }

  // Build context
  const context = (chunks as Array<{ content: string; document_id: string; document_title?: string }>)
    .map((c, i) => `[${i + 1}] ${c.document_title ?? 'Untitled'}: ${c.content}`)
    .join('\n\n');

  // Ask Claude
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system:
      'You are a personal knowledge assistant. Answer the question using only the provided context. ' +
      'Cite your sources by referencing the document titles in brackets.',
    messages: [
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  const answer =
    message.content[0].type === 'text' ? message.content[0].text : 'No answer generated.';

  // Deduplicate sources by document_id
  const seen = new Set<string>();
  const sources: KnowledgeSource[] = [];
  for (const chunk of chunks as Array<{ document_id: string; document_title?: string }>) {
    if (!seen.has(chunk.document_id)) {
      seen.add(chunk.document_id);
      sources.push({
        document_id: chunk.document_id,
        title: chunk.document_title ?? 'Untitled',
      });
    }
  }

  return { answer, sources };
}
