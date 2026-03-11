import type { Reminder } from '@/types';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

function isDueWithin(remind_at: string, minutes: number): boolean {
  const now = Date.now();
  const due = new Date(remind_at).getTime();
  return due > now && due <= now + minutes * 60 * 1000;
}

export function checkDueReminders(reminders: Reminder[], firedIds: Set<string>): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  for (const reminder of reminders) {
    if (reminder.is_done) continue;
    if (firedIds.has(reminder.id)) continue;
    if (!isDueWithin(reminder.remind_at, 15)) continue;

    firedIds.add(reminder.id);
    const n = new Notification(reminder.title, {
      body: reminder.body ?? undefined,
      tag: reminder.id,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = '/reminders';
    };
  }
}
