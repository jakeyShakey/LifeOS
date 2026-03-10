import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Reminder } from '@/types';

export function useReminders() {
  const { user } = useAuth();

  return useQuery<Reminder[]>({
    queryKey: ['reminders', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_done', false)
        .order('remind_at');

      if (error) throw error;
      return data;
    },
  });
}

export function useCompleteReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('reminders')
        .update({ is_done: true })
        .eq('id', reminderId)
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', user?.id] });
    },
  });
}
