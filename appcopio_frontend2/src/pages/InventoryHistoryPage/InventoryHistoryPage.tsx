import * as React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./InventoryHistoryPage.css";

import { listInventoryLogs } from "@/services/inventory.service";
import type { InventoryLog } from "@/types/inventory";

const formatActionType = (action: InventoryLog["action_type"]) => {
  switch (action) {
    case "ADD":
      return <span className="action-add">Añadido</span>;
    case "ADJUST":
      return <span className="action-adjust">Ajustado</span>;
    case "SUB":
      return <span className="action-sub">Eliminado</span>;
    default:
      return action;
  }
};

export default function InventoryHistoryPage() {
  const { centerId } = useParams<{ centerId: string }>();

  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        const data = await listInventoryLogs(centerId, controller.signal);
        setLogs(data || []);
      } catch (e: any) {
        if (!controller.signal.aborted) {
          console.error("Error cargando el historial de inventario:", e);
          setError("No se pudo cargar el historial. Por favor, intente de nuevo más tarde.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [centerId]);

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
            logs.map((log) => (
              <tr key={log.log_id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.user_name || "Sistema"}</td>
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
}
