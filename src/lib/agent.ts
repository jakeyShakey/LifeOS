import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { supabase } from './supabase';
import { ALL_TOOLS, executeTool, TOOL_SUMMARIES } from './agent-tools';
import type { AgentContext, AgentResponse } from '@/types';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = 'claude-sonnet-4-20250514';
const MAX_ITERATIONS = 10;

async function buildSystemPrompt(userId: string, context?: AgentContext): Promise<string> {
  // Parallel fetch context data
  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [eventsResult, remindersResult, profileResult] = await Promise.allSettled([
    supabase
      .from('calendar_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('start_time', todayStart.toISOString())
      .lte('end_time', todayEnd.toISOString()),
    supabase
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_done', false)
      .lte('remind_at', today.toISOString()),
    supabase.auth.getUser(),
  ]);

  const eventCount =
    eventsResult.status === 'fulfilled' ? (eventsResult.value.count ?? 0) : 0;
  const dueReminderCount =
    remindersResult.status === 'fulfilled' ? (remindersResult.value.count ?? 0) : 0;
  const displayName =
    profileResult.status === 'fulfilled'
      ? (profileResult.value.data.user?.user_metadata?.full_name ??
         profileResult.value.data.user?.email ??
         'the user')
      : 'the user';

  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let prompt = `You are a personal AI agent inside Life OS, a personal productivity application for ${displayName}.

Today is ${dateStr}.
Today's calendar: ${eventCount} event${eventCount !== 1 ? 's' : ''}.
Overdue reminders: ${dueReminderCount}.

You have access to tools to read and write the user's notes, calendar events, reminders, and Second Brain documents. Use them proactively to help.

Guidelines:
- When asked about notes, calendar, reminders, or knowledge — always use the appropriate tool rather than guessing.
- For destructive actions (delete), always confirm with the user first by calling the tool without confirmed:true. If the tool returns requires_confirmation, relay that message to the user.
- Be concise and action-oriented. After completing a task, summarise what you did.
- When creating or updating, confirm what was done.
- For scheduling, use find_free_slots to surface options before creating events.`;

  // Inject current page context
  if (context?.currentPage) {
    prompt += `\n\nThe user is currently on the ${context.currentPage} page.`;
  }
  if (context?.currentNoteId && context.currentNoteTitle) {
    prompt += `\nThey have note "${context.currentNoteTitle}" (ID: ${context.currentNoteId}) open.`;
  }

  // Inject attachments
  if (context?.attachments && context.attachments.length > 0) {
    prompt += '\n\n--- ATTACHED CONTEXT ---';
    for (const attachment of context.attachments) {
      if (attachment.type === 'note') {
        prompt += `\n\n[Note: ${attachment.title}]\n${attachment.content}`;
      } else if (attachment.type === 'document') {
        prompt += `\n\n[Document: ${attachment.title}]\n${attachment.rawText.slice(0, 4000)}`;
      } else if (attachment.type === 'tag_scope') {
        prompt += `\n\nScope all note searches to tags: ${attachment.tags.join(', ')}`;
      } else if (attachment.type === 'area_scope') {
        prompt += `\n\nScope all Second Brain queries to areas: ${attachment.areaNames.join(', ')} (IDs: ${attachment.areaIds.join(', ')})`;
      }
    }
    prompt += '\n--- END ATTACHED CONTEXT ---';
  }

  return prompt;
}

export async function runAgentTurn(
  userId: string,
  conversationId: string,
  userMessage: string,
  context?: AgentContext
): Promise<AgentResponse> {
  // 1. Insert user message
  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    user_id: userId,
    role: 'user',
    content: userMessage,
  });

  // 2. Fetch conversation history (last 20 messages)
  const { data: historyRows } = await supabase
    .from('ai_messages')
    .select('role, content, tool_calls')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20);

  const history: MessageParam[] = (historyRows ?? []).map((row) => ({
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
  }));

  // 3. Build system prompt
  const systemPrompt = await buildSystemPrompt(userId, context);

  // 4. Agentic loop
  const toolCallsSummary: Array<{ toolName: string; summary: string }> = [];
  let finalMessage = '';
  const messages: MessageParam[] = [...history];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: ALL_TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      // Extract text response
      const textBlock = response.content.find((b) => b.type === 'text');
      finalMessage = textBlock?.type === 'text' ? textBlock.text : '';
      break;
    }

    if (response.stop_reason === 'tool_use') {
      // Add assistant message to history
      messages.push({ role: 'assistant', content: response.content });

      // Execute all tool calls in parallel
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          if (block.type !== 'tool_use') return null;

          const toolName = block.name;
          let resultContent: string;

          try {
            const result = await executeTool(toolName, block.input, userId);
            resultContent = JSON.stringify(result);
            toolCallsSummary.push({
              toolName,
              summary: TOOL_SUMMARIES[toolName] ?? toolName,
            });
          } catch (err) {
            resultContent = JSON.stringify({
              error: err instanceof Error ? err.message : 'Tool execution failed',
            });
          }

          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: resultContent,
          };
        })
      );

      const validResults = toolResults.filter(Boolean) as Array<{
        type: 'tool_result';
        tool_use_id: string;
        content: string;
      }>;

      messages.push({ role: 'user', content: validResults });
      continue;
    }

    // Unexpected stop reason — break
    break;
  }

  // 5. Insert assistant response
  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    user_id: userId,
    role: 'assistant',
    content: finalMessage,
    tool_calls: toolCallsSummary.length > 0 ? (toolCallsSummary as unknown as import('@/types/database').Json) : null,
  });

  // 6. Update conversation updated_at
  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return {
    message: finalMessage,
    toolCallsSummary,
  };
}
