/*import React, { useEffect, useState } from 'react';
import { listUserNotifications, CenterNotification } from "@/services/notifications.service";
import "./NotificationsPage.css";
import { Link } from "react-router-dom";

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<CenterNotification[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const fetchedNotifications = await listUserNotifications();
                setNotifications(fetchedNotifications);
            } catch (err) {
                setError("No se pudieron cargar las notificaciones. Inténtalo de nuevo más tarde.");
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    if (loading) {
        return <div className="notifications-container"><p>Cargando notificaciones...</p></div>;
    }

    if (error) {
        return <div className="notifications-container"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="notifications-container">
            <h1>Buzón de Notificaciones</h1>
            {notifications.length === 0 ? (
                <p>No tienes notificaciones nuevas.</p>
            ) : (
                <ul className="notifications-list">
                    {notifications.map((notification) => (
                        <li key={notification.notification_id} className="notification-item">
                            <div className="notification-header">
                                <h3>{notification.title}</h3>
                                <span className="notification-date">
                                    {new Date(notification.event_at).toLocaleString('es-ES')}
                                </span>
                            </div>
                            <p className="notification-message">{notification.message}</p>
                            <div className="notification-footer">
                                <Link to={`/center/${notification.center_id}/details`}>
                                    Ver detalles del centro
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default NotificationsPage;*/