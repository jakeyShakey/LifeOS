import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { supabase } from '../supabase';

// ---- Tool definitions ----

export const remindersToolDefinitions: Tool[] = [
  {
    name: 'get_reminders',
    description: 'Get the user\'s reminders.',
    input_schema: {
      type: 'object' as const,
      properties: {
        include_done: { type: 'boolean', description: 'Include completed reminders (default false)' },
        due_before: { type: 'string', description: 'ISO 8601 date — only return reminders due before this time' },
      },
    },
  },
  {
    name: 'create_reminder',
    description: 'Create a new reminder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Reminder title' },
        remind_at: { type: 'string', description: 'ISO 8601 date/time to remind' },
        body: { type: 'string', description: 'Optional additional notes' },
        recurrence: {
          type: 'string',
          enum: ['none', 'daily', 'weekly', 'monthly'],
          description: 'Recurrence pattern (default none)',
        },
      },
      required: ['title', 'remind_at'],
    },
  },
  {
    name: 'complete_reminder',
    description: 'Mark a reminder as complete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reminder_id: { type: 'string', description: 'The reminder ID to mark as done' },
      },
      required: ['reminder_id'],
    },
  },
  {
    name: 'delete_reminder',
    description: 'Delete a reminder. Requires confirmation on first call.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reminder_id: { type: 'string', description: 'The reminder ID to delete' },
        confirmed: { type: 'boolean', description: 'Set to true to confirm deletion' },
      },
      required: ['reminder_id'],
    },
  },
];

// ---- Tool implementations ----

interface GetRemindersInput {
  include_done?: boolean;
  due_before?: string;
}

export async function get_reminders(input: GetRemindersInput, userId: string): Promise<unknown> {
  let query = supabase
    .from('reminders')
    .select('id, title, body, remind_at, is_done, recurrence, created_at')
    .eq('user_id', userId);

  if (!input.include_done) {
    query = query.eq('is_done', false);
  }
  if (input.due_before) {
    query = query.lte('remind_at', input.due_before);
  }

  const { data, error } = await query.order('remind_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

interface CreateReminderInput {
  title: string;
  remind_at: string;
  body?: string;
  recurrence?: string;
}

export async function create_reminder(input: CreateReminderInput, userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      title: input.title,
      remind_at: input.remind_at,
      body: input.body ?? null,
      recurrence: (input.recurrence ?? 'none') as 'none' | 'daily' | 'weekly' | 'monthly',
      is_done: false,
    })
    .select('id, title, remind_at, recurrence')
    .single();

  if (error) throw error;
  return { id: data.id, title: data.title, remind_at: data.remind_at, recurrence: data.recurrence };
}

interface CompleteReminderInput {
  reminder_id: string;
}

export async function complete_reminder(input: CompleteReminderInput, userId: string): Promise<unknown> {
  const { error } = await supabase
    .from('reminders')
    .update({ is_done: true })
    .eq('id', input.reminder_id)
    .eq('user_id', userId);

  if (error) throw error;
  return { completed: true, reminder_id: input.reminder_id };
}

interface DeleteReminderInput {
  reminder_id: string;
  confirmed?: boolean;
}

export async function delete_reminder(input: DeleteReminderInput, userId: string): Promise<unknown> {
  if (input.confirmed !== true) {
    const { data } = await supabase
      .from('reminders')
      .select('title')
      .eq('id', input.reminder_id)
      .eq('user_id', userId)
      .single();

    return {
      requires_confirmation: true,
      message: `Are you sure you want to delete the reminder "${data?.title ?? 'this reminder'}"?`,
    };
  }

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', input.reminder_id)
    .eq('user_id', userId);

  if (error) throw error;
  return { deleted: true };
}
