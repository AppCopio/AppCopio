import { api } from "@/lib/api";

export interface CenterNotification {
  notification_id: string;
  title: string;
  message: string;
  event_at: string;
  center_id: string;
  destinatary_name: string | null;
}

export interface CreateNotificationDTO {
  center_id: string;
  title: string;
  message: string;
  destinatary_id: number;
}

/**
 * Obtiene el historial de notificaciones para un centro específico.
 */
export async function listNotificationsByCenter(centerId: string, signal?: AbortSignal): Promise<CenterNotification[]> {
  try {
    // 🚨 CORRECCIÓN DE RUTA
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