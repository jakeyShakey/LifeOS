import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { value: String(i), label: `${h}:00 ${ampm}` };
});

function SectionDivider() {
  return <div className="border-t border-zinc-800 my-8" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-zinc-200 mb-4">{children}</h2>;
}

export function SettingsPage() {
  const { user } = useAuth();

  // ── Connected Accounts ──────────────────────────────────────────────────────
  const { data: connections } = useQuery({
    queryKey: ['calendar_connections', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });

  const handleDisconnect = async () => {
    await supabase.auth.signOut();
  };

  // ── Working Hours ───────────────────────────────────────────────────────────
  const [workStart, setWorkStart] = useState(
    () => localStorage.getItem('lifeos:workingHoursStart') ?? '9'
  );
  const [workEnd, setWorkEnd] = useState(
    () => localStorage.getItem('lifeos:workingHoursEnd') ?? '18'
  );

  useEffect(() => {
    localStorage.setItem('lifeos:workingHoursStart', workStart);
  }, [workStart]);

  useEffect(() => {
    localStorage.setItem('lifeos:workingHoursEnd', workEnd);
  }, [workEnd]);

  // ── AI Preferences ──────────────────────────────────────────────────────────
  const [aiStyle, setAiStyle] = useState(
    () => localStorage.getItem('lifeos:aiStyle') ?? 'concise'
  );

  useEffect(() => {
    localStorage.setItem('lifeos:aiStyle', aiStyle);
  }, [aiStyle]);

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-8">Settings</h1>

      {/* Connected Accounts */}
      <section>
        <SectionTitle>Connected Accounts</SectionTitle>
        {connections && connections.length > 0 ? (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-medium">
                    G
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{conn.email ?? 'Google Account'}</p>
                    <p className="text-xs text-zinc-500">Google Calendar</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    Connected
                  </span>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-4 flex items-center justify-between">
            <p className="text-sm text-zinc-400">No accounts connected</p>
            <a
              href="/auth"
              className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              Connect Google Calendar →
            </a>
          </div>
        )}
      </section>

      <SectionDivider />

      {/* Working Hours */}
      <section>
        <SectionTitle>Working Hours</SectionTitle>
        <p className="text-xs text-zinc-500 mb-4">
          Used for AI scheduling suggestions.
          {/* TODO: wire into scheduling.ts */}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1.5">Start</label>
            <select
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-zinc-600 mt-5">–</div>
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1.5">End</label>
            <select
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* AI Preferences */}
      <section>
        <SectionTitle>AI Response Style</SectionTitle>
        <p className="text-xs text-zinc-500 mb-4">
          How the AI assistant formats its answers.
          {/* TODO: pass to AI call context */}
        </p>
        <div className="flex gap-2">
          {(['concise', 'detailed'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setAiStyle(style)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                aiStyle === style
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
