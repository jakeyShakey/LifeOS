import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Folder, Note } from '@/types';
import type { Json } from '@/types/database';

interface NotesListProps {
  folderId: string | null | undefined;
  searchQuery: string;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  folders: Folder[];
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
  onMoveNote: (id: string, folderId: string | null) => void;
}

function extractPlainText(content: Json | null): string {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return '';
  const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> };
  if (!doc.content) return '';
  return doc.content
    .flatMap((block) => block.content ?? [])
    .map((inline) => inline.text ?? '')
    .join(' ')
    .slice(0, 120);
}

function DraggableNoteCard({
  note,
  isSelected,
  onClick,
  contextMenuContent,
}: {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  contextMenuContent: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: note.id,
    data: { type: 'note' },
  });

  const preview = extractPlainText(note.content);
  const relTime = note.updated_at
    ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })
    : '';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          onClick={onClick}
          className={cn(
            'px-3 py-2.5 rounded-md cursor-pointer border transition-colors select-none',
            isDragging ? 'opacity-40' : '',
            isSelected
              ? 'bg-violet-500/10 border-violet-500/30 text-zinc-100'
              : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/60 hover:border-zinc-700/50 text-zinc-300',
          )}
        >
          <p className="text-sm font-medium truncate">{note.title || 'Untitled'}</p>
          {preview && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{preview}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-zinc-600">{relTime}</span>
            {(note.tags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </ContextMenuTrigger>
      {contextMenuContent}
    </ContextMenu>
  );
}

function SkeletonCard() {
  return (
    <div className="px-3 py-2.5 rounded-md border border-zinc-800/50 bg-zinc-900/50 animate-pulse">
      <div className="h-3.5 w-3/4 bg-zinc-700 rounded mb-2" />
      <div className="h-3 w-full bg-zinc-800 rounded mb-1" />
      <div className="h-3 w-1/2 bg-zinc-800 rounded" />
    </div>
  );
}

export function NotesList({
  folderId,
  searchQuery,
  selectedNoteId,
  onSelectNote,
  folders,
  onDeleteNote,
  onDuplicateNote,
  onMoveNote,
}: NotesListProps) {
  const { data: notes, isLoading, isError, refetch } = useNotes(folderId);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!notes) return [];
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        extractPlainText(n.content).toLowerCase().includes(q),
    );
  }, [notes, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-2">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-3 text-sm text-zinc-500">
        Failed to load.{' '}
        <button onClick={() => refetch()} className="text-violet-400 hover:text-violet-300 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="px-3 py-4 text-sm text-zinc-600 italic">
        {searchQuery ? 'No matching notes.' : 'No notes yet.'}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5 px-2">
        {filtered.map((note) => (
          <DraggableNoteCard
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            onClick={() => onSelectNote(note.id)}
            contextMenuContent={
              <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => onSelectNote(note.id)}>
                  Open
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Move to</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-44">
                    <ContextMenuItem onClick={() => onMoveNote(note.id, null)}>
                      No folder
                    </ContextMenuItem>
                    {folders.map((f) => (
                      <ContextMenuItem key={f.id} onClick={() => onMoveNote(note.id, f.id)}>
                        {f.name}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onDuplicateNote(note)}>
                  Duplicate
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-red-400 focus:text-red-300"
                  onClick={() => setNoteToDelete(note.id)}
                >
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            }
          />
        ))}
      </div>

      <AlertDialog open={noteToDelete !== null} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (noteToDelete) {
                  onDeleteNote(noteToDelete);
                  setNoteToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
