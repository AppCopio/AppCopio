import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

// Tipos (asegúrate de que coincidan con tu proyecto)
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
      <style>{`
        .notifications-history {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .notifications-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f0f0f0;
        }

        .notifications-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .notifications-title svg {
          color: #0066cc;
        }

        .notifications-count {
          background: #0066cc;
          color: white;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
        }

        .notifications-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
        }

        .filter-btn {
          padding: 8px 16px;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: #f5f5f5;
        }

        .filter-btn.active {
          background: #0066cc;
          color: white;
          border-color: #0066cc;
        }

        .refresh-btn {
          padding: 8px 12px;
          border: none;
          background: #f0f0f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #e0e0e0;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-card {
          border: 1px solid #e8e8e8;
          border-radius: 10px;
          padding: 16px;
          transition: all 0.2s;
          cursor: pointer;
          background: white;
        }

        .notification-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }

        .notification-card.unread {
          background: #f0f7ff;
          border-left: 4px solid #0066cc;
        }

        .notification-card.expanded {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .notification-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .notification-main {
          flex: 1;
          min-width: 0;
        }

        .notification-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .notification-title-text {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          flex: 1;
        }

        .notification-message {
          color: #666;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .notification-message.collapsed {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 13px;
          color: #999;
          margin-top: 8px;
        }

        .notification-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .notification-date {
          color: #999;
          font-size: 13px;
        }

        .status-icon {
          flex-shrink: 0;
        }

        .status-icon.success {
          color: #10b981;
        }

        .status-icon.error {
          color: #ef4444;
        }

        .status-icon.pending {
          color: #f59e0b;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #666;
          font-size: 18px;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: #999;
        }

        .spinner {
          border: 3px solid #f0f0f0;
          border-top: 3px solid #0066cc;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .unread-badge {
          background: #ef4444;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .notifications-history {
            padding: 16px;
          }

          .notifications-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .notifications-controls {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

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