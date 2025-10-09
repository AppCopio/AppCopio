// src/pages/NotificationsPage/NotificationsPage.tsx
import React, { useEffect, useState } from 'react';
import { Bell, RefreshCw, ExternalLink, Check } from 'lucide-react';
import { listUserNotifications, CenterNotification, markNotificationAsRead } from "@/services/notifications.service";
import { Link } from "react-router-dom";
import "./NotificationsPage.css";

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<CenterNotification[]>([]);
    const [filteredNotifications, setFilteredNotifications] = useState<CenterNotification[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedNotifications = await listUserNotifications();
            setNotifications(fetchedNotifications);
            applyFilter(fetchedNotifications, filter);
        } catch (err) {
            setError("No se pudieron cargar las notificaciones. Inténtalo de nuevo más tarde.");
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = (notifs: CenterNotification[], currentFilter: 'all' | 'unread') => {
        if (currentFilter === 'unread') {
            setFilteredNotifications(notifs.filter(n => !n.read_at));
        } else {
            setFilteredNotifications(notifs);
        }
    };

    const handleFilterChange = (newFilter: 'all' | 'unread') => {
        setFilter(newFilter);
        applyFilter(notifications, newFilter);
    };
    const handleNotificationClick = async (notification: CenterNotification) => {
        // Toggle selección
        setSelectedId(selectedId === notification.notification_id ? null : notification.notification_id);
        
        // Si no está leída, marcarla como leída
        if (!notification.read_at) {
            try {
                await markNotificationAsRead(notification.notification_id);
                
                // Actualizar el estado local
                const updatedNotifications = notifications.map(n => 
                    n.notification_id === notification.notification_id 
                        ? { ...n, read_at: new Date().toISOString() }
                        : n
                );
                setNotifications(updatedNotifications);
                applyFilter(updatedNotifications, filter);
            } catch (error) {
                console.error('Error al marcar notificación como leída:', error);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadNotifications = notifications.filter(n => !n.read_at);
        
        if (unreadNotifications.length === 0) return;

        try {
            // Marcar todas como leídas en paralelo
            await Promise.all(
                unreadNotifications.map(n => markNotificationAsRead(n.notification_id))
            );

            // Actualizar estado local
            const updatedNotifications = notifications.map(n => ({
                ...n,
                read_at: n.read_at || new Date().toISOString()
            }));
            
            setNotifications(updatedNotifications);
            applyFilter(updatedNotifications, filter);
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
            alert('Error al marcar todas las notificaciones como leídas');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const unreadCount = notifications.filter(n => !n.read_at).length;

    useEffect(() => {
        fetchNotifications();
    }, []);

    if (loading) {
        return (
            <div className="notifications-page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Cargando notificaciones...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="notifications-page-container">
                <div className="error-state">
                    <p className="error-message">{error}</p>
                    <button onClick={fetchNotifications} className="retry-btn">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }
    return (
        <div className="notifications-page-container">
            {/* Header */}
            <div className="inbox-header">
                <div className="header-title">
                    <Bell size={32} />
                    <h1>Buzón de Notificaciones</h1>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                    )}
                </div>
                
                <div className="header-actions">
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('all')}
                        >
                            Todas ({notifications.length})
                        </button>
                        <button
                            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('unread')}
                        >
                            No leídas ({unreadCount})
                        </button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllAsRead}
                                className="mark-all-btn"
                                title="Marcar todas como leídas"
                            >
                                <Check size={16} />
                                Marcar todas
                            </button>
                        )}
                        
                        <button 
                            onClick={fetchNotifications} 
                            className="refresh-btn"
                            title="Actualizar"
                        >
                            <RefreshCw size={16} />
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="empty-state">
                    <Bell size={64} />
                    <h2>No hay notificaciones</h2>
                    <p>
                        {filter === 'unread' 
                            ? 'No tienes notificaciones sin leer en este momento.'
                            : 'Aún no has recibido ninguna notificación.'}
                    </p>
                </div>
            ) : (
                <div className="notifications-list">
                    {filteredNotifications.map((notification) => {
                        const isUnread = !notification.read_at;
                        const isSelected = selectedId === notification.notification_id;

                        return (
                            <div
                                key={notification.notification_id}
                                className={`notification-card ${isUnread ? 'unread' : ''} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="notification-indicator">
                                    {isUnread && <div className="unread-dot" />}
                                </div>
                                
                                <div className="notification-content">
                                    <div className="notification-header">
                                        <div className="notification-title">
                                            <span>{notification.title}</span>
                                        </div>
                                        <span className="notification-date">
                                            {formatDate(notification.event_at)}
                                        </span>
                                    </div>
                                    
                                    <p className="notification-message">
                                        {notification.message}
                                    </p>
                                    
                                    <div className="notification-footer">
                                        <div className="center-info">
                                            <span className="center-label">Centro:</span>
                                            <span className="center-name">{notification.center_id}</span>
                                        </div>
                                        
                                        <Link 
                                            to={`/center/${notification.center_id}/details`}
                                            className="go-to-center-btn"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Ver detalles
                                            <ExternalLink size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;