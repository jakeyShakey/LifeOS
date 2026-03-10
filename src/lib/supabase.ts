import { createClient, User } from '@supabase/supabase-js';

// TODO: Run `supabase gen types typescript --project-id xrkpxtqazpywwmhzvfmn`
// once schema stabilises and replace `any` with the generated Database type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

/** Returns the currently authenticated user, or null if not signed in. */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Returns the current user or throws if not authenticated. */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}
