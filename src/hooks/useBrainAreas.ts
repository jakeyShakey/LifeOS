import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { BrainArea } from '@/types';

export function useBrainAreas() {
  const { user } = useAuth();

  return useQuery<BrainArea[]>({
    queryKey: ['brain-areas', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brain_areas')
        .select('*')
        .eq('user_id', user!.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateArea() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (area: { name: string; color?: string | null; description?: string | null }) => {
      const { data, error } = await supabase
        .from('brain_areas')
        .insert({ user_id: user!.id, ...area })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-areas'] });
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BrainArea> & { id: string }) => {
      const { data, error } = await supabase
        .from('brain_areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-areas'] });
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (areaId: string) => {
      const { error } = await supabase
        .from('brain_areas')
        .delete()
        .eq('id', areaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-areas'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
