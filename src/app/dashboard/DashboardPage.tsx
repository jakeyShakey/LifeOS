import { TodayHeader } from '@/components/dashboard/TodayHeader';
import { AgendaWidget } from '@/components/dashboard/AgendaWidget';
import { RemindersWidget } from '@/components/dashboard/RemindersWidget';
import { RecentNotesWidget } from '@/components/dashboard/RecentNotesWidget';
import { QuickCaptureWidget } from '@/components/dashboard/QuickCaptureWidget';
import { BrainStatsWidget } from '@/components/dashboard/BrainStatsWidget';
import { UpcomingEventsWidget } from '@/components/dashboard/UpcomingEventsWidget';
import { AiAssistantBar } from '@/components/dashboard/AiAssistantBar';

export function DashboardPage() {
  return (
    <div className="p-6 space-y-3">
      {/* Row 1: Header */}
      <div className="grid grid-cols-12 gap-3">
        <TodayHeader className="col-span-12" />
      </div>

      {/* Row 2: Agenda + Reminders */}
      <div className="grid grid-cols-12 gap-3">
        <AgendaWidget className="col-span-12 md:col-span-7" />
        <RemindersWidget className="col-span-12 md:col-span-5" />
      </div>

      {/* Row 3: Recent Notes + Quick Capture + Brain Stats */}
      <div className="grid grid-cols-12 gap-3">
        <RecentNotesWidget className="col-span-12 md:col-span-5" />
        <QuickCaptureWidget className="col-span-12 md:col-span-5" />
        <BrainStatsWidget className="col-span-12 md:col-span-2" />
      </div>

      {/* Row 4: Upcoming Events */}
      <div className="grid grid-cols-12 gap-3">
        <UpcomingEventsWidget className="col-span-12 md:col-span-7" />
      </div>

      {/* Row 5: AI Assistant */}
      <div className="grid grid-cols-12 gap-3">
        <AiAssistantBar className="col-span-12" />
      </div>
    </div>
  );
}
