import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Note } from '@/types';

export function useRecentNotes(limit = 4) {
  const { user } = useAuth();

  return useQuery<Note[]>({
    queryKey: ['notes', 'recent', limit, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, folder_id }: { title: string; folder_id?: string | null }) => {
      const { data, error } = await supabase
        .from('notes')
        .insert({ user_id: user!.id, title, content: null, folder_id: folder_id ?? null })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useNotes(folderId?: string | null) {
  const { user } = useAuth();

  return useQuery<Note[]>({
    queryKey: ['notes', 'list', folderId, user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });

      if (folderId !== undefined) {
        if (folderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', folderId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useNote(noteId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<Note>({
    queryKey: ['notes', 'detail', noteId],
    enabled: !!user && !!noteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const updateNote = useMutation({
    mutationFn: async (updates: {
      title?: string;
      content?: Note['content'];
      tags?: string[];
      folder_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  return { ...query, updateNote, deleteNote };
}
