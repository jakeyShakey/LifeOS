import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  subMessage?: string;
}

export function EmptyState({ icon: Icon, message, subMessage }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="w-7 h-7 text-zinc-600 mb-3" />
      <p className="text-sm text-zinc-500">{message}</p>
      {subMessage && <p className="text-xs text-zinc-600 mt-1">{subMessage}</p>}
    </div>
  );
}
