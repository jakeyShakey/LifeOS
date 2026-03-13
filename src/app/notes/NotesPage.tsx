import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderTree } from '@/components/notes/FolderTree';
import { NotesList } from '@/components/notes/NotesList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useFolders } from '@/hooks/useFolders';
import {
  useCreateNote,
  useNote,
  useDeleteNoteById,
  useDuplicateNote,
  useUpdateNoteFolder,
} from '@/hooks/useNotes';
import type { Note } from '@/types';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
      <p className="text-lg font-medium">No note selected</p>
      <p className="text-sm">Pick a note from the list or create a new one.</p>
    </div>
  );
}

/** Collect all descendant IDs of the given node ID from the flat folder list. */
function getDescendantIds(folderId: string, folders: { id: string; parent_id: string | null }[]): Set<string> {
  const result = new Set<string>();
  const queue = [folderId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const f of folders) {
      if (f.parent_id === cur) {
        result.add(f.id);
        queue.push(f.id);
      }
    }
  }
  return result;
}

export function NotesPage() {
  const [searchParams] = useSearchParams();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const { data: allFolders, tree, createFolder, renameFolder, deleteFolder, moveFolder } = useFolders();
  const { mutateAsync: createNote } = useCreateNote();
  const noteQuery = useNote(selectedNoteId ?? '');
  const deleteNoteById = useDeleteNoteById();
  const duplicateNote = useDuplicateNote();
  const updateNoteFolder = useUpdateNoteFolder();

  // Read ?note=<id> from URL on mount
  useEffect(() => {
    const noteId = searchParams.get('note');
    if (noteId) setSelectedNoteId(noteId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateNote = async (folderId?: string | null) => {
    const note = await createNote({ title: 'Untitled', folder_id: folderId ?? selectedFolderId ?? null });
    setSelectedNoteId(note.id);
  };

  const handleCreateFolder = useCallback(
    async (parentId?: string | null) => {
      const name = window.prompt('Folder name:');
      if (name?.trim()) {
        await createFolder.mutateAsync({ name: name.trim(), parentId });
      }
    },
    [createFolder],
  );

  const handleRenameFolder = useCallback(
    async (id: string, currentName: string) => {
      const name = window.prompt('Rename folder:', currentName);
      if (name?.trim() && name.trim() !== currentName) {
        await renameFolder.mutateAsync({ id, name: name.trim() });
      }
    },
    [renameFolder],
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      await deleteFolder.mutateAsync(id);
      if (selectedFolderId === id) setSelectedFolderId(undefined);
    },
    [deleteFolder, selectedFolderId],
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      await deleteNoteById.mutateAsync(noteId);
      if (selectedNoteId === noteId) setSelectedNoteId(null);
    },
    [deleteNoteById, selectedNoteId],
  );

  const handleDuplicateNote = useCallback(
    async (note: Note) => {
      await duplicateNote.mutateAsync(note);
    },
    [duplicateNote],
  );

  const handleMoveNote = useCallback(
    async (noteId: string, folderId: string | null) => {
      await updateNoteFolder.mutateAsync({ noteId, folderId });
    },
    [updateNoteFolder],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      if (active.data.current?.type === 'note') {
        const folderId = over.id === '__unfiled__' ? null : (over.id as string);
        updateNoteFolder.mutate({ noteId: active.id as string, folderId });
      } else if (active.data.current?.type === 'folder') {
        const draggedId = active.id as string;
        const targetId = over.id as string;

        // Don't drop onto self
        if (draggedId === targetId) return;

        // Guard against circular nesting
        if (allFolders) {
          const descendants = getDescendantIds(draggedId, allFolders);
          if (descendants.has(targetId)) return;
        }

        const newParentId = targetId === '__unfiled__' ? null : targetId;
        moveFolder.mutate({ id: draggedId, parentId: newParentId });
      }
    },
    [allFolders, updateNoteFolder, moveFolder],
  );

  const selectedNote = noteQuery.data ?? null;
  const folderName = allFolders?.find((f) => f.id === selectedNote?.folder_id)?.name ?? null;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-hidden">
        {/* Left panel */}
        <aside className="w-72 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden">
          {/* Header */}
          <div className="px-3 pt-4 pb-2 flex items-center gap-2 border-b border-zinc-800/50">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => handleCreateNote()}
            >
              <Plus size={13} className="mr-1" />
              New Note
            </Button>
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes…"
                className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-700 focus:border-violet-500/60"
              />
            </div>
          </div>

          {/* Folder tree */}
          <div className="px-1 border-b border-zinc-800/50">
            <FolderTree
              nodes={tree}
              selectedFolderId={selectedFolderId ?? null}
              onSelectFolder={(id) => {
                setSelectedFolderId(id ?? undefined);
                setSelectedNoteId(null);
                setSearchQuery('');
              }}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onCreateNote={handleCreateNote}
            />
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto py-2">
            <NotesList
              folderId={selectedFolderId}
              searchQuery={searchQuery}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              folders={allFolders ?? []}
              onDeleteNote={handleDeleteNote}
              onDuplicateNote={handleDuplicateNote}
              onMoveNote={handleMoveNote}
            />
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 overflow-auto">
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              onUpdate={(updates) => noteQuery.updateNote.mutate(updates)}
              onDelete={() => handleDeleteNote(selectedNote.id)}
              folders={allFolders ?? []}
              folderName={folderName}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </DndContext>
  );
}
