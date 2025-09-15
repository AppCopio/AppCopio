import * as React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getOne as getUser } from "@/services/users.service";
import { listCenters } from "@/services/centers.service";
import type { Center } from "@/types/center";
import { msgFromError } from "@/lib/errors";
import "./MisCentrosPage.css";

// Estado visible del centro en tarjeta
const getCenterStatus = (center: Center): string => {
  if (!center.is_active) return "Inactivo";
  if (center.operational_status === "cerrado temporalmente") return "Cerrado";
  return "Activo";
};

export default function MisCentrosPage() {
  const { user } = useAuth();

  const [assignedCenters, setAssignedCenters] = React.useState<Center[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.user_id) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1) Usuario con sus centros asignados
        const fullUser = await getUser(user.user_id, controller.signal);
        const assignedIds = new Set((fullUser.assignedCenters || []).map(String));

        if (assignedIds.size === 0) {
          setAssignedCenters([]);
          return;
        }

        // 2) Todos los centros y filtramos por los asignados
        const allCenters = await listCenters(controller.signal);
        const userCenters = (allCenters || []).filter((c) =>
          assignedIds.has(String(c.center_id))
        );

        setAssignedCenters(userCenters);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error("Error al cargar detalles de los centros:", e);
        setError(msgFromError(e) || "No se pudieron cargar los datos de los centros asignados.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [user?.user_id]);

  if (isLoading) {
    return <div className="mis-centros-container">Cargando tus centros asignados...</div>;
  }

  if (error) {
    return <div className="mis-centros-container error-message">{error}</div>;
  }

  return (
    <div className="mis-centros-container">
      <h1>Mis Centros Asignados</h1>
      <p>Selecciona un centro para ver sus detalles y gestionar su inventario.</p>

      {assignedCenters.length === 0 ? (
        <p className="no-centers-message">
          No tienes ningún centro asignado actualmente. Por favor, contacta a un administrador.
        </p>
      ) : (
        <ul className="mis-centros-list">
          {assignedCenters.map((center) => {
            const status = getCenterStatus(center);
            return (
              <li key={String(center.center_id)} className="centro-card">
                <div className="card-header">
                  <h3>{center.name}</h3>
                  <span className={`status-pill ${status === "Activo" ? "active" : "inactive"}`}>
                    {status}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Dirección:</strong> {center.address}</p>
                  <p><strong>Tipo:</strong> {center.type}</p>
                </div>
                <div className="card-actions">
                  <Link to={`/center/${center.center_id}/inventory`} className="action-button manage-btn">
                    Gestionar Inventario
                  </Link>
                  <Link to={`/center/${center.center_id}/details`} className="action-button details-btn">
                    Ver Detalles
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
