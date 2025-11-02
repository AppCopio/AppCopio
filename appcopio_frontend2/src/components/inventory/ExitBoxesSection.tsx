// src/components/inventory/ExitBoxesSection.tsx
import React, { useState, useEffect } from 'react';
import './ExitBoxesSection.css';

interface ExitBox {
  box_id: number;
  name: string;
  description?: string;
  type: string;
  items: Array<{
    item_name: string;
    category: string;
    quantity: number;
    unit: string;
    inventory_item_id: number;
  }>;
  created_at: string;
  ready_for_delivery: boolean;
  family?: {
    name: string;
  };
  status?: 'created' | 'delivered';
}

interface ExitBoxesSectionProps {
  centerId: string;
}

export default function ExitBoxesSection({ centerId }: ExitBoxesSectionProps) {
  const [exitBoxes, setExitBoxes] = useState<ExitBox[]>([]);
  const [expandedBox, setExpandedBox] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'created'>('all');

  useEffect(() => {
    const loadExitBoxes = () => {
      try {
        const exitBoxesData = JSON.parse(localStorage.getItem('exitBoxes') || '[]');
        // Por ahora incluir todas las cajas (más adelante filtrar por centro)
        setExitBoxes(exitBoxesData);
      } catch (error) {
        console.error('Error loading exit boxes:', error);
        setExitBoxes([]);
      }
    };

    loadExitBoxes();

    // Escuchar cambios en localStorage (solo funciona entre pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'exitBoxes') {
        loadExitBoxes();
      }
    };

    // Escuchar evento personalizado para actualizaciones inmediatas
    const handleExitBoxUpdate = () => {
      loadExitBoxes();
    };

    // Polling para detectar cambios en la misma pestaña (como respaldo)
    const pollInterval = setInterval(() => {
      loadExitBoxes();
    }, 5000); // Verificar cada 5 segundos como respaldo

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('exitBoxesUpdated', handleExitBoxUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('exitBoxesUpdated', handleExitBoxUpdate);
      clearInterval(pollInterval);
    };
  }, [centerId]);

  const filteredBoxes = exitBoxes.filter(box => {
    if (filter === 'all') return true;
    const status = box.status || 'created'; // Por defecto 'created' si no tiene status
    return status === 'created'; // Solo mostrar las creadas cuando se filtra
  });

  const toggleBoxExpansion = (boxId: number) => {
    setExpandedBox(expandedBox === boxId ? null : boxId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return '#f59e0b';
      case 'delivered': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'created': return 'Creada';
      case 'delivered': return 'Entregada';
      default: return 'Desconocido';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getTotalItems = (box: ExitBox) => {
    return box.items.reduce((total, item) => total + item.quantity, 0);
  };

  if (exitBoxes.length === 0) {
    return (
      <div className="exit-boxes-section">
        <div className="section-header">
          <h3>📦 Cajas de Salida</h3>
          <span className="boxes-count">0 cajas</span>
        </div>
        <div className="empty-boxes">
          <p>No hay cajas de salida creadas para este centro.</p>
          <p className="empty-hint">Usa el botón "Gestionar Cajas" para crear nuevas cajas de salida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="exit-boxes-section">
      <div className="section-header">
        <h3>📦 Cajas de Salida</h3>
        <div className="header-controls">
          <div className="filter-controls">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todas ({exitBoxes.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'created' ? 'active' : ''}`}
              onClick={() => setFilter('created')}
            >
              Creadas ({exitBoxes.filter(b => (b.status || 'created') === 'created').length})
            </button>
          </div>
        </div>
      </div>

      <div className="boxes-grid">
        {filteredBoxes.map(box => (
          <div key={box.box_id} className="box-card">
            <div className="box-header" onClick={() => toggleBoxExpansion(box.box_id)}>
              <div className="box-info">
                <h4 className="box-name">{box.name}</h4>
                <div className="box-meta">
                  <span className="box-date">{formatDate(box.created_at)}</span>
                  <span 
                    className="box-status" 
                    style={{ backgroundColor: getStatusColor(box.status || 'created') }}
                  >
                    {getStatusText(box.status || 'created')}
                  </span>
                </div>
              </div>
              <div className="box-summary">
                <span className="items-count">{getTotalItems(box)} items</span>
                <span className="expand-icon">
                  {expandedBox === box.box_id ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {expandedBox === box.box_id && (
              <div className="box-details">
                {box.family && (
                  <div className="box-family">
                    <strong>Familia destinataria:</strong> {box.family.name}
                  </div>
                )}
                <div className="box-items">
                  <h5>Contenido de la caja:</h5>
                  <div className="items-list">
                    {box.items.map((item, index) => (
                      <div key={index} className="item-row">
                        <span className="item-name">{item.item_name}</span>
                        <span className="item-quantity">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}