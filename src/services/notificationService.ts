import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativePlatform } from './nativeBridge';

/**
 * LabourBook Smart Notification Service
 * Manages 3 Daily Automated Push Reminders:
 * 1. Morning (09:00 AM) - "🌞 Good Morning! Attendance ka time hai! ⏰"
 * 2. Afternoon (02:00 PM) - "☀️ Time for a Break! Take a little break ☕"
 * 3. Evening (06:00 PM) - "🌙 Evening Checkout! Final attendance Time! ✅"
 */

export interface ReminderConfig {
  id: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

export const DAILY_REMINDERS: ReminderConfig[] = [
  {
    id: 101,
    hour: 9,
    minute: 0,
    title: '🌞 Good Morning!',
    body: 'Attendance ka time hai! ⏰'
  },
  {
    id: 102,
    hour: 14,
    minute: 0,
    title: '☀️ Time for a Break!',
    body: 'Take a little break ☕'
  },
  {
    id: 103,
    hour: 18,
    minute: 0,
    title: '🌙 Evening Checkout',
    body: 'Final attendance Time! ✅'
  }
];

let webTimers: ReturnType<typeof setTimeout>[] = [];

/**
 * Register Service Worker for PWA Web Version
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.warn('[NotificationService] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Request notification permissions (Native Android & Web Browser)
 */
export async function requestNotificationPermission(): Promise<'granted' | 'denied'> {
  if (isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      const req = await LocalNotifications.requestPermissions();
      return req.display === 'granted' ? 'granted' : 'denied';
    } catch (e) {
      console.warn('[NotificationService] Native permission check failed:', e);
      return 'denied';
    }
  }

  // Web Browser fallback
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') return 'granted';

  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted' ? 'granted' : 'denied';
  } catch (err) {
    console.warn('[NotificationService] Web permission request failed:', err);
    return 'denied';
  }
}

/**
 * Show an immediate test or alert notification
 */
export async function showAppNotification(
  title: string,
  body: string,
  id: number = 999
): Promise<boolean> {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return false;

  if (isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: id,
            title: title,
            body: body,
            smallIcon: 'ic_launcher_round',
            iconColor: '#1656D6',
            sound: 'default'
          }
        ]
      });
      return true;
    } catch (e) {
      console.warn('[NotificationService] Native immediate notification failed:', e);
      return false;
    }
  }

  // Web Browser Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/ic_app_logo.png'
      });
      return true;
    } catch (e) {
      console.warn('[NotificationService] Web notification failed:', e);
    }
  }

  return false;
}

/**
 * Schedule 3 Daily Attendance Reminders (9 AM, 2 PM, 6 PM)
 * Avoids duplicates using stable IDs and survives app restarts.
 */
export async function scheduleDailyReminders(requestPermissionOnStart: boolean = false): Promise<boolean> {
  // 1. Native Android Local Notifications
  if (isNativePlatform()) {
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        if (!requestPermissionOnStart) return false;
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return false;
      }

      // Check existing pending notifications to avoid duplicate scheduling
      const pending = await LocalNotifications.getPending();
      const pendingIds = new Set(pending.notifications.map((n) => n.id));

      const notificationsToSchedule = DAILY_REMINDERS.filter((rem) => !pendingIds.has(rem.id)).map((rem) => ({
        id: rem.id,
        title: rem.title,
        body: rem.body,
        schedule: {
          on: {
            hour: rem.hour,
            minute: rem.minute
          },
          allowWhileIdle: true
        },
        smallIcon: 'ic_launcher_round',
        iconColor: '#1656D6',
        sound: 'default'
      }));

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
        console.log(`[NotificationService] Scheduled ${notificationsToSchedule.length} native reminders`);
      }

      return true;
    } catch (err) {
      console.warn('[NotificationService] Native scheduling failed:', err);
      return false;
    }
  }

  // 2. Web Browser Fallback (Service Worker / setTimeout)
  clearWebTimers();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    if (!requestPermissionOnStart) return false;
    const p = await requestNotificationPermission();
    if (p !== 'granted') return false;
  }

  DAILY_REMINDERS.forEach((rem) => {
    scheduleWebTimer(rem);
  });

  return true;
}

function scheduleWebTimer(rem: ReminderConfig) {
  const now = new Date();
  const target = new Date();
  target.setHours(rem.hour, rem.minute, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const delayMs = target.getTime() - now.getTime();

  const timer = setTimeout(() => {
    showAppNotification(rem.title, rem.body, rem.id);
    scheduleWebTimer(rem); // Reschedule for next day
  }, delayMs);

  webTimers.push(timer);
}

function clearWebTimers() {
  webTimers.forEach((t) => clearTimeout(t));
  webTimers = [];
}

/**
 * Send a test reminder
 */
export async function sendTestReminder(type: 'morning' | 'afternoon' | 'evening' = 'morning'): Promise<boolean> {
  const map: Record<string, { title: string; body: string; id: number }> = {
    morning: { title: '🌞 Good Morning!', body: 'Attendance ka time hai! ⏰', id: 201 },
    afternoon: { title: '☀️ Time for a Break!', body: 'Take a little break ☕', id: 202 },
    evening: { title: '🌙 Evening Checkout', body: 'Final attendance Time! ✅', id: 203 }
  };

  const item = map[type] || map.morning;
  return await showAppNotification(item.title, item.body, item.id);
}
