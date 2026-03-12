import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { BrainArea } from '@/types';

export function useDocumentAreas(documentId: string) {
  const { user } = useAuth();

  return useQuery<BrainArea[]>({
    queryKey: ['document-areas', documentId],
    enabled: !!user && !!documentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_areas')
        .select('area_id, brain_areas(*)')
        .eq('document_id', documentId);

      if (error) throw error;

      return (data ?? [])
        .map((row) => row.brain_areas)
        .filter((area): area is BrainArea => area !== null);
    },
  });
}

export function useUpdateDocumentAreas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, areaIds }: { documentId: string; areaIds: string[] }) => {
      // Delete all existing area assignments for this document
      const { error: deleteError } = await supabase
        .from('document_areas')
        .delete()
        .eq('document_id', documentId);

      if (deleteError) throw deleteError;

      // Insert new assignments if any
      if (areaIds.length > 0) {
        const rows = areaIds.map((area_id) => ({
          document_id: documentId,
          area_id,
          user_id: user!.id,
        }));

        const { error: insertError } = await supabase.from('document_areas').insert(rows);
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_data, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['document-areas', documentId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
