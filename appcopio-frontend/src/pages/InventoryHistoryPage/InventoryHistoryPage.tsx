import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // Se importa useParams
import { fetchWithAbort } from '../../services/api';
import './InventoryHistoryPage.css';

// MODIFICADO: La interfaz ahora refleja la respuesta enriquecida de la API
interface InventoryLog {
  log_id: number;
  product_name: string;
  quantity: number;
  action_type: 'ADD' | 'ADJUST' | 'SUB';
  created_at: string;
  user_name: string | null; // El usuario que realizó la acción
  reason: string | null; // El motivo de un ajuste
  notes: string | null; // Notas adicionales
}

// Helper para traducir los tipos de acción a un formato legible
const formatActionType = (action: 'ADD' | 'ADJUST' | 'SUB') => {
  switch (action) {
    case 'ADD': return <span className="action-add">Añadido</span>;
    case 'ADJUST': return <span className="action-adjust">Ajustado</span>;
    case 'SUB': return <span className="action-sub">Eliminado</span>;
    default: return action;
  }
};

const InventoryHistoryPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>(); // Se obtiene el centerId de la URL
  const apiUrl = import.meta.env.VITE_API_URL;

  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // MODIFICADO: La lógica ahora depende del centerId de la URL
    if (!centerId) {
      setIsLoading(false);
      setError("No se ha especificado un centro.");
      return;
    }

    const controller = new AbortController();

    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWithAbort<InventoryLog[]>(
          `${apiUrl}/inventory/log/${centerId}`, // La URL ahora usa el centerId de los params
          controller.signal
        );
        setLogs(data || []);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error cargando el historial de inventario:', err);
          setError('No se pudo cargar el historial. Por favor, intente de nuevo más tarde.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      controller.abort();
    };
  }, [centerId, apiUrl]); // La dependencia ahora es centerId

  if (isLoading) {
    return <div className="history-container">Cargando historial...</div>;
  }

  if (error) {
    return <div className="history-container error-message">{error}</div>;
  }

  return (
    <div className="history-container">
      <h2>Historial de Movimientos del Centro {centerId}</h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Motivo / Notas</th>
          </tr>
        </thead>
        <tbody>
          {logs.length > 0 ? (
            logs.map(log => (
              <tr key={log.log_id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.user_name || 'Sistema'}</td>
                <td>{formatActionType(log.action_type)}</td>
                <td>{log.product_name}</td>
                <td>{log.quantity}</td>
                <td>
                  {log.reason && <strong>{log.reason}</strong>}
                  {log.reason && log.notes && <br />}
                  {log.notes}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>No hay historial de movimientos disponible para este centro.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryHistoryPage;