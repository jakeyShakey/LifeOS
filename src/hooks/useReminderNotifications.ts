import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { requestNotificationPermission, checkDueReminders } from '@/lib/notifications';
import type { Reminder } from '@/types';

export function useReminderNotifications() {
  const firedIds = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    requestNotificationPermission();

    const run = () => {
      const data = queryClient.getQueryData<Reminder[]>(['reminders', user.id]);
      if (data) checkDueReminders(data, firedIds.current);
    };

    run();
    const interval = setInterval(run, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, queryClient]);
}
