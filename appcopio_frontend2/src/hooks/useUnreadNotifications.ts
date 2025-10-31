import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Notification {
  notification_id: string;
  read_at: string | null;
  // ... otros campos según tu API
}

export function useUnreadNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) {
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/notifications/by-user/${user.user_id}`);
        const notifications: Notification[] = response.data || [];
        
        // Contar notificaciones no leídas
        const unread = notifications.filter((n) => !n.read_at).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [user, isAuthenticated]);

  return { unreadCount, loading };
}