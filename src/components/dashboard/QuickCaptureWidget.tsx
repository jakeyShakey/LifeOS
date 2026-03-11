import { useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCreateNote } from '@/hooks/useNotes';

interface QuickCaptureWidgetProps {
  className?: string;
}

export function QuickCaptureWidget({ className }: QuickCaptureWidgetProps) {
  const [value, setValue] = useState('');
  const { toast } = useToast();
  const { mutate: createNote, isPending } = useCreateNote();

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !value.trim() || isPending) return;

    const title = value.trim();
    setValue('');

    createNote({ title }, {
      onSuccess: () => {
        toast({
          title: 'Note created',
          description: `"${title}" was added to your notes.`,
        });
      },
      onError: () => {
        toast({
          title: 'Failed to create note',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
        setValue(title);
      },
    });
  }

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full', className)}>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
        Quick capture
      </p>
      <Input
        placeholder="Capture a thought… (Enter to save)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500 focus-visible:ring-1 focus-visible:border-violet-500"
      />
      <p className="text-xs text-zinc-600 mt-2">Press Enter to save as a note</p>
    </div>
  );
}
