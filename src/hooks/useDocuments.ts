import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { processAndStoreDocument, type UploadProgress } from '@/lib/embeddings';
import { useAuth } from './useAuth';
import type { Document, DocumentChunk } from '@/types';

export function useDocuments() {
  const { user } = useAuth();

  return useQuery<Document[]>({
    queryKey: ['documents', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useDocument(documentId: string) {
  const { user } = useAuth();

  return useQuery<Document & { chunks: DocumentChunk[] }>({
    queryKey: ['document', documentId],
    enabled: !!user && !!documentId,
    queryFn: async () => {
      const [docResult, chunksResult] = await Promise.all([
        supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .eq('user_id', user!.id)
          .single(),
        supabase
          .from('document_chunks')
          .select('*')
          .eq('document_id', documentId)
          .order('chunk_index', { ascending: true }),
      ]);

      if (docResult.error) throw docResult.error;
      if (chunksResult.error) throw chunksResult.error;

      return { ...docResult.data, chunks: chunksResult.data };
    },
  });
}

export interface UploadDocumentInput {
  input: File | string;
  type: 'pdf' | 'url' | 'text';
  onProgress?: (p: UploadProgress) => void;
}

export function useUploadDocument() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, type, onProgress }: UploadDocumentInput) => {
      return processAndStoreDocument(user!.id, input, type, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Fetch doc to check for storage file
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      if (fetchError) throw fetchError;

      // If PDF stored in Supabase Storage, remove the file
      if (doc.source_type === 'pdf' && doc.url) {
        await supabase.storage.from('documents').remove([doc.url]);
      }

      // Delete chunks first (no ON DELETE CASCADE on the FK)
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);
      if (chunksError) throw chunksError;

      // Delete document row
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
      if (docError) throw docError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
    },
  });
}
