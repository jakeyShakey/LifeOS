import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';
import type { Note } from '@/types';
import type { Json } from '@/types/database';

interface NotesListProps {
  folderId: string | null | undefined;
  searchQuery: string;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
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

function NoteCard({
  note,
  isSelected,
  onClick,
  onDragStart,
}: {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const preview = extractPlainText(note.content);
  const relTime = note.updated_at
    ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })
    : '';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        'px-3 py-2.5 rounded-md cursor-pointer border transition-colors select-none',
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
}: NotesListProps) {
  const { data: notes, isLoading, isError, refetch } = useNotes(folderId);

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
    <div className="flex flex-col gap-1.5 px-2">
      {filtered.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          isSelected={selectedNoteId === note.id}
          onClick={() => onSelectNote(note.id)}
          onDragStart={(e) => {
            e.dataTransfer.setData('noteId', note.id);
          }}
        />
      ))}
    </div>
  );
}
