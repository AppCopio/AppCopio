import * as React from "react";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./InventoryHistoryPage.css";

import { listInventoryLogs } from "@/services/inventory.service";
import type { InventoryLog } from "@/types/inventory";
import { useScrollToTop } from '@/hooks/useScrollToTop';

const formatActionType = (action: InventoryLog["action_type"]) => {
  switch (action) {
    case "ADD":
      return { icon: "📥", text: "Entrada", class: "action-add" };
    case "ADJUST":
      return { icon: "⚖️", text: "Ajuste", class: "action-adjust" };
    case "SUB":
      return { icon: "📤", text: "Salida", class: "action-sub" };
    default:
      return { icon: "❓", text: action, class: "action-unknown" };
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export default function InventoryHistoryPage() {
  useScrollToTop({ behavior: 'smooth' });
  const { centerId } = useParams<{ centerId: string }>();

  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    console.log('🔍 InventoryHistoryPage: useEffect ejecutado, centerId:', centerId);
    
    if (!centerId) {
      setIsLoading(false);
      setError("No se ha especificado un centro.");
      return;
    }

    const controller = new AbortController();

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('🚀 InventoryHistoryPage: Llamando a listInventoryLogs...');
        const data = await listInventoryLogs(centerId, controller.signal);
        console.log('📊 InventoryHistoryPage: Datos recibidos:', data);
        setLogs(data || []);
      } catch (e: any) {
        if (!controller.signal.aborted) {
          console.error("❌ InventoryHistoryPage: Error cargando el historial:", e);
          setError("No se pudo cargar el historial. Por favor, intente de nuevo más tarde.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [centerId]);

  // Filtrar logs según filtros activos
  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === "all" || log.action_type === filterAction;
    const matchesSearch = searchTerm === "" || 
      log.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_name && log.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesAction && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="history-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Cargando historial de movimientos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error al cargar el historial</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      {/* Header con navegación */}
      <div className="history-header">
        <div className="header-top">
          <div className="header-back">
            <Link to={`/center/${centerId}/inventory`} className="back-link">
              ← Volver al Inventario
            </Link>
          </div>
          <div className="header-title-section">
            <h1>📋 Historial de Movimientos</h1>
            <div className="center-info">Centro {centerId}</div>
          </div>
        </div>

        {/* Estadísticas rápidas - Movidas aquí */}
        <div className="history-stats">
          <div className="stat-card">
            <span className="stat-number">{logs.length}</span>
            <span className="stat-label">Total movimientos</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{logs.filter(log => log.action_type === "ADD").length}</span>
            <span className="stat-label">Entradas</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{logs.filter(log => log.action_type === "SUB").length}</span>
            <span className="stat-label">Salidas</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{filteredLogs.length}</span>
            <span className="stat-label">Mostrando</span>
          </div>
        </div>

        {/* Controles de filtrado */}
        <div className="history-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Buscar producto, usuario o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterAction === "all" ? "active" : ""}`}
              onClick={() => setFilterAction("all")}
            >
              📊 Todos
            </button>
            <button 
              className={`filter-btn ${filterAction === "ADD" ? "active" : ""}`}
              onClick={() => setFilterAction("ADD")}
            >
              📥 Entradas
            </button>
            <button 
              className={`filter-btn ${filterAction === "SUB" ? "active" : ""}`}
              onClick={() => setFilterAction("SUB")}
            >
              📤 Salidas
            </button>
            <button 
              className={`filter-btn ${filterAction === "ADJUST" ? "active" : ""}`}
              onClick={() => setFilterAction("ADJUST")}
            >
              ⚖️ Ajustes
            </button>
          </div>
        </div>
      </div>

      {/* Lista de movimientos */}
      <div className="history-content">
        {filteredLogs.length > 0 ? (
          <div className="movements-list">
            {filteredLogs.map((log) => {
              const actionInfo = formatActionType(log.action_type);
              return (
                <div key={log.log_id} className={`movement-card ${actionInfo.class}`}>
                  <div className="movement-header">
                    <div className="movement-action">
                      <span className="action-icon">{actionInfo.icon}</span>
                      <span className="action-text">{actionInfo.text}</span>
                    </div>
                    <div className="movement-date">{formatDate(log.created_at)}</div>
                  </div>
                  
                  <div className="movement-body">
                    <div className="movement-product">
                      <h4>{log.product_name}</h4>
                      <span className="movement-quantity">
                        {log.action_type === "SUB" ? "-" : "+"}{log.quantity}
                      </span>
                    </div>
                    
                    <div className="movement-details">
                      {log.user_name && (
                        <div className="movement-user">
                          👤 {log.user_name}
                        </div>
                      )}
                      
                      {log.reason && (
                        <div className="movement-reason">
                          📝 {log.reason}
                        </div>
                      )}
                      
                      {log.notes && (
                        <div className="movement-notes">
                          💬 {log.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No hay movimientos</h3>
            <p>
              {searchTerm || filterAction !== "all" 
                ? "No se encontraron movimientos con los filtros aplicados." 
                : "Aún no hay historial de movimientos para este centro."
              }
            </p>
            {(searchTerm || filterAction !== "all") && (
              <button 
                onClick={() => { setSearchTerm(""); setFilterAction("all"); }}
                className="clear-filters-btn"
              >
                🗑️ Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
