import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateReminder } from '@/hooks/useReminders';

function formatRemindAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function todayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultTime(): string {
  const d = new Date();
  return `${String(d.getHours() + 1).padStart(2, '0')}:00`;
}

export function QuickReminderModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayDate());
  const [time, setTime] = useState(defaultTime());
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: createReminder, isPending } = useCreateReminder();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setDate(todayDate());
      setTime(defaultTime());
      setError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setTitle('');
      setError('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    const remind_at = new Date(`${date}T${time}:00`).toISOString();
    if (new Date(remind_at) < new Date()) {
      setError('Reminder must be in the future.');
      return;
    }
    setError('');
    await createReminder({ title: title.trim(), remind_at });
    // Show brief success description in console (no toast component yet)
    const _ = formatRemindAt(remind_at); // used for future toast
    void _;
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-sm font-medium">Quick reminder</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-1">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="Remind me to…"
            className="bg-zinc-800 border-zinc-600 text-zinc-100 placeholder:text-zinc-500"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 h-9 px-3 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-32 h-9 px-3 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {isPending ? 'Saving…' : 'Set reminder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
