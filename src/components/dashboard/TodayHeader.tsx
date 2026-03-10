import { cn } from '@/lib/utils';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface TodayHeaderProps {
  className?: string;
}

export function TodayHeader({ className }: TodayHeaderProps) {
  const now = new Date();
  const greeting = getGreeting();

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={cn(
        'bg-zinc-900 border border-zinc-800 rounded-lg p-5 h-full',
        className
      )}
    >
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
        {greeting}
      </p>
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-semibold text-zinc-100">{dayName}</h1>
        <span className="text-lg text-zinc-400">{dateStr}</span>
      </div>
    </div>
  );
}
