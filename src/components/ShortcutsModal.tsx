import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Shortcut {
  action: string;
  key: string;
}

const SHORTCUTS: Shortcut[] = [
  { action: 'Open this menu', key: '?' },
  { action: 'Command palette', key: '⌘K' },
  { action: 'Quick capture note', key: '⌘⇧N' },
  { action: 'Quick add reminder', key: '⌘⇧R' },
];

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (e.key === '?' && !isEditable) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-sm font-medium">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
            {SHORTCUTS.map((s) => (
              <>
                <span key={`action-${s.action}`} className="text-sm text-zinc-300">
                  {s.action}
                </span>
                <kbd
                  key={`key-${s.action}`}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 whitespace-nowrap self-center justify-self-end"
                >
                  {s.key}
                </kbd>
              </>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
