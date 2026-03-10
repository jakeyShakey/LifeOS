import { supabase } from './supabase';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/** Initiates Google OAuth sign-in with required scopes. */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: GOOGLE_SCOPES,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
}

/** Signs the current user out. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Returns the Google access token for a given user, or null if not connected. */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('calendar_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (error || !data) return null;
  return data.access_token as string;
}

/**
 * Refreshes the Google access token for the given connection and persists it.
 * Returns the new access token.
 */
export async function refreshGoogleToken(connectionId: string): Promise<string> {
  const { data: conn, error: fetchError } = await supabase
    .from('calendar_connections')
    .select('refresh_token')
    .eq('id', connectionId)
    .single();

  if (fetchError || !conn) throw new Error('Calendar connection not found');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
      refresh_token: conn.refresh_token as string,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const tokens = await response.json() as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('calendar_connections')
    .update({ access_token: tokens.access_token, token_expires_at: expiresAt })
    .eq('id', connectionId);

  if (updateError) throw updateError;

  return tokens.access_token;
}
