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
import { 
  listNotificationsByCenter, 
  createNotification,
  CenterNotification 
} from '@/services/notifications.service';
import NotificationsHistory from '@/components/notification/NotificationsHistory';

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
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingOperationalStatus, setIsUpdatingOperationalStatus] = useState(false);

  const [assignRole, setAssignRole] = useState<AssignRole | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

    // Función para cargar las notificaciones
  const fetchNotifications = useCallback(async () => {
    if (!centerId) return;
    
    setLoadingNotifications(true);
    try {
      const data = await listNotificationsByCenter(centerId);
      setNotifications(data);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [centerId]);

  // Cargar notificaciones cuando el componente se monta
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
  const handleSendTestNotification = async () => {
    if (!centerId || !center?.comunity_charge_id) {
      alert('El centro no tiene un encargado asociado para recibir la notificación.');
      return;
    }
    
    try {
      await createNotification({
        center_id: centerId,
        title: 'Prueba de Notificación',
        message: `Esto es una notificación de prueba para el centro ${center.name}.`,
        destinatary_id: center.comunity_charge_id,
      });
      
      alert('Notificación de prueba enviada con éxito.');
      await fetchNotifications(); // Recargar el historial
    } catch (error: any) {
      alert(`Error al enviar la notificación: ${error?.message}`);
    }
  };

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
              {/* Aquí añadimos las zonas OMZ y la oficina asignada */}
              <div className="info-item">
                <label>Oficina Municipal:</label>
                <span>{"----"}</span> {/* Reemplaza esto por el nombre de la oficina cuando esté disponible */}
              </div>
              <div className="info-item">
                <label>Zona OMZ:</label>
                <span>{"-----"}</span> {/* Reemplaza esto por la zona OMZ cuando esté disponible */}
              </div>
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

        <div className="notifications-section">
          <NotificationsHistory
            notifications={notifications}
            loading={loadingNotifications}
            onRefresh={fetchNotifications}
          />
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
                      </div>
        </div>

        {/* Sección de Historial de Notificaciones */}
        <div className="notifications-section">
        <NotificationsHistory
          notifications={notifications}
          loading={loadingNotifications}
          onRefresh={fetchNotifications}
        />
      </div>

      {/* Botón de prueba (opcional, solo para desarrollo) */}
      {center?.comunity_charge_id && (
        <button 
          onClick={handleSendTestNotification}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Enviar Notificación de Prueba
        </button>
      )}
    </div>
    </div>
  );
};

export default CenterDetailsPage;