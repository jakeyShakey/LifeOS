import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/components/AuthProvider';
import { AuthGuard } from '@/components/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from '@/components/ui/toaster';
import { AuthPage } from '@/app/auth/AuthPage';
import { DashboardPage } from '@/app/dashboard/DashboardPage';
import { CalendarPage } from '@/app/calendar/CalendarPage';
import { NotesPage } from '@/app/notes/NotesPage';
import { BrainPage } from '@/app/brain/BrainPage';
import { RemindersPage } from '@/app/reminders/RemindersPage';
import { SettingsPage } from '@/app/settings/SettingsPage';
import { QuickCaptureModal } from '@/components/notes/QuickCaptureModal';
import { QuickReminderModal } from '@/components/reminders/QuickReminderModal';
import { CommandPalette } from '@/components/CommandPalette';
import { ShortcutsModal } from '@/components/ShortcutsModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              element={
                <AuthGuard>
                  <AppLayout>
                    <Outlet />
                  </AppLayout>
                </AuthGuard>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/brain" element={<BrainPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
          <QuickCaptureModal />
          <QuickReminderModal />
          <CommandPalette />
          <ShortcutsModal />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
