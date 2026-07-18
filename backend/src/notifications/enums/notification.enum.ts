export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WHATSAPP = 'WHATSAPP',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED', // suppressed by user preference
}

/** One BullMQ queue per channel. */
export const NOTIFICATION_QUEUES: Record<NotificationChannel, string> = {
  [NotificationChannel.EMAIL]: 'notify-email',
  [NotificationChannel.SMS]: 'notify-sms',
  [NotificationChannel.PUSH]: 'notify-push',
  [NotificationChannel.WHATSAPP]: 'notify-whatsapp',
};
