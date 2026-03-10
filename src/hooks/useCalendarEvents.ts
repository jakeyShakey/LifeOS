import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { CalendarEvent } from '@/types';

export function useCalendarEvents(date: Date) {
  const { user } = useAuth();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', 'day', date.toDateString(), user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user!.id)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time');

      if (error) throw error;
      return data;
    },
  });
}

export function useUpcomingEvents(days = 7) {
  const { user } = useAuth();

  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', 'upcoming', days, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user!.id)
        .gte('start_time', now.toISOString())
        .lte('start_time', future.toISOString())
        .order('start_time');

      if (error) throw error;
      return data;
    },
  });
}
