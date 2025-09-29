// src/pages/CenterDetailsPage/CenterDetailsPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import OperationalStatusControl from "@/components/center/OperationalStatusControl";
import "./CenterDetailsPage.css";

import type { CenterData, Center } from "@/types/center";
import {
  getOneCenter,
  mapStatusToFrontend,
  updateOperationalStatus,
  OperationalStatusUI,
} from "@/services/centers.service";
import { listCenterInventory } from "@/services/inventory.service";
import { listNotificationsByCenter, createNotification, CenterNotification } from "@/services/notifications.service";

import ResponsibleSection from "./ResponsibleSection";
import AssignResponsibleDialog from "./AssingResponsibleDialog";
import { useActivation } from "@/contexts/ActivationContext";
import { Button } from "@mui/material";
import CenterCatastroDetails from "./CenterCatastroDetails";
import "./CenterCatastroDetails.css";

type Resource = { item_id: string | number; name: string; category: string; quantity: number };
type AssignRole = "trabajador municipal" | "contacto ciudadano";

const getStatusText = (isActive: boolean) => (isActive ? "Activo" : "Inactivo");
const getStatusClass = (isActive: boolean) => (isActive ? "status-active" : "status-inactive");
const getOperationalStatusClass = (status: OperationalStatusUI | undefined) => {
  switch (status) {
    case "Abierto": return "operational-open";
    case "Cerrado Temporalmente": return "operational-closed";
    case "Capacidad Máxima": return "operational-full";
    default: return "operational-unknown";
  }
};

const CenterDetailsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activation } = useActivation();

  const [center, setCenter] = useState<CenterData | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [notifications, setNotifications] = useState<CenterNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingOperationalStatus, setIsUpdatingOperationalStatus] = useState(false);

  const [assignRole, setAssignRole] = useState<AssignRole | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!centerId) return;
    try {
      const notifs = await listNotificationsByCenter(centerId);
      setNotifications(notifs);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  }, [centerId]);

  useEffect(() => {
    if (!centerId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [c, inv] = await Promise.all([
          getOneCenter(centerId),
          listCenterInventory(centerId),
        ]);
        if (!alive) return;
        
        const mapped = {
          ...(c as any),
          operational_status: mapStatusToFrontend((c as any).operational_status),
        } as Center & { public_note?: string; operational_status?: OperationalStatusUI };

        setCenter(mapped as CenterData);
        setResources(inv);
        await fetchNotifications();
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "No se pudieron cargar los detalles del centro.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [centerId, fetchNotifications]);

  const groupedResources = useMemo(() => {
    return resources.reduce((acc, r) => {
      (acc[r.category] ||= []).push(r);
      return acc;
    }, {} as Record<string, Resource[]>);
  }, [resources]);

  const handleOperationalStatusChange = async (
    newStatus: OperationalStatusUI,
    publicNote?: string
  ) => {
    if (!center || !centerId) return;
    setIsUpdatingOperationalStatus(true);
    try {
      await updateOperationalStatus(centerId, newStatus, publicNote);
      setCenter((prev) =>
        prev
          ? {
              ...prev,
              operational_status: (newStatus === "Abierto"
                ? "abierto"
                : newStatus === "Cerrado Temporalmente"
                ? "cerrado_temporalmente"
                : newStatus === "Capacidad Máxima"
                ? "capacidad_maxima"
                : undefined) as Center["operational_status"],
              public_note: newStatus === "Cerrado Temporalmente" ? publicNote : undefined,
            }
          : prev
      );
      alert(`Estado operativo actualizado a "${newStatus}" exitosamente`);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "No se pudo actualizar el estado operativo");
    } finally {
      setIsUpdatingOperationalStatus(false);
    }
  };
  
  const handleSendTestNotification = async () => {
    if (!centerId || !center?.comunity_charge_id) {
      alert("El centro no tiene un encargado asociado para recibir la notificación.");
      return;
    }
    try {
      await createNotification({
        center_id: centerId,
        title: "Prueba de Notificación",
        message: `Esto es una notificación de prueba para el centro ${center.name}.`,
        destinatary_id: center.comunity_charge_id,
      });
      alert("Notificación de prueba enviada con éxito.");
      await fetchNotifications();
    } catch (e: any) {
      alert(`Error al enviar la notificación: ${e?.message}`);
    }
  };

  const openAssign = (role: AssignRole) => { setAssignRole(role); setAssignOpen(true); };
  const closeAssign = () => setAssignOpen(false);

  if (loading) return <div className="center-details-container loading">Cargando detalles del centro...</div>;
  if (error || !center) {
    return (
      <div className="center-details-container">
        <div className="error-message">{error || "Centro no encontrado"}</div>
        <button onClick={() => navigate(-1)} className="back-button">Volver</button>
      </div>
    );
  }

  return (
    <div className="center-details-container">
      <div className="center-details-header">
        <button onClick={() => navigate(-1)} className="back-button">← Volver</button>
        <h1>Detalles del Centro</h1>
        <Link to={`/admin/centers/${centerId}/edit`} className="edit-button">Editar Detalles</Link>
      </div>

      <div className="center-details-content">
        <div className="center-info-section">
          <div className="center-basic-info">
            <h2>{center.name}</h2>
            <div className="info-grid">
              <div className="info-item"><label>Dirección:</label><span>{center.address ?? "—"}</span></div>
              <div className="info-item">
                <label>Tipo:</label>
                <span className={`type-badge ${String(center.type).toLowerCase()}`}>{center.type}</span>
              </div>
              <div className="info-item"><label>Capacidad:</label><span>{center.capacity ?? "—"} personas</span></div>
              <div className="info-item">
                <label>Estado Actual:</label>
                <span className={`status-badge ${getStatusClass(center.is_active)}`}>{getStatusText(center.is_active)}</span>
              </div>
              {typeof center.fullnessPercentage === "number" && (
                <div className="info-item">
                  <label>Nivel de Abastecimiento:</label>
                  <span className="fullness-percentage">{center.fullnessPercentage.toFixed(1)}%</span>
                </div>
              )}
              <div className="info-item">
                <label>Estado Operativo:</label>
                <span className={`operational-status-badge ${getOperationalStatusClass(mapStatusToFrontend(center.operational_status))}`}>
                  {mapStatusToFrontend(center.operational_status) ?? "—"}
                </span>
              </div>
              {mapStatusToFrontend(center.operational_status) === "Cerrado Temporalmente" && center.public_note && (
                <div className="info-item">
                  <label>Información adicional:</label>
                  <div className="public-note-display">{center.public_note}</div>
                </div>
              )}
            </div>

            {(user?.role_name === "Encargado" || user?.role_name === "Trabajador Municipal" || user?.role_name === "Contacto Ciudadano") &&
              center.operational_status && (
                <OperationalStatusControl
                  centerId={centerId!}
                  currentStatus={mapStatusToFrontend(center.operational_status) ?? "Abierto"}
                  currentNote={center.public_note ?? undefined}
                  onStatusChange={handleOperationalStatusChange}
                  isUpdating={isUpdatingOperationalStatus}
                />
              )}
          </div>
        </div>

        {/* Catastro (mantiene tu componente y estilos) */}
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore - backend trae props del catastro fuera de Center UI */}
        <CenterCatastroDetails centerData={center as any} />

        <div className="resources-section">
          <h3>Recursos Disponibles</h3>
          {Object.keys(groupedResources).length === 0 ? (
            <div className="no-resources"><p>No hay recursos registrados en este centro.</p></div>
          ) : (
            <div className="resources-grid">
              {Object.entries(groupedResources).map(([category, items]) => (
                <div key={category} className="resource-category">
                  <h4>{category}</h4>
                  <div className="resource-items">
                    {items.map((item) => (
                      <div key={item.item_id} className="resource-item">
                        <span className="resource-name">{item.name}</span>
                        <span className="resource-quantity">{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="responsible-section">
          <h3>Responsable</h3>
          <div className="responsible-info">
            <ResponsibleSection
              municipalId={center.municipal_manager_id}
              comunityId={center.comunity_charge_id}
              onAssignMunicipal={() => openAssign("trabajador municipal")}
              onAssignCommunity={() => openAssign("contacto ciudadano")}
            />
            <AssignResponsibleDialog
              open={assignOpen}
              onClose={closeAssign}
              centerId={centerId!}
              role={assignRole}
              onSuccess={async () => {
                closeAssign();
                try {
                  const c = await getOneCenter(centerId!);
                  setCenter({
                    ...(c as any),
                    operational_status: mapStatusToFrontend((c as any).operational_status),
                  });
                } catch {}
              }}
            />
            {activation && (
              <Button variant="contained" onClick={() => navigate(`/center/${center.center_id}/fibe`)}>
                Formulario FIBE
              </Button>
            )}
            
            {center?.comunity_charge_id && (
              <Button variant="outlined" onClick={handleSendTestNotification} style={{ marginTop: '20px' }}>
                Enviar Notificación de Prueba
              </Button>
            )}

          </div>
        </div>

        {/* Sección de Historial de Notificaciones */}
        <div className="resources-section">
          <h3>Historial de Notificaciones</h3>
          {notifications.length === 0 ? (
            <div className="no-resources"><p>No hay notificaciones enviadas para este centro.</p></div>
          ) : (
            <div className="resources-grid">
              {notifications.map(notif => (
                <div key={notif.notification_id} className="resource-category">
                  <h4>{notif.title}</h4>
                  <div className="resource-items">
                    <div className="resource-item">
                      <span className="resource-name">{notif.message}</span>
                    </div>
                    <div className="resource-item">
                      <span className="resource-name">Fecha:</span>
                      <span className="resource-quantity">{new Date(notif.event_at).toLocaleString()}</span>
                    </div>
                    <div className="resource-item">
                      <span className="resource-name">Destinatario:</span>
                      <span className="resource-quantity">{notif.destinatary_name ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CenterDetailsPage;