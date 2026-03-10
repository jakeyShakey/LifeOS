import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { handleDashboardQuery } from '@/lib/ai';
import type { AIResponse, SchedulingIntent, TimeSlot } from '@/types';
import { createScheduledEvent, parseSchedulingIntent } from '@/lib/scheduling';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const SUGGESTIONS = [
  'Schedule a focus block',
  'Summarise my week',
  'Find notes about…',
];

interface AiAssistantBarProps {
  className?: string;
}

// ── SlotCard (inline for dashboard) ──────────────────────────────────────────
function SlotCard({
  slot,
  intent,
  userId,
  onBooked,
}: {
  slot: TimeSlot;
  intent: SchedulingIntent;
  userId: string;
  onBooked: () => void;
}) {
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
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 flex items-center justify-between gap-2">
      <div>
        <p className="text-xs font-medium text-zinc-100">{slot.label}</p>
      </div>
      <Button
        size="sm"
        onClick={handleBook}
        disabled={booking}
        className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-7 px-2 shrink-0"
      >
        {booking ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Book'}
      </Button>
    </div>
  );
}

// ── AiAssistantBar ────────────────────────────────────────────────────────────
export function AiAssistantBar({ className }: AiAssistantBarProps) {
  const { user } = useAuth();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [lastIntent, setLastIntent] = useState<SchedulingIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!value.trim() || !user) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setLastIntent(null);
    const query = value;
    setValue('');
    try {
      // For scheduling responses we need the parsed intent to pass to SlotCard
      const lowerQ = query.toLowerCase();
      const schedulingKws = ['schedule', 'block', 'time', 'hour', 'minutes', 'meeting', 'book', 'slot', 'fit in', 'find time', 'when can'];
      if (schedulingKws.some((kw) => lowerQ.includes(kw))) {
        const intent = await parseSchedulingIntent(query);
        setLastIntent(intent);
      }
      const result = await handleDashboardQuery(user.id, query);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function clearResponse() {
    setResponse(null);
    setLastIntent(null);
    setError(null);
  }

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full flex flex-col', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          AI assistant
        </p>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Ask anything or give a command…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500 focus-visible:ring-2 focus-visible:border-violet-500"
        />
        {loading && <Loader2 className="h-5 w-5 text-violet-400 animate-spin self-center shrink-0" />}
      </div>

      {!response && !loading && !error && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setValue(s)}
              className="px-3 py-1 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-violet-500 hover:text-violet-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-400 mt-1">{error}</p>
      )}

      {response && !loading && (
        <div className="mt-2 space-y-2 flex-1 overflow-auto">
          {response.type === 'scheduling_options' && response.slots && user && lastIntent && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Available slots for "{lastIntent.purpose}":</p>
              {response.slots.length === 0 && (
                <p className="text-xs text-zinc-400">No free slots found. Try a different time window.</p>
              )}
              {response.slots.map((slot, i) => (
                <SlotCard
                  key={i}
                  slot={slot}
                  intent={lastIntent}
                  userId={user.id}
                  onBooked={clearResponse}
                />
              ))}
            </div>
          )}

          {(response.type === 'knowledge_answer' || response.type === 'general_answer') && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-200 leading-relaxed">{response.answer}</p>
              {response.sources && response.sources.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Sources:</p>
                  <ul className="space-y-0.5">
                    {response.sources.map((src) => (
                      <li key={src.document_id} className="text-xs text-violet-400">
                        · {src.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={clearResponse}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
