import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Brain,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/google-auth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/brain', icon: Brain, label: 'Second Brain' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
] as const;

export function Sidebar() {
  const { user } = useAuth();
  const email = user?.email ?? '';
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="hidden md:flex w-60 h-screen bg-zinc-900 border-r border-zinc-800 flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <span className="text-lg font-semibold tracking-tight text-zinc-100">
          Life <span className="text-violet-400">OS</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'border-l-2 border-violet-500 bg-violet-950/30 text-zinc-100 pl-[10px]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-zinc-800 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
              isActive
                ? 'border-l-2 border-violet-500 bg-violet-950/30 text-zinc-100 pl-[10px]'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
            ].join(' ')
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </NavLink>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="bg-violet-800 text-zinc-100 text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-xs text-zinc-400 truncate">{email}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 px-3"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
