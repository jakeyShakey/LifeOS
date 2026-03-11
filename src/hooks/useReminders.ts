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

export function useAllReminders() {
  const { user } = useAuth();

  return useQuery<Reminder[]>({
    queryKey: ['reminders', 'all', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user!.id)
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
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useCreateReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      remind_at: string;
      body?: string;
      recurrence?: string | null;
    }) => {
      const { error } = await supabase.from('reminders').insert({
        ...payload,
        user_id: user!.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useUpdateReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<Omit<Reminder, 'id' | 'user_id' | 'created_at'>>) => {
      const { error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useDeleteReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId)
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}
