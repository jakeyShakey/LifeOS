import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUpcomingEvents } from '@/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/types';

function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const day = new Date(event.start_time).toDateString();
    const existing = map.get(day) ?? [];
    existing.push(event);
    map.set(day, existing);
  }
  return map;
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface UpcomingEventsWidgetProps {
  className?: string;
}

export function UpcomingEventsWidget({ className }: UpcomingEventsWidgetProps) {
  const { data: events, isLoading, isError, refetch } = useUpcomingEvents(7);

  const grouped = events ? groupByDay(events) : new Map<string, CalendarEvent[]>();

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full', className)}>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
        Next 7 days
      </p>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 bg-zinc-800 rounded animate-pulse" />
            </div>
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

      {!isLoading && !isError && events?.length === 0 && (
        <EmptyState icon={CalendarDays} message="Nothing in the next 7 days" />
      )}

      {!isLoading && !isError && grouped.size > 0 && (
        <div className="space-y-4">
          {[...grouped.entries()].map(([day, dayEvents]) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-zinc-400">{formatDayLabel(day)}</span>
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs px-1.5 py-0">
                  {dayEvents.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {dayEvents.map((event) => (
                  <div key={event.id} className="flex items-baseline gap-2">
                    <span className="text-xs text-zinc-500 w-20 shrink-0">
                      {event.all_day ? 'All day' : formatTime(event.start_time)}
                    </span>
                    <span className="text-sm text-zinc-200 truncate">{event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
