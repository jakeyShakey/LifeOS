import Anthropic from '@anthropic-ai/sdk';
import { getFreeBusy, createEvent } from './google-calendar';
import type { SchedulingIntent, TimeSlot } from '@/types';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function parseSchedulingIntent(input: string): Promise<SchedulingIntent> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system:
      'Extract scheduling intent from the user input. Respond with only a JSON object with these fields: ' +
      '"duration_minutes" (number), "purpose" (string), "window_days" (number, default 7), ' +
      '"constraints" (array of strings). No markdown, no explanation.',
    messages: [{ role: 'user', content: input }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Failed to parse scheduling intent from AI response');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).duration_minutes !== 'number' ||
    typeof (parsed as Record<string, unknown>).purpose !== 'string' ||
    typeof (parsed as Record<string, unknown>).window_days !== 'number' ||
    !Array.isArray((parsed as Record<string, unknown>).constraints)
  ) {
    throw new Error('Invalid scheduling intent shape from AI response');
  }

  return parsed as SchedulingIntent;
}

export async function findAvailableSlots(
  userId: string,
  intent: SchedulingIntent
): Promise<TimeSlot[]> {
  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + intent.window_days);

  const busyBlocks = await getFreeBusy(userId, windowStart, windowEnd);

  const slots: TimeSlot[] = [];
  const cursor = new Date(windowStart);

  while (cursor < windowEnd && slots.length < 3) {
    // Skip weekends
    const dow = cursor.getDay();
    if (dow === 0 || dow === 6) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(9, 0, 0, 0);
      continue;
    }

    // Advance to 9am if earlier
    if (cursor.getHours() < 9) {
      cursor.setHours(9, 0, 0, 0);
    }

    // Past 6pm — jump to next day 9am
    if (cursor.getHours() >= 18) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(9, 0, 0, 0);
      continue;
    }

    const slotEnd = new Date(cursor.getTime() + intent.duration_minutes * 60 * 1000);

    // Slot must end by 6pm
    if (slotEnd.getHours() > 18 || (slotEnd.getHours() === 18 && slotEnd.getMinutes() > 0)) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(9, 0, 0, 0);
      continue;
    }

    const overlaps = busyBlocks.some(
      (busy) => cursor < busy.end && slotEnd > busy.start
    );

    if (!overlaps) {
      slots.push({
        start: new Date(cursor),
        end: new Date(slotEnd),
        label: formatSlotLabel(cursor, slotEnd),
      });
      // Advance past this slot to avoid overlapping suggestions
      cursor.setTime(slotEnd.getTime());
    } else {
      // Advance by 15 minutes
      cursor.setMinutes(cursor.getMinutes() + 15);
    }
  }

  return slots;
}

export async function createScheduledEvent(
  userId: string,
  slot: TimeSlot,
  intent: SchedulingIntent
): Promise<void> {
  await createEvent(userId, {
    title: capitalise(intent.purpose),
    description: 'Scheduled by Life OS',
    startTime: slot.start,
    endTime: slot.end,
  });
}

// --- private helpers ---

function capitalise(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isNextDay(a: Date, b: Date): boolean {
  const next = new Date(b);
  next.setDate(next.getDate() + 1);
  return isSameDay(a, next);
}

function formatTime12(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatSlotLabel(start: Date, end: Date): string {
  const now = new Date();
  const prefix = isSameDay(start, now)
    ? 'Today'
    : isNextDay(start, now)
      ? 'Tomorrow'
      : start.toLocaleDateString('en-US', { weekday: 'short' });

  return `${prefix} ${formatTime12(start)} – ${formatTime12(end)}`;
}
