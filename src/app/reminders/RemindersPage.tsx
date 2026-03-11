import { useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAllReminders,
  useCompleteReminder,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
} from '@/hooks/useReminders';
import type { Reminder } from '@/types';

function formatRemindAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function toLocalDateString(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalTimeString(iso: string): string {
  const d = new Date(iso);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ── ReminderRow ───────────────────────────────────────────────────────────────

function ReminderRow({
  reminder,
  onComplete,
  onEdit,
  onDelete,
  dimmed,
}: {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  dimmed?: boolean;
}) {
  return (
    <div className="group flex items-start gap-3 py-2">
      <Checkbox
        id={`reminder-${reminder.id}`}
        checked={reminder.is_done ?? false}
        onCheckedChange={() => onComplete(reminder.id)}
        className="mt-0.5 border-zinc-600 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
      />
      <div className="flex-1 min-w-0">
        <p
          onClick={() => onEdit(reminder)}
          className={cn(
            'text-sm font-medium leading-tight cursor-pointer hover:text-violet-300 transition-colors',
            dimmed ? 'line-through text-zinc-500' : 'text-zinc-100'
          )}
        >
          {reminder.title}
        </p>
        <p className="text-xs mt-0.5 text-zinc-500">
          {formatRemindAt(reminder.remind_at)}
          {reminder.recurrence && reminder.recurrence !== 'none' && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-900/40 text-violet-300 capitalize">
              {reminder.recurrence}
            </span>
          )}
        </p>
      </div>
      <button
        onClick={() => onDelete(reminder.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 text-lg leading-none mt-0.5 px-1"
        aria-label="Delete reminder"
      >
        ×
      </button>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  label,
  count,
  color,
  children,
  action,
}: {
  label: string;
  count: number;
  color: 'red' | 'amber' | 'zinc' | 'emerald';
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const colorClass = {
    red: 'text-red-400',
    amber: 'text-amber-400',
    zinc: 'text-zinc-400',
    emerald: 'text-emerald-400',
  }[color];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className={cn('text-xs font-semibold uppercase tracking-wider', colorClass)}>
            {label}
          </h2>
          <span className="text-xs text-zinc-600">{count}</span>
        </div>
        {action}
      </div>
      <div className="divide-y divide-zinc-800/60">{children}</div>
    </div>
  );
}

// ── CreateReminderForm ────────────────────────────────────────────────────────

function CreateReminderForm({ onClose }: { onClose: () => void }) {
  const today = new Date();
  const defaultDate = toLocalDateString(today.toISOString());
  const defaultTime = `${String(today.getHours() + 1).padStart(2, '0')}:00`;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [recurrence, setRecurrence] = useState('none');
  const [error, setError] = useState('');

  const { mutateAsync: createReminder, isPending } = useCreateReminder();

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
    await createReminder({
      title: title.trim(),
      remind_at,
      recurrence: recurrence === 'none' ? null : recurrence,
    });
    onClose();
  };

  return (
    <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-zinc-200 mb-3">New Reminder</h3>
      <div className="space-y-3">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Reminder title…"
          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
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
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="w-32 h-9 px-3 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
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
            {isPending ? 'Saving…' : 'Add Reminder'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── EditReminderModal ─────────────────────────────────────────────────────────

function EditReminderModal({
  reminder,
  onClose,
}: {
  reminder: Reminder;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(reminder.title);
  const [date, setDate] = useState(toLocalDateString(reminder.remind_at));
  const [time, setTime] = useState(toLocalTimeString(reminder.remind_at));
  const [recurrence, setRecurrence] = useState(reminder.recurrence ?? 'none');
  const [error, setError] = useState('');

  const { mutateAsync: updateReminder, isPending: isUpdating } = useUpdateReminder();
  const { mutateAsync: deleteReminder, isPending: isDeleting } = useDeleteReminder();

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    const remind_at = new Date(`${date}T${time}:00`).toISOString();
    setError('');
    await updateReminder({
      id: reminder.id,
      title: title.trim(),
      remind_at,
      recurrence: recurrence === 'none' ? null : recurrence,
    });
    onClose();
  };

  const handleDelete = async () => {
    await deleteReminder(reminder.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-sm font-medium">Edit Reminder</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
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
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="w-full h-9 px-3 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {isUpdating ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── RemindersPage ─────────────────────────────────────────────────────────────

export function RemindersPage() {
  const { data: reminders, isLoading, isError, refetch } = useAllReminders();
  const { mutate: complete } = useCompleteReminder();
  const { mutate: deleteReminder } = useDeleteReminder();

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const overdue = reminders?.filter((r) => !r.is_done && new Date(r.remind_at) < now) ?? [];
  const dueToday = reminders?.filter(
    (r) => !r.is_done && new Date(r.remind_at) >= now && new Date(r.remind_at) <= todayEnd
  ) ?? [];
  const upcoming = reminders?.filter((r) => !r.is_done && new Date(r.remind_at) > todayEnd) ?? [];
  const completed = reminders?.filter((r) => r.is_done) ?? [];

  const isEmpty =
    !isLoading && !isError && overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0;

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Reminders</h1>
        <Button
          size="sm"
          onClick={() => setCreateOpen((v) => !v)}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          + New Reminder
        </Button>
      </div>

      {createOpen && <CreateReminderForm onClose={() => setCreateOpen(false)} />}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-sm text-zinc-400">
          Failed to load reminders.{' '}
          <button onClick={() => refetch()} className="text-violet-400 hover:text-violet-300 underline">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">You're all caught up</p>
              <p className="text-xs text-zinc-600 mt-1">No pending reminders</p>
            </div>
          )}

          {overdue.length > 0 && (
            <Section
              label="Overdue"
              count={overdue.length}
              color="red"
              action={
                <button
                  onClick={() => overdue.forEach((r) => complete(r.id))}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Mark all complete
                </button>
              }
            >
              {overdue.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  onComplete={complete}
                  onEdit={setEditingReminder}
                  onDelete={deleteReminder}
                />
              ))}
            </Section>
          )}

          {dueToday.length > 0 && (
            <Section label="Due Today" count={dueToday.length} color="amber">
              {dueToday.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  onComplete={complete}
                  onEdit={setEditingReminder}
                  onDelete={deleteReminder}
                />
              ))}
            </Section>
          )}

          {upcoming.length > 0 && (
            <Section label="Upcoming" count={upcoming.length} color="zinc">
              {upcoming.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  onComplete={complete}
                  onEdit={setEditingReminder}
                  onDelete={deleteReminder}
                />
              ))}
            </Section>
          )}

          {completed.length > 0 && (
            <Section
              label="Completed"
              count={completed.length}
              color="emerald"
              action={
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCompleted((v) => !v)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showCompleted ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => completed.forEach((r) => deleteReminder(r.id))}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              }
            >
              {showCompleted &&
                completed.map((r) => (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    onComplete={complete}
                    onEdit={setEditingReminder}
                    onDelete={deleteReminder}
                    dimmed
                  />
                ))}
            </Section>
          )}
        </>
      )}

      {editingReminder && (
        <EditReminderModal
          reminder={editingReminder}
          onClose={() => setEditingReminder(null)}
        />
      )}
    </div>
  );
}
