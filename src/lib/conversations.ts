import Anthropic from '@anthropic-ai/sdk';
import { supabase } from './supabase';
import type { AiConversation, AiMessage } from '@/types';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function createConversation(userId: string): Promise<AiConversation> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      title: 'New conversation',
    })
    .select()
    .single();

  if (error) throw error;
  return data as AiConversation;
}

export async function autoTitleConversation(
  conversationId: string,
  firstUserMessage: string
): Promise<void> {
  // Fire and forget — generates a 4-word title
  (async () => {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        system:
          'Generate a 2-4 word title for this conversation. Respond with ONLY the title, no punctuation, no quotes.',
        messages: [{ role: 'user', content: firstUserMessage }],
      });

      const title =
        response.content[0].type === 'text' ? response.content[0].text.trim() : 'New conversation';

      await supabase
        .from('ai_conversations')
        .update({ title })
        .eq('id', conversationId);
    } catch {
      // Silently fail — title generation is non-critical
    }
  })();
}

export async function getConversations(userId: string): Promise<AiConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AiConversation[];
}

export async function getConversationMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AiMessage[];
}

export async function deleteConversation(conversationId: string): Promise<void> {
  // Delete messages first (no cascade in schema)
  await supabase.from('ai_messages').delete().eq('conversation_id', conversationId);

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId);

  if (error) throw error;
}
