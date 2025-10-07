export type NotificationStatus = 'queued' | 'sent' | 'failed';

export type CenterNotification = {
  notification_id: string;
  center_id: string;
  activation_id: number | null;
  destinatary: number | null;
  title: string;
  message: string;
  event_at: string; // ISO
  channel: string;
  status: NotificationStatus;
  sent_at: string | null;
  read_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string | null;
}

export type CreateNotificationInput = {
  center_id: string;
  activation_id?: number | null;
  destinatary?: number | null; // Users.user_id
  title: string;
  message: string;
  event_at?: Date | string; // por defecto now()
  channel?: string;         // por defecto 'system'
};

export type ListOpts = {
  limit?: number;
  offset?: number;
  status?: NotificationStatus | 'any';
  since?: Date | string;
  until?: Date | string;
};