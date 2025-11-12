// src/pages/MovementHistoryPage/MovementHistoryPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovementHistory } from '@/services/movements.service';
import type { MovementHistoryItem } from '@/types/movements';
import './MovementHistoryPage.css';

export default function MovementHistoryPage() {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  
  const [movements, setMovements] = useState<MovementHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!centerId) {
      setError('ID de centro no especificado');
      setIsLoading(false);
      return;
    }

    loadMovementHistory();
  }, [centerId]);

  const loadMovementHistory = async () => {
    if (!centerId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getMovementHistory(centerId);
      setMovements(data || []);
    } catch (err: any) {
      console.error('Error loading movement history:', err);
      setError('No se pudo cargar el historial de movimientos. Intenta de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredMovements = () => {
    let filtered = movements;

    // Filtro por tipo
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(m => m.movement_type === typeFilter);
    }

    // Filtro por fecha
    if (startDate) {
      filtered = filtered.filter(m => new Date(m.created_at) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(m => new Date(m.created_at) <= new Date(endDate + 'T23:59:59'));
    }

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.reason.toLowerCase().includes(term) ||
        m.created_by_user_name.toLowerCase().includes(term) ||
        (m.recipient && m.recipient.toLowerCase().includes(term)) ||
        m.items.some(item => item.item_name.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const formatMovementType = (type: string) => {
    switch (type) {
      case 'ENTRY':
        return <span className="movement-type entry">📥 Entrada</span>;
      case 'EXIT':
        return <span className="movement-type exit">📤 Salida</span>;
      case 'ADJUSTMENT':
        return <span className="movement-type adjustment">⚖️ Ajuste</span>;
      default:
        return type;
    }
  };

  const formatSyncStatus = (status: string) => {
    switch (status) {
      case 'SYNCED':
        return <span className="sync-status synced">✅ Sincronizado</span>;
      case 'PENDING':
        return <span className="sync-status pending">⏳ Pendiente</span>;
      case 'ERROR':
        return <span className="sync-status error">❌ Error</span>;
      default:
        return status;
    }
  };

  const clearFilters = () => {
    setTypeFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const exportHistory = () => {
    const filtered = getFilteredMovements();
    const csv = [
      ['Fecha', 'Tipo', 'Usuario', 'Motivo', 'Destinatario', 'Items', 'Estado Sync'],
      ...filtered.map(m => [
        new Date(m.created_at).toLocaleString('es-CL'),
        m.movement_type === 'ENTRY' ? 'Entrada' : m.movement_type === 'EXIT' ? 'Salida' : 'Ajuste',
        m.created_by_user_name,
        m.reason,
        m.recipient || '',
        m.items.map(i => `${i.item_name} (${i.quantity} ${i.unit})`).join('; '),
        m.sync_status === 'SYNCED' ? 'Sincronizado' : m.sync_status === 'PENDING' ? 'Pendiente' : 'Error'
      ])
    ];

    const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `movimientos_centro_${centerId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="movement-history-container">
        <div className="loading">Cargando historial de movimientos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="movement-history-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate(-1)} className="back-btn">Volver</button>
      </div>
    );
  }

  const filteredMovements = getFilteredMovements();

  return (
    <div className="movement-history-container">
      <div className="history-header">
        <div className="header-title">
          <button onClick={() => navigate(-1)} className="back-btn">← Volver</button>
          <h2>Historial de Movimientos - Centro {centerId}</h2>
        </div>
        
        <div className="header-stats">
          <div className="stat">
            <span className="stat-number">{movements.length}</span>
            <span className="stat-label">Total Movimientos</span>
          </div>
          <div className="stat">
            <span className="stat-number">{filteredMovements.length}</span>
            <span className="stat-label">Filtrados</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Tipo de Movimiento:</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">Todos</option>
              <option value="ENTRY">Entradas</option>
              <option value="EXIT">Salidas</option>
              <option value="ADJUSTMENT">Ajustes</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Desde:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Hasta:</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Buscar:</label>
            <input 
              type="text" 
              placeholder="Motivo, usuario, item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filters-actions">
          <button onClick={clearFilters} className="clear-btn">Limpiar Filtros</button>
          <button onClick={exportHistory} className="export-btn">Exportar CSV</button>
        </div>
      </div>

      {/* Lista de movimientos */}
      {filteredMovements.length === 0 ? (
        <div className="no-movements">
          <p>No se encontraron movimientos con los filtros aplicados.</p>
          {movements.length === 0 && (
            <p>Este centro no tiene movimientos registrados aún.</p>
          )}
        </div>
      ) : (
        <div className="movements-list">
          {filteredMovements.map((movement) => (
            <div key={movement.movement_id} className="movement-card">
              <div className="movement-header">
                <div className="movement-info">
                  <div className="movement-main">
                    {formatMovementType(movement.movement_type)}
                    <span className="movement-date">
                      {new Date(movement.created_at).toLocaleString('es-CL')}
                    </span>
                    {formatSyncStatus(movement.sync_status)}
                  </div>
                  <div className="movement-user">
                    Por: <strong>{movement.created_by_user_name}</strong>
                  </div>
                </div>
              </div>

              <div className="movement-body">
                <div className="movement-items">
                  <h4>Items ({movement.items.length}):</h4>
                  <div className="items-grid">
                    {movement.items.map((item) => (
                      <div key={item.movement_item_id} className="item-chip">
                        <span className="item-name">{item.item_name}</span>
                        <span className={`item-quantity ${movement.movement_type === 'ADJUSTMENT' ? 'adjustment' : ''}`}>
                          {item.quantity} {item.unit}
                        </span>
                        <span className="item-category">{item.category_name}</span>
                        {item.previous_stock !== undefined && (
                          <span className="stock-change">
                            Stock: {item.previous_stock} → {item.new_stock}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="movement-details">
                  <div className="detail-row">
                    <strong>Motivo:</strong> 
                    <span>{movement.reason}</span>
                  </div>
                  {movement.recipient && (
                    <div className="detail-row recipient-row">
                      <strong>Destinatario:</strong> 
                      <span>{movement.recipient}</span>
                    </div>
                  )}
                  {movement.notes && (
                    <div className="detail-row">
                      <strong>Notas:</strong> 
                      <span>{movement.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}