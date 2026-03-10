import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'Schedule a focus block',
  'Summarise my week',
  'Find notes about…',
];

interface AiAssistantBarProps {
  className?: string;
}

export function AiAssistantBar({ className }: AiAssistantBarProps) {
  const [value, setValue] = useState('');

  function handleSubmit() {
    if (!value.trim()) return;
    // TODO: Session 3 — wire to AI handler
    setValue('');
  }

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full', className)}>
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
      </div>

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
    </div>
  );
}
