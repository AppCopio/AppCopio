// src/services/notifications.service.ts
import { api } from "@/lib/api";

export type NotificationStatus = 'queued' | 'sent' | 'failed';

export interface CenterNotification {
  notification_id: string;
  title: string;
  message: string;
  event_at: string;
  center_id: string;
  center_name?: string;
  activation_id?: number | null;
  destinatary_id?: number | null;
  destinatary_name: string | null;
  channel?: string;
  status?: NotificationStatus;
  sent_at?: string | null;
  read_at?: string | null;
  error?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface CreateNotificationDTO {
  center_id: string;
  title: string;
  message: string;
  destinatary_id: number;
  activation_id?: number | null;
  event_at?: string;
  channel?: string;
}

/**
 * Obtiene el historial de notificaciones para un centro específico.
 */
export async function listNotificationsByCenter(centerId: string, signal?: AbortSignal): Promise<CenterNotification[]> {
  try {
    const { data } = await api.get<CenterNotification[]>(`/notifications/by-center/${centerId}`, { signal });
    return data ?? [];
  } catch (error) {
    console.error(`Error fetching notifications for center ${centerId}:`, error);
    return [];
  }
}

/**
 * Crea una nueva notificación.
 */
export async function createNotification(payload: CreateNotificationDTO, signal?: AbortSignal): Promise<CenterNotification> {
  try {
    const { data } = await api.post<CenterNotification>("/notifications", payload, { signal });
    return data;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Obtiene las notificaciones del usuario actual.
 */
export async function listUserNotifications(): Promise<CenterNotification[]> {
  try {
    const { data } = await api.get<CenterNotification[]>("/notifications/me");
    return data ?? [];
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return [];
  }
}

/**
 * Marca una notificación como leída.
 */
export async function markNotificationAsRead(notificationId: string, signal?: AbortSignal): Promise<void> {
  try {
    await api.patch(`/notifications/${notificationId}/mark-read`, {}, { signal });
  } catch (error) {
    console.error(`Error marking notification ${notificationId} as read:`, error);
    throw error;
  }
}

/**
 * Marca todas las notificaciones del usuario como leídas.
 */
export async function markAllNotificationsAsRead(signal?: AbortSignal): Promise<void> {
  try {
    await api.patch('/notifications/mark-all-read', {}, { signal });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}