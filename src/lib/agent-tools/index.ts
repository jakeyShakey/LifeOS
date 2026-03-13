import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { notesToolDefinitions, search_notes, get_note, create_note, update_note, delete_note } from './notes-tools';
import { calendarToolDefinitions, get_events, create_event, update_event, delete_event, find_free_slots } from './calendar-tools';
import { remindersToolDefinitions, get_reminders, create_reminder, complete_reminder, delete_reminder } from './reminders-tools';
import { brainToolDefinitions, search_brain, list_brain_areas, get_document } from './brain-tools';

export const ALL_TOOLS: Tool[] = [
  ...notesToolDefinitions,
  ...calendarToolDefinitions,
  ...remindersToolDefinitions,
  ...brainToolDefinitions,
];

export const TOOL_SUMMARIES: Record<string, string> = {
  search_notes: 'Searched notes',
  get_note: 'Read note',
  create_note: 'Created note',
  update_note: 'Updated note',
  delete_note: 'Deleted note',
  get_events: 'Checked calendar',
  create_event: 'Created calendar event',
  update_event: 'Updated calendar event',
  delete_event: 'Deleted calendar event',
  find_free_slots: 'Found available time slots',
  get_reminders: 'Checked reminders',
  create_reminder: 'Created reminder',
  complete_reminder: 'Completed reminder',
  delete_reminder: 'Deleted reminder',
  search_brain: 'Searched knowledge base',
  list_brain_areas: 'Listed brain areas',
  get_document: 'Read document',
};

class ToolNotFoundError extends Error {
  constructor(toolName: string) {
    super(`Unknown tool: ${toolName}`);
    this.name = 'ToolNotFoundError';
  }
}

const TOOL_MAP: Record<string, (input: unknown, userId: string) => Promise<unknown>> = {
  search_notes: (input, userId) => search_notes(input as Parameters<typeof search_notes>[0], userId),
  get_note: (input, userId) => get_note(input as Parameters<typeof get_note>[0], userId),
  create_note: (input, userId) => create_note(input as Parameters<typeof create_note>[0], userId),
  update_note: (input, userId) => update_note(input as Parameters<typeof update_note>[0], userId),
  delete_note: (input, userId) => delete_note(input as Parameters<typeof delete_note>[0], userId),
  get_events: (input, userId) => get_events(input as Parameters<typeof get_events>[0], userId),
  create_event: (input, userId) => create_event(input as Parameters<typeof create_event>[0], userId),
  update_event: (input, userId) => update_event(input as Parameters<typeof update_event>[0], userId),
  delete_event: (input, userId) => delete_event(input as Parameters<typeof delete_event>[0], userId),
  find_free_slots: (input, userId) => find_free_slots(input as Parameters<typeof find_free_slots>[0], userId),
  get_reminders: (input, userId) => get_reminders(input as Parameters<typeof get_reminders>[0], userId),
  create_reminder: (input, userId) => create_reminder(input as Parameters<typeof create_reminder>[0], userId),
  complete_reminder: (input, userId) => complete_reminder(input as Parameters<typeof complete_reminder>[0], userId),
  delete_reminder: (input, userId) => delete_reminder(input as Parameters<typeof delete_reminder>[0], userId),
  search_brain: (input, userId) => search_brain(input as Parameters<typeof search_brain>[0], userId),
  list_brain_areas: (input, userId) => list_brain_areas(input, userId),
  get_document: (input, userId) => get_document(input as Parameters<typeof get_document>[0], userId),
};

export async function executeTool(toolName: string, input: unknown, userId: string): Promise<unknown> {
  const fn = TOOL_MAP[toolName];
  if (!fn) throw new ToolNotFoundError(toolName);
  return fn(input, userId);
}
