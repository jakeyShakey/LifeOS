import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Brain,
  Bell,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import type { Note } from '@/types';

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Static page items
  const pageItems: CommandItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('/') },
    { id: 'calendar', label: 'Calendar', icon: Calendar, action: () => navigate('/calendar') },
    { id: 'notes', label: 'Notes', icon: FileText, action: () => navigate('/notes') },
    { id: 'brain', label: 'Second Brain', icon: Brain, action: () => navigate('/brain') },
    { id: 'reminders', label: 'Reminders', icon: Bell, action: () => navigate('/reminders') },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => navigate('/settings') },
  ];

  // Recent notes from cache
  const recentNotes = queryClient.getQueryData<Note[]>(['notes', 'recent', user?.id]) ?? [];
  const noteItems: CommandItem[] = recentNotes.map((note) => ({
    id: `note-${note.id}`,
    label: note.title || 'Untitled',
    icon: FileText,
    action: () => navigate(`/notes?note=${note.id}`),
  }));

  const allItems = [...pageItems, ...noteItems];
  const filtered = query
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Global Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const execute = (item: CommandItem) => {
    item.action();
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      execute(filtered[activeIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 p-0 gap-0 overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-zinc-800">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and notes…"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <div className="py-2 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">No results</p>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === activeIndex
                      ? 'bg-violet-600/20 text-zinc-100'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-zinc-400" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
