import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { useReminders, useCompleteReminder } from '@/hooks/useReminders';
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

function ReminderRow({
  reminder,
  onComplete,
}: {
  reminder: Reminder;
  onComplete: (id: string) => void;
}) {
  const isOverdue = new Date(reminder.remind_at) < new Date();

  return (
    <div className="flex items-start gap-3 py-1.5">
      <Checkbox
        id={reminder.id}
        onCheckedChange={() => onComplete(reminder.id)}
        className="mt-0.5 border-zinc-600 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
      />
      <label htmlFor={reminder.id} className="flex-1 cursor-pointer">
        <p className={cn('text-sm font-medium leading-tight', isOverdue ? 'text-amber-400' : 'text-zinc-100')}>
          {reminder.title}
        </p>
        <p className={cn('text-xs mt-0.5', isOverdue ? 'text-amber-500/70' : 'text-zinc-500')}>
          {formatRemindAt(reminder.remind_at)}
          {isOverdue && ' · overdue'}
        </p>
      </label>
    </div>
  );
}

interface RemindersWidgetProps {
  className?: string;
}

export function RemindersWidget({ className }: RemindersWidgetProps) {
  const { data: reminders, isLoading, isError, refetch } = useReminders();
  const { mutate: complete } = useCompleteReminder();

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full', className)}>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
        Reminders
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />
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

      {!isLoading && !isError && reminders?.length === 0 && (
        <EmptyState icon={Bell} message="You're all caught up" />
      )}

      {!isLoading && !isError && reminders && reminders.length > 0 && (
        <div className="divide-y divide-zinc-800">
          {reminders.map((reminder) => (
            <ReminderRow key={reminder.id} reminder={reminder} onComplete={complete} />
          ))}
        </div>
      )}
    </div>
  );
}
