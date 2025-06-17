import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './InventoryHistoryPage.css';

interface InventoryLog {
  log_id: number;
  center_id: string;
  product_name: string;
  quantity: number;
  action_type: 'add' | 'edit' | 'delete';
  created_at: string;
}

const API_BASE_URL = 'http://localhost:4000/api';

const InventoryHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  useEffect(() => {
    if (!user?.centerId) return;

    console.log('🔎 Usuario logeado:', user);

    fetch(`${API_BASE_URL}/inventory/log/${user.centerId}`)
      .then(res => {
        if (!res.ok) throw new Error('Error al obtener el historial');
        return res.json();
      })
      .then(data => {
        console.log('📥 Logs recibidos:', data); // 👈 Verifica aquí que los datos llegan
        setLogs(data);
      })
      .catch(err => console.error('❌ Error cargando historial:', err));
  }, [user]);

  return (
    <div className="history-container">
      <h2>Historial de Inventario</h2>
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
              <td colSpan={4}>No hay historial disponible.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryHistoryPage;
