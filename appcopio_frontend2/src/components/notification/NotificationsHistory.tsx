import React, { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Info } from 'lucide-react';
import './NotificationHistory.css';

// Tipos
interface CenterNotification {
  notification_id: string;
  title: string;
  message: string;
  event_at: string;
  center_id: string;
  destinatary_name: string | null;
  status?: 'queued' | 'sent' | 'failed';
  read_at?: string | null;
}

interface NotificationsHistoryProps {
  notifications: CenterNotification[];
  loading?: boolean;
  onRefresh?: () => void;
}

const NotificationsHistory: React.FC<NotificationsHistoryProps> = ({ 
  notifications = [], 
  loading = false,
  onRefresh 
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Asegurar que notifications siempre sea un array
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const filteredNotifications = filter === 'unread' 
    ? safeNotifications.filter(n => !n.read_at)
    : safeNotifications;

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="status-icon success" size={16} />;
      case 'failed':
        return <AlertCircle className="status-icon error" size={16} />;
      case 'queued':
        return <Info className="status-icon pending" size={16} />;
      default:
        return <Bell className="status-icon" size={16} />;
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
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="notifications-history">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando notificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-history">
      <div className="notifications-header">
        <div className="notifications-title">
          <Bell size={24} />
          <span>Historial de Notificaciones</span>
          {filteredNotifications.length > 0 && (
            <span className="notifications-count">
              {filteredNotifications.length}
            </span>
          )}
        </div>
        
        <div className="notifications-controls">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todas
            </button>
            <button
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              No leídas
            </button>
          </div>
          
          {onRefresh && (
            <button className="refresh-btn" onClick={onRefresh} title="Actualizar">
              ↻
            </button>
          )}
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} />
          <h3>No hay notificaciones</h3>
          <p>
            {filter === 'unread' 
              ? 'No tienes notificaciones sin leer'
              : 'No se han enviado notificaciones para este centro'}
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((notif) => {
            const isExpanded = expandedId === notif.notification_id;
            const isUnread = !notif.read_at;

            return (
              <div
                key={notif.notification_id}
                className={`notification-card ${isUnread ? 'unread' : ''} ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleExpand(notif.notification_id)}
              >
                <div className="notification-header-content">
                  <div className="notification-main">
                    <div className="notification-title-row">
                      {isUnread && <div className="unread-badge" />}
                      <div className="notification-title-text">
                        {notif.title}
                      </div>
                      {getStatusIcon(notif.status)}
                    </div>

                    <div className={`notification-message ${!isExpanded ? 'collapsed' : ''}`}>
                      {notif.message}
                    </div>

                    <div className="notification-meta">
                      <div className="notification-meta-item">
                        <span>📅</span>
                        <span>{formatDate(notif.event_at)}</span>
                      </div>
                      
                      {notif.destinatary_name && (
                        <div className="notification-meta-item">
                          <span>👤</span>
                          <span>{notif.destinatary_name}</span>
                        </div>
                      )}

                      {notif.status && (
                        <div className="notification-meta-item">
                          <span>Estado: {notif.status}</span>
                        </div>
                      )}
                    </div>
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

export default NotificationsHistory;