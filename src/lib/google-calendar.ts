import { supabase } from './supabase';
import { getGoogleAccessToken } from './google-auth';

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  location?: string;
  colorId?: string;
}

interface NewEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  calendarId?: string;
}

/**
 * Fetches events from Google Calendar and upserts them into the Supabase cache.
 * Uses external_id as the conflict key to avoid duplicates.
 */
export async function fetchAndSyncCalendars(userId: string): Promise<void> {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) throw new Error('No Google access token found for user');

  // Get the connection record so we can associate events with it
  const { data: conn } = await supabase
    .from('calendar_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  const calendarId = 'primary';
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days back
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days forward

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('maxResults', '500');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(`Google Calendar API error: ${response.status}`);

  const data = await response.json() as { items: GoogleEvent[] };
  const events = data.items ?? [];

  const rows = events.map((e) => {
    const startRaw = e.start.dateTime ?? e.start.date ?? '';
    const endRaw = e.end.dateTime ?? e.end.date ?? '';
    return {
      user_id: userId,
      calendar_connection_id: conn?.id ?? null,
      external_id: e.id,
      title: e.summary ?? '(No title)',
      description: e.description ?? null,
      start_time: new Date(startRaw).toISOString(),
      end_time: new Date(endRaw).toISOString(),
      location: e.location ?? null,
      color: e.colorId ?? null,
      all_day: !e.start.dateTime,
      synced_at: new Date().toISOString(),
    };
  });

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('calendar_events')
    .upsert(rows, { onConflict: 'external_id' });

  if (error) throw error;
}

/**
 * Returns busy time blocks from the Supabase cache for the given date range.
 * Never hits the Google API directly — reads from cache only.
 */
export async function getFreeBusy(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('start_time, end_time')
    .eq('user_id', userId)
    .gte('start_time', startDate.toISOString())
    .lte('end_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((e) => ({
    start: new Date(e.start_time as string),
    end: new Date(e.end_time as string),
  }));
}

/**
 * Creates an event via the Google Calendar API, then syncs the cache.
 */
export async function createEvent(userId: string, event: NewEvent): Promise<void> {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) throw new Error('No Google access token found for user');

  const calendarId = event.calendarId ?? 'primary';

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        location: event.location,
        start: { dateTime: event.startTime.toISOString() },
        end: { dateTime: event.endTime.toISOString() },
      }),
    }
  );

  if (!response.ok) throw new Error(`Failed to create event: ${response.status}`);

  await fetchAndSyncCalendars(userId);
}

/**
 * Deletes an event from Google Calendar and removes it from the Supabase cache.
 */
export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) throw new Error('No Google access token found for user');

  // Look up the external_id from our cache
  const { data: cached } = await supabase
    .from('calendar_events')
    .select('external_id')
    .eq('id', eventId)
    .eq('user_id', userId)
    .single();

  if (cached?.external_id) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(cached.external_id as string)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    // 404 means already deleted on Google's side — treat as success
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete event: ${response.status}`);
    }
  }

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);

  if (error) throw error;
}
