import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { supabase } from '../supabase';
import { createEvent, deleteEvent } from '../google-calendar';
import { parseSchedulingIntent, findAvailableSlots } from '../scheduling';

// ---- Tool definitions ----

export const calendarToolDefinitions: Tool[] = [
  {
    name: 'get_events',
    description: 'Get calendar events within a date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: { type: 'string', description: 'ISO 8601 start date/time' },
        end_date: { type: 'string', description: 'ISO 8601 end date/time' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'create_event',
    description: 'Create a new calendar event.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Event title' },
        start_time: { type: 'string', description: 'ISO 8601 start date/time' },
        end_time: { type: 'string', description: 'ISO 8601 end date/time' },
        description: { type: 'string', description: 'Optional event description' },
        location: { type: 'string', description: 'Optional event location' },
      },
      required: ['title', 'start_time', 'end_time'],
    },
  },
  {
    name: 'update_event',
    description: 'Update an existing calendar event.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: { type: 'string', description: 'The event ID (from Supabase cache)' },
        title: { type: 'string', description: 'New event title (optional)' },
        start_time: { type: 'string', description: 'New start time ISO 8601 (optional)' },
        end_time: { type: 'string', description: 'New end time ISO 8601 (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        location: { type: 'string', description: 'New location (optional)' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'delete_event',
    description: 'Delete a calendar event. Requires confirmation on first call.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: { type: 'string', description: 'The event ID to delete' },
        confirmed: { type: 'boolean', description: 'Set to true to confirm deletion' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'find_free_slots',
    description: 'Find available time slots for scheduling a meeting or task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        request: { type: 'string', description: 'Natural language scheduling request, e.g. "30 minute meeting next week"' },
      },
      required: ['request'],
    },
  },
];

// ---- Tool implementations ----

interface GetEventsInput {
  start_date: string;
  end_date: string;
}

export async function get_events(input: GetEventsInput, userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, end_time, description, location, color')
    .eq('user_id', userId)
    .gte('start_time', input.start_date)
    .lte('end_time', input.end_date)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

interface CreateEventInput {
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  location?: string;
}

export async function create_event(input: CreateEventInput, userId: string): Promise<unknown> {
  await createEvent(userId, {
    title: input.title,
    startTime: new Date(input.start_time),
    endTime: new Date(input.end_time),
    description: input.description,
    location: input.location,
  });

  return {
    created: true,
    title: input.title,
    start_time: input.start_time,
    end_time: input.end_time,
  };
}

interface UpdateEventInput {
  event_id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  location?: string;
}

export async function update_event(input: UpdateEventInput, userId: string): Promise<unknown> {
  // Fetch external_id from Supabase
  const { data: cached, error: fetchError } = await supabase
    .from('calendar_events')
    .select('external_id, title')
    .eq('id', input.event_id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !cached) throw new Error('Event not found');

  const accessToken = await (await import('../google-auth')).getGoogleAccessToken(userId);
  if (!accessToken) throw new Error('No Google access token');

  const body: Record<string, unknown> = {};
  if (input.title) body.summary = input.title;
  if (input.description) body.description = input.description;
  if (input.location) body.location = input.location;
  if (input.start_time) body.start = { dateTime: input.start_time };
  if (input.end_time) body.end = { dateTime: input.end_time };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(cached.external_id as string)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) throw new Error(`Failed to update event: ${response.status}`);

  // Update Supabase cache
  const updates: Record<string, unknown> = {};
  if (input.title) updates.title = input.title;
  if (input.description) updates.description = input.description;
  if (input.location) updates.location = input.location;
  if (input.start_time) updates.start_time = input.start_time;
  if (input.end_time) updates.end_time = input.end_time;

  await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', input.event_id)
    .eq('user_id', userId);

  return { updated: true, event_id: input.event_id };
}

interface DeleteEventInput {
  event_id: string;
  confirmed?: boolean;
}

export async function delete_event(input: DeleteEventInput, userId: string): Promise<unknown> {
  if (input.confirmed !== true) {
    const { data } = await supabase
      .from('calendar_events')
      .select('title')
      .eq('id', input.event_id)
      .eq('user_id', userId)
      .single();

    return {
      requires_confirmation: true,
      message: `Are you sure you want to delete "${data?.title ?? 'this event'}"? This cannot be undone.`,
    };
  }

  await deleteEvent(userId, input.event_id);
  return { deleted: true };
}

interface FindFreeSlotsInput {
  request: string;
}

export async function find_free_slots(input: FindFreeSlotsInput, userId: string): Promise<unknown> {
  const intent = await parseSchedulingIntent(input.request);
  const slots = await findAvailableSlots(userId, intent);
  return slots.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    label: s.label,
  }));
}
