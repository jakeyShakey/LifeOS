import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface BrainStats {
  documentCount: number;
  chunkCount: number;
  noteCount: number;
}

export function useBrainStats() {
  const { user } = useAuth();

  return useQuery<BrainStats>({
    queryKey: ['brain-stats', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [documentsResult, chunksResult, notesResult] = await Promise.all([
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id),
        supabase
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id),
        supabase
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id),
      ]);

      if (documentsResult.error) throw documentsResult.error;
      if (chunksResult.error) throw chunksResult.error;
      if (notesResult.error) throw notesResult.error;

      return {
        documentCount: documentsResult.count ?? 0,
        chunkCount: chunksResult.count ?? 0,
        noteCount: notesResult.count ?? 0,
      };
    },
  });
}
