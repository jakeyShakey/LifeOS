import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRecentNotes } from '@/hooks/useNotes';
import type { Note } from '@/types';

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NoteCard({ note }: { note: Note }) {
  return (
    <Link
      to={`/notes?note=${note.id}`}
      className="block rounded-md px-3 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-700 transition-colors"
    >
      <p className="text-sm font-medium text-zinc-100 truncate">
        {note.title || 'Untitled'}
      </p>
      <p className="text-xs text-zinc-500 mt-0.5">{relativeTime(note.updated_at)}</p>
    </Link>
  );
}

interface RecentNotesWidgetProps {
  className?: string;
}

export function RecentNotesWidget({ className }: RecentNotesWidgetProps) {
  const { data: notes, isLoading, isError, refetch } = useRecentNotes(4);

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Recent notes
        </p>
        <Link to="/notes" className="text-xs text-violet-400 hover:text-violet-300">
          View all →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-sm text-zinc-400">
          Failed to load.{' '}
          <button onClick={() => refetch()} className="text-violet-400 hover:text-violet-300 underline">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && notes?.length === 0 && (
        <p className="text-sm text-zinc-500 italic">No notes yet.</p>
      )}

      {!isLoading && !isError && notes && notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
