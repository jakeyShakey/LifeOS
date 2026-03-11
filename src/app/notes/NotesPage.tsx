import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderTree } from '@/components/notes/FolderTree';
import { NotesList } from '@/components/notes/NotesList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useFolders } from '@/hooks/useFolders';
import { useCreateNote, useNote } from '@/hooks/useNotes';
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
      <p className="text-lg font-medium">No note selected</p>
      <p className="text-sm">Pick a note from the list or create a new one.</p>
    </div>
  );
}

export function NotesPage() {
  const [searchParams] = useSearchParams();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { tree, createFolder, renameFolder, deleteFolder } = useFolders();
  const { mutateAsync: createNote } = useCreateNote();
  const noteQuery = useNote(selectedNoteId ?? '');

  // Read ?note=<id> from URL on mount
  useEffect(() => {
    const noteId = searchParams.get('note');
    if (noteId) setSelectedNoteId(noteId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateNote = async () => {
    const note = await createNote({ title: 'Untitled', folder_id: selectedFolderId ?? null });
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
      if (window.confirm('Delete this folder? Notes inside will become unorganised.')) {
        await deleteFolder.mutateAsync(id);
        if (selectedFolderId === id) setSelectedFolderId(undefined);
      }
    },
    [deleteFolder, selectedFolderId],
  );

  const selectedNote = noteQuery.data ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <aside className="w-72 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden">
        {/* Header */}
        <div className="px-3 pt-4 pb-2 flex items-center gap-2 border-b border-zinc-800/50">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
            onClick={handleCreateNote}
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
          />
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto py-2">
          <NotesList
            folderId={selectedFolderId}
            searchQuery={searchQuery}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
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
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
