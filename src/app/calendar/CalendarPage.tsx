import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCalendarEventsRange } from '@/hooks/useCalendarEvents';
import { useAuth } from '@/hooks/useAuth';
import { handleDashboardQuery } from '@/lib/ai';
import { createScheduledEvent, parseSchedulingIntent } from '@/lib/scheduling';
import { toast } from '@/hooks/use-toast';
import type { CalendarEvent, AIResponse, TimeSlot, SchedulingIntent } from '@/types';

// ── colour map ────────────────────────────────────────────────────────────────
const BG_COLOR_MAP: Record<string, string> = {
  '1': 'bg-blue-500/20 border-blue-400 text-blue-200',
  '2': 'bg-green-500/20 border-green-400 text-green-200',
  '3': 'bg-violet-500/20 border-violet-400 text-violet-200',
  '4': 'bg-rose-500/20 border-rose-400 text-rose-200',
  '5': 'bg-yellow-500/20 border-yellow-400 text-yellow-200',
  '6': 'bg-orange-500/20 border-orange-400 text-orange-200',
  '7': 'bg-cyan-500/20 border-cyan-400 text-cyan-200',
  '8': 'bg-slate-500/20 border-slate-400 text-slate-200',
  '9': 'bg-indigo-500/20 border-indigo-400 text-indigo-200',
  '10': 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
  '11': 'bg-pink-500/20 border-pink-400 text-pink-200',
};

const DOT_COLOR_MAP: Record<string, string> = {
  '1': 'bg-blue-400',
  '2': 'bg-green-400',
  '3': 'bg-violet-400',
  '4': 'bg-rose-400',
  '5': 'bg-yellow-400',
  '6': 'bg-orange-400',
  '7': 'bg-cyan-400',
  '8': 'bg-slate-400',
  '9': 'bg-indigo-400',
  '10': 'bg-emerald-400',
  '11': 'bg-pink-400',
};

// ── helpers ───────────────────────────────────────────────────────────────────
const HOUR_START = 6;  // 6am
const HOUR_END = 22;   // 10pm
const ROW_HEIGHT = 60; // px per hour

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday-start: subtract (day === 0 ? 6 : day - 1)
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function eventTop(event: CalendarEvent): number {
  const start = new Date(event.start_time);
  const hours = start.getHours() + start.getMinutes() / 60 - HOUR_START;
  return Math.max(0, hours * ROW_HEIGHT);
}

function eventHeight(event: CalendarEvent): number {
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const durationHours = (end.getTime() - start.getTime()) / 3_600_000;
  return Math.max(20, durationHours * ROW_HEIGHT);
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start_time), day));
}

// ── EventDetailDialog ─────────────────────────────────────────────────────────
interface EventDetailDialogProps {
  event: CalendarEvent;
  onClose: () => void;
}

function EventDetailDialog({ event, onClose }: EventDetailDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{event.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="text-zinc-400">
            {event.all_day
              ? 'All day'
              : `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`}
          </p>
          {event.description && (
            <p className="text-zinc-300 whitespace-pre-wrap">{event.description}</p>
          )}
          {event.location && (
            <p className="text-zinc-400">📍 {event.location}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── SlotCard ──────────────────────────────────────────────────────────────────
interface SlotCardProps {
  slot: TimeSlot;
  intent: SchedulingIntent;
  userId: string;
  onBooked: () => void;
}

function SlotCard({ slot, intent, userId, onBooked }: SlotCardProps) {
  const [booking, setBooking] = useState(false);
  const qc = useQueryClient();

  async function handleBook() {
    setBooking(true);
    try {
      await createScheduledEvent(userId, slot, intent);
      toast({ title: 'Event created', description: slot.label });
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      onBooked();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Failed to create event', description: msg, variant: 'destructive' });
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-zinc-100">{slot.label}</p>
        <p className="text-xs text-zinc-400">
          {slot.start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleBook}
        disabled={booking}
        className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
      >
        {booking ? 'Booking…' : 'Book this'}
      </Button>
    </div>
  );
}

// ── AISchedulingPanel ─────────────────────────────────────────────────────────
function AISchedulingPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [lastIntent, setLastIntent] = useState<SchedulingIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!query.trim() || !user) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setLastIntent(null);
    try {
      // We need the parsed intent for SlotCard — re-parse it here for the panel
      const intent = await parseSchedulingIntent(query);
      setLastIntent(intent);
      const result = await handleDashboardQuery(user.id, query);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          AI Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            AI Scheduling
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Block 2 hours for deep work tomorrow afternoon"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500"
            />
            <Button
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
            >
              {loading ? '…' : 'Find slots'}
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-400">{error}</p>
          )}

          {response?.type === 'scheduling_options' && response.slots && user && lastIntent && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Available slots for "{lastIntent.purpose}":</p>
              {response.slots.length === 0 && (
                <p className="text-sm text-zinc-400">No available slots found in the next {lastIntent.window_days} days.</p>
              )}
              {response.slots.map((slot, i) => (
                <SlotCard
                  key={i}
                  slot={slot}
                  intent={lastIntent}
                  userId={user.id}
                  onBooked={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── WeekView ──────────────────────────────────────────────────────────────────
interface WeekViewProps {
  weekStart: Date;
  events: CalendarEvent[];
}

function WeekView({ weekStart, events }: WeekViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const today = new Date();

  return (
    <>
      {selectedEvent && (
        <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      <div className="overflow-auto h-full">
        {/* Day headers */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center py-2 border-l border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className={`text-sm font-semibold mt-0.5 h-7 w-7 mx-auto flex items-center justify-center rounded-full
                ${isSameDay(day, today) ? 'bg-violet-600 text-white' : 'text-zinc-200'}`}>
                {day.getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          {/* Hour labels */}
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: ROW_HEIGHT }} className="relative">
                <span className="absolute -top-2.5 right-2 text-[10px] text-zinc-600 select-none">
                  {h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayEvents = eventsForDay(events, day).filter((e) => !e.all_day);
            return (
              <div
                key={day.toISOString()}
                className="border-l border-zinc-800 relative"
                style={{ height: (HOUR_END - HOUR_START) * ROW_HEIGHT }}
              >
                {/* Hour lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-zinc-800/60"
                    style={{ top: (h - HOUR_START) * ROW_HEIGHT }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((event) => {
                  const colorCls = BG_COLOR_MAP[event.color ?? ''] ?? 'bg-zinc-700/50 border-zinc-500 text-zinc-200';
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1.5 py-0.5 text-left overflow-hidden
                        text-xs cursor-pointer hover:brightness-110 transition-all ${colorCls}`}
                      style={{ top: eventTop(event), height: eventHeight(event) }}
                    >
                      <p className="font-medium truncate leading-tight">{event.title}</p>
                      <p className="opacity-70 text-[10px]">{formatTime(event.start_time)}</p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── MonthView ─────────────────────────────────────────────────────────────────
interface MonthViewProps {
  monthStart: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
}

function MonthView({ monthStart, events, onSelectDay }: MonthViewProps) {
  const today = new Date();
  // Build grid: start from the Monday before monthStart
  const gridStart = startOfWeek(monthStart);
  // 6 weeks max = 42 cells
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="h-full flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {DAYS.map((d) => (
          <div key={d} className="text-center py-2 text-xs text-zinc-500 uppercase font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
        {cells.map((day) => {
          const isCurrentMonth = day.getMonth() === monthStart.getMonth();
          const isToday = isSameDay(day, today);
          const dayEvents = eventsForDay(events, day);
          const visibleEvents = dayEvents.slice(0, 2);
          const overflow = dayEvents.length - 2;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`border-b border-r border-zinc-800 p-1.5 cursor-pointer hover:bg-zinc-800/50 transition-colors
                ${!isCurrentMonth ? 'opacity-40' : ''}`}
            >
              <span className={`text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full
                ${isToday ? 'bg-violet-600 text-white' : 'text-zinc-300'}`}>
                {day.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {visibleEvents.map((e) => {
                  const dotCls = DOT_COLOR_MAP[e.color ?? ''] ?? 'bg-zinc-500';
                  return (
                    <div key={e.id} className="flex items-center gap-1 overflow-hidden">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} />
                      <span className="text-[10px] text-zinc-300 truncate">{e.title}</span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <p className="text-[10px] text-zinc-500">+{overflow} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DayView ───────────────────────────────────────────────────────────────────
interface DayViewProps {
  day: Date;
  events: CalendarEvent[];
}

function DayView({ day, events }: DayViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const dayEvents = eventsForDay(events, day).filter((e) => !e.all_day);
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <>
      {selectedEvent && (
        <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      <div className="overflow-auto h-full">
        <div className="grid grid-cols-[56px_1fr]">
          {/* Hour labels */}
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: ROW_HEIGHT }} className="relative">
                <span className="absolute -top-2.5 right-2 text-[10px] text-zinc-600 select-none">
                  {h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
                </span>
              </div>
            ))}
          </div>

          {/* Events column */}
          <div
            className="border-l border-zinc-800 relative"
            style={{ height: (HOUR_END - HOUR_START) * ROW_HEIGHT }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-zinc-800/60"
                style={{ top: (h - HOUR_START) * ROW_HEIGHT }}
              />
            ))}

            {dayEvents.map((event) => {
              const colorCls = BG_COLOR_MAP[event.color ?? ''] ?? 'bg-zinc-700/50 border-zinc-500 text-zinc-200';
              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`absolute left-1 right-1 rounded border-l-2 px-2 py-1 text-left overflow-hidden
                    cursor-pointer hover:brightness-110 transition-all ${colorCls}`}
                  style={{ top: eventTop(event), height: eventHeight(event) }}
                >
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs opacity-70">{formatTime(event.start_time)} – {formatTime(event.end_time)}</p>
                  {event.description && (
                    <p className="text-xs opacity-60 mt-0.5 line-clamp-2">{event.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ── CalendarPage ──────────────────────────────────────────────────────────────
type View = 'week' | 'month' | 'day';

export function CalendarPage() {
  const [view, setView] = useState<View>('week');
  const [cursor, setCursor] = useState(new Date());

  // Compute date range for data fetching
  const { rangeStart, rangeEnd } = (() => {
    if (view === 'week') {
      const ws = startOfWeek(cursor);
      return { rangeStart: ws, rangeEnd: addDays(ws, 6) };
    }
    if (view === 'month') {
      const ms = startOfMonth(cursor);
      const ws = startOfWeek(ms);
      return { rangeStart: ws, rangeEnd: addDays(ws, 41) };
    }
    // day
    const d = new Date(cursor);
    d.setHours(0, 0, 0, 0);
    return { rangeStart: d, rangeEnd: addDays(d, 1) };
  })();

  const { data: events = [] } = useCalendarEventsRange(rangeStart, rangeEnd);

  function navigate(direction: -1 | 1) {
    setCursor((prev) => {
      const d = new Date(prev);
      if (view === 'week') d.setDate(d.getDate() + direction * 7);
      else if (view === 'month') d.setMonth(d.getMonth() + direction);
      else d.setDate(d.getDate() + direction);
      return d;
    });
  }

  function getTitle(): string {
    if (view === 'week') {
      const ws = startOfWeek(cursor);
      const we = addDays(ws, 6);
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${ws.toLocaleDateString('en-US', opts)} – ${we.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
    }
    if (view === 'month') {
      return cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold text-zinc-100 min-w-[220px] text-center">
            {getTitle()}
          </h1>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="px-3 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border border-zinc-700 overflow-hidden">
            {(['week', 'month', 'day'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors
                  ${view === v
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
              >
                {v}
              </button>
            ))}
          </div>

          <AISchedulingPanel />
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-hidden">
        {view === 'week' && (
          <WeekView weekStart={startOfWeek(cursor)} events={events} />
        )}
        {view === 'month' && (
          <MonthView
            monthStart={startOfMonth(cursor)}
            events={events}
            onSelectDay={(day) => { setCursor(day); setView('day'); }}
          />
        )}
        {view === 'day' && (
          <DayView day={cursor} events={events} />
        )}
      </div>
    </div>
  );
}
