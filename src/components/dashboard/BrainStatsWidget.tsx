import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrainStats } from '@/hooks/useBrainStats';

interface BrainStatsWidgetProps {
  className?: string;
}

export function BrainStatsWidget({ className }: BrainStatsWidgetProps) {
  const { data: stats, isLoading, isError } = useBrainStats();

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full flex flex-col', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Second Brain
        </p>
        <Brain className="h-3.5 w-3.5 text-zinc-600" />
      </div>

      {isLoading && (
        <div className="space-y-2 flex-1">
          <div className="h-8 bg-zinc-800 rounded animate-pulse" />
          <div className="h-8 bg-zinc-800 rounded animate-pulse" />
        </div>
      )}

      {isError && (
        <p className="text-xs text-zinc-500">Unavailable</p>
      )}

      {!isLoading && !isError && stats && (
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-2xl font-semibold text-zinc-100">{stats.documentCount}</p>
            <p className="text-xs text-zinc-500">documents</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-zinc-100">{stats.chunkCount}</p>
            <p className="text-xs text-zinc-500">indexed chunks</p>
          </div>
        </div>
      )}

      <Link
        to="/brain"
        className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        Open Brain →
      </Link>
    </div>
  );
}
