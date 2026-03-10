import { cn } from '@/lib/utils';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/types';

const COLOR_MAP: Record<string, string> = {
  '1': 'border-blue-400',
  '2': 'border-green-400',
  '3': 'border-violet-400',
  '4': 'border-rose-400',
  '5': 'border-yellow-400',
  '6': 'border-orange-400',
  '7': 'border-cyan-400',
  '8': 'border-slate-400',
  '9': 'border-indigo-400',
  '10': 'border-emerald-400',
  '11': 'border-pink-400',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function EventRow({ event }: { event: CalendarEvent }) {
  const borderColor = COLOR_MAP[event.color ?? ''] ?? 'border-zinc-500';
  return (
    <div className={cn('border-l-2 pl-3 py-1', borderColor)}>
      <p className="text-sm font-medium text-zinc-100 leading-tight">{event.title}</p>
      <p className="text-xs text-zinc-400 mt-0.5">
        {event.all_day
          ? 'All day'
          : `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`}
      </p>
    </div>
  );
}

interface AgendaWidgetProps {
  className?: string;
}

export function AgendaWidget({ className }: AgendaWidgetProps) {
  const { data: events, isLoading, isError, refetch } = useCalendarEvents(new Date());

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full', className)}>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
        Today's agenda
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-sm text-zinc-400">
          Failed to load events.{' '}
          <button
            onClick={() => refetch()}
            className="text-violet-400 hover:text-violet-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && events?.length === 0 && (
        <p className="text-sm text-zinc-500 italic">No events today.</p>
      )}

      {!isLoading && !isError && events && events.length > 0 && (
        <div className="space-y-2">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
