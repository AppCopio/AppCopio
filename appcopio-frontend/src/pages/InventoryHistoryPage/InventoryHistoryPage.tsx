import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchWithAbort } from '../../services/api';
import './InventoryHistoryPage.css';

// Interfaz para la estructura de un registro de inventario
interface InventoryLog {
  log_id: number;
  center_id: string;
  product_name: string;
  quantity: number;
  action_type: 'add' | 'edit' | 'delete';
  created_at: string;
}

const InventoryHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Efecto para obtener el historial de inventario del centro del usuario logeado.
  // Se refactoriza para usar el patrón AbortController y manejar el ciclo de vida de la petición.
  useEffect(() => {
    // Si no hay un usuario o el usuario no tiene un centerId, no se hace nada.
    if (!user?.centerId) {
      setIsLoading(false);
      setLogs([]);
      return;
    }

    const controller = new AbortController();

    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWithAbort<InventoryLog[]>(
          `${apiUrl}/inventory/log/${user.centerId}`,
          controller.signal
        );
        setLogs(data);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error cargando el historial de inventario:', err);
          setError('No se pudo cargar el historial. Por favor, intente de nuevo más tarde.');
        }
      } finally {
        // Asegurarse de que el estado de carga se desactive solo si la petición no fue abortada.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchHistory();

    // La función de limpieza cancela la petición si el componente se desmonta
    // o si el objeto 'user' cambia antes de que la petición se complete.
    return () => {
      controller.abort();
    };
  }, [user, apiUrl]); // Se depende del objeto 'user' y de la 'apiUrl'.

  if (isLoading) {
    return <div className="history-container">Cargando historial...</div>;
  }

  if (error) {
    return <div className="history-container error-message">{error}</div>;
  }

  return (
    <div className="history-container">
      <h2>Historial de Movimientos de Inventario</h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Producto</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {logs.length > 0 ? (
            logs.map(log => (
              <tr key={log.log_id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.action_type}</td>
                <td>{log.product_name}</td>
                <td>{log.quantity}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No hay historial de movimientos disponible para este centro.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryHistoryPage;