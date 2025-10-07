// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import "./CenterManagementPage.css";

import { Center } from "@/types/center";
import { listCenters, updateCenterStatus, deleteCenter } from "@/services/centers.service";
import { getOmzZoneForCenter } from "@/services/zones.service";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { listPeopleByCenter } from "@/services/residents.service";
import { listCenterInventory } from "@/services/inventory.service";
import { listUpdates } from "@/services/updates.service";


const StatusSwitch: React.FC<{
  center: Center;
  onToggle: (id: string) => void;
  disabled: boolean;
}> = ({ center, onToggle, disabled }) => {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={center.is_active}
        onChange={() => onToggle(center.center_id)}
        disabled={disabled}
      />
      <span className="slider round"></span>
    </label>
  );
};

const CenterManagementPage: React.FC = () => {
  const { user, loadingAuth: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // Estados del componente
  const [centers, setCenters] = useState<Center[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  const [omzZones, setOmzZones] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [locationFilter, setLocationFilter] = useState<string>("");

  // Eliminación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<string | null>(null);

  const fetchCenters = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);
    try {
      const data = await listCenters();
      setCenters(data);

      // Para cada centro, obtener la zona OMZ
      const zones: Record<string, string | null> = {};
      await Promise.all(
        data.map(async (center: Center) => {
          const zone = await getOmzZoneForCenter(center.center_id);
          zones[center.center_id] = zone;
        })
      );
      setOmzZones(zones);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "No se pudieron cargar los centros.");
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  useEffect(() => {
    let filtered = centers;

    if (statusFilter !== "todos") {
      filtered = filtered.filter((center) => center.is_active === (statusFilter === "activo"));
    }
    if (typeFilter !== "todos") {
      filtered = filtered.filter((center) => center.type === (typeFilter as Center["type"]));
    }
    if (locationFilter.trim() !== "") {
      const q = locationFilter.toLowerCase();
      filtered = filtered.filter((center) => {
        const addr = (center.address ?? "").toString().toLowerCase();
        const name = (center.name ?? "").toLowerCase();
        return addr.includes(q) || name.includes(q);
      });
    }

    setFilteredCenters(filtered);
  }, [centers, statusFilter, typeFilter, locationFilter]);

  const handleToggleActive = useCallback(
    async (id: string) => {
      const snapshot = [...centers];
      const target = centers.find((c) => c.center_id === id);
      if (!target) return;

      const newStatus = !target.is_active;
      // Optimista
      setCenters((prev) => prev.map((c) => (c.center_id === id ? { ...c, is_active: newStatus } : c)));

      try {
  await updateCenterStatus(id, newStatus, user?.user_id ?? 0);
      } catch (err: any) {
        // Revertir si falla
        setCenters(snapshot);
        window.alert(err?.response?.data?.message || err?.message || "No se pudo actualizar el estado del centro.");
      }
    },
    [centers, user]
  );

  // Eliminación
  const handleDeleteClick = (centerId: string) => {
    setCenterToDelete(centerId);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!centerToDelete) return;
    const snapshot = [...centers];

    // Optimista
    setCenters((prev) => prev.filter((c) => c.center_id !== centerToDelete));
    setIsModalOpen(false);
    setCenterToDelete(null);

    try {
      await deleteCenter(centerToDelete);
    } catch (err: any) {
      // Revertir si falla
      setCenters(snapshot);
      window.alert(err?.response?.data?.message || err?.message || "No se pudo eliminar el centro.");
    }
  }, [centerToDelete, centers]);

  const handleCancelDelete = () => {
    setIsModalOpen(false);
    setCenterToDelete(null);
  };

  const handleShowInfo = (id: string) => {
    navigate(`/center/${id}/details`);
  };

  const clearFilters = () => {
    setStatusFilter("todos");
    setTypeFilter("todos");
    setLocationFilter("");
  };
  const handleExportCenter = async (center: Center) => {
      // 1. Datos del centro
      const centerData = [
        {
          ID: center.center_id,
          Nombre: center.name,
          Dirección: center.address,
          Tipo: center.type,
          Activo: center.is_active ? "Sí" : "No",
          Porcentaje: typeof center.fullnessPercentage === "number"
            ? `${center.fullnessPercentage.toFixed(1)}%`
            : "N/A"
        }
      ];
  
      const wb = XLSX.utils.book_new();
      const centerSheet = XLSX.utils.json_to_sheet(centerData);
      XLSX.utils.book_append_sheet(wb, centerSheet, "Centro");
  
      // 2. Personas del centro
      try {
        const people = await listPeopleByCenter(center.center_id);
        console.log("Personas obtenidas:", people);
  
        const peopleFormatted = people.map((p) => ({
          RUT: p.rut ?? "",
          Nombre: p.nombre ?? "",
          Edad: p.edad ?? "",
          Género: p.genero ?? "",
          "Fecha de Ingreso": p.fecha_ingreso ?? "",
          "Fecha de Salida": p.fecha_salida ?? "",
          "Primer Apellido": p.primer_apellido ?? "",
          "Segundo Apellido": p.segundo_apellido ?? "",
          Nacionalidad: p.nacionalidad ?? "",
          Estudia: p.estudia ? "Sí" : "No",
          Trabaja: p.trabaja ? "Sí" : "No",
          "Perdió Trabajo": p.perdida_trabajo ? "Sí" : "No",
          Rubro: p.rubro ?? "",
          Discapacidad: p.discapacidad ? "Sí" : "No",
          Dependencia: p.dependencia ? "Sí" : "No",
        }));
  
        const peopleSheet =
          peopleFormatted.length > 0
            ? XLSX.utils.json_to_sheet(peopleFormatted)
            : XLSX.utils.json_to_sheet([
                {
                  RUT: "",
                  Nombre: "",
                  Edad: "",
                  Género: "",
                  "Fecha de Ingreso": "",
                  "Fecha de Salida": "",
                  "Primer Apellido": "",
                  "Segundo Apellido": "",
                  Nacionalidad: "",
                  Estudia: "",
                  Trabaja: "",
                  "Perdió Trabajo": "",
                  Rubro: "",
                  Discapacidad: "",
                  Dependencia: "",
                },
              ]); // hoja vacía con columnas
  
        XLSX.utils.book_append_sheet(wb, peopleSheet, "Personas");
      } catch (error) {
        console.error("Error al cargar personas del centro", error);
        window.alert("No se pudieron incluir las personas del centro en el Excel.");
      }
  
      // 3. Inventario
      const inventory = await listCenterInventory(center.center_id);
      const inventorySheetData = inventory.map((item) => ({
        Categoría: item.category || "Sin categoría",
        Nombre: item.name,
        Cantidad: item.quantity,
        Unidad: item.unit || "-",
        "Última Actualización": new Date(item.updated_at).toLocaleString(),
        "Actualizado Por": item.updated_by_user || "Sistema",
      }));
      const inventorySheet = XLSX.utils.json_to_sheet(inventorySheetData);
      XLSX.utils.book_append_sheet(wb, inventorySheet, "Inventario");
  
      // 2.7) Actualizaciones del centro (todas las categorías)
      try {
        // helper para traer TODO sin depender de la paginación de la vista
        const fetchAllUpdatesForCenter = async (centerId: string) => {
          const STATUSES: Array<"pending"|"approved"|"rejected"|"canceled"> = [
            "pending","approved","rejected","canceled"
          ];
          const all: any[] = [];
          // si tu API soporta status=all, cambia a una sola llamada con limit alto
          const LIMIT = 500; // sube si esperas más
          for (const status of STATUSES) {
            let page = 1;
            // bucle de páginas por estado
            // tu listUpdates acepta: { status, page, limit, centerId, signal? }
            // si acepta centerId como string | undefined, pásalo como String(center.center_id)
            // si tu backend no necesita status para "todas", puedes omitir el for y usar status: undefined
            // mantengo por compatibilidad con lo que mostraste.
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const resp = await listUpdates({
                status,
                page,
                limit: LIMIT,
                centerId: String(center.center_id)
              } as any);
              const items = resp?.requests ?? [];
              all.push(...items);
              if (items.length < LIMIT) break; // última página de ese status
              page++;
            }
          }
          // opcional: ordenar por fecha descendente
          all.sort((a,b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
          return all;
        };
        const updates = await fetchAllUpdatesForCenter(String(center.center_id));
  
        const updatesSheetData = (updates.length ? updates : [{
          registered_at: "",
          center_name: "",
          requested_by_name: "",
          description: "",
          urgency: "",
          status: "",
          assigned_to_name: "",
          resolution_comment: ""
        }]).map((u: any) => ({
          "Fecha": u.registered_at ? new Date(u.registered_at).toLocaleString() : "",
          "Centro": u.center_name ?? "",
          "Solicitado por": u.requested_by_name ?? "",
          "Descripción": u.description ?? "",
          "Urgencia": u.urgency ?? "",
          "Estado": u.status ?? "",
          "Asignado a": u.assigned_to_name ?? "Sin asignar",
          "Comentario de resolución": u.resolution_comment ?? ""
        }));
  
        const updatesSheet = XLSX.utils.json_to_sheet(updatesSheetData);
  
        // (opcional) ajustar ancho de columnas
        const colWidths = [
          { wch: 20 }, // Fecha
          { wch: 28 }, // Centro
          { wch: 24 }, // Solicitado por
          { wch: 60 }, // Descripción
          { wch: 10 }, // Urgencia
          { wch: 12 }, // Estado
          { wch: 24 }, // Asignado a
          { wch: 40 }, // Comentario
        ];
        (updatesSheet as any)["!cols"] = colWidths;
  
        XLSX.utils.book_append_sheet(wb, updatesSheet, "Actualizaciones");
      } catch (e) {
        console.error("Error al cargar actualizaciones del centro", e);
        const updatesSheet = XLSX.utils.json_to_sheet([{
          "Fecha": "", "Centro": "", "Solicitado por": "", "Descripción": "",
          "Urgencia": "", "Estado": "", "Asignado a": "", "Comentario de resolución": ""
        }]);
        XLSX.utils.book_append_sheet(wb, updatesSheet, "Actualizaciones");
      }
      
  
      // 4. Hojas vacías
      const emptySheet = XLSX.utils.aoa_to_sheet([[]]);
      XLSX.utils.book_append_sheet(wb, emptySheet, "Encargados");
      XLSX.utils.book_append_sheet(wb, emptySheet, "Donaciones");
  
      // 5. Exportar
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      saveAs(blob, `Centro_${center.center_id}.xlsx`);
    };

  if (isLoading || isAuthLoading) {
    return <div className="center-management-container">Cargando...</div>;
  }

  return (
    <div className="center-management-container">
      <div className="centers-header">
        <h1 className="ds-titlePage">Gestión de Centros y Albergues</h1>
        {(user?.es_apoyo_admin || (user as any)?.role_id === 1) === true && (
          <Link
            to={!isAuthLoading ? "/admin/centers/new" : "#"}
            className={`add-center-btn ${isAuthLoading ? "disabled-link" : ""}`}
          >
            + Registrar Nuevo Centro
          </Link>
        )}
      </div>

      <p>Aquí puedes ver y administrar el estado de los centros del catastro municipal.</p>

      {error && <div className="error-box" style={{ margin: "8px 0 16px" }}>{error}</div>}

      <div className="filters-section">
        <h3>Filtros</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="status-filter">Estado:</label>
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="type-filter">Tipo:</label>
            <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              <option value="Acopio">Acopio</option>
              <option value="Albergue">Albergue</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="location-filter">Ubicación:</label>
            <input
              id="location-filter"
              type="text"
              placeholder="Buscar por dirección o nombre..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>
          <div className="filter-actions">
            <button onClick={clearFilters} className="clear-filters-btn">
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="results-info">
        <p>
          Mostrando {filteredCenters.length} de {centers.length} centros
        </p>
      </div>

      <ul className="center-list">
        {filteredCenters.length === 0 ? (
          <li className="no-results">
            <p>No se encontraron centros que coincidan con los filtros aplicados.</p>
          </li>
        ) : (
          filteredCenters.map((center) => (
            <li key={center.center_id} className={`center-item ${center.is_active ? "item-active" : "item-inactive"}`}>
              <div className="center-info">
                <h3>{center.name}</h3>
                <p>
                  {center.address} ({center.type})
                </p>
                {typeof center.fullnessPercentage === "number" && (
                  <p className="fullness-info">Abastecimiento: {center.fullnessPercentage.toFixed(1)}%</p>
                )}
                {/* Mostrar la zona OMZ */}
                <span className="zone-info">
                  ZONA OMZ: {omzZones[center.center_id] ? omzZones[center.center_id] : "No asignada"}
                </span>
              </div>
              <div className="center-actions">
                {user?.es_apoyo_admin === true && (
                  <button
                    onClick={() => handleExportCenter(center)}
                    className="inventory-btn"
                    title="Descargar Excel de este centro"
                    disabled={isAuthLoading}
                  >
                    Exportar Excel
                  </button>
                )}
                <Link
                  to={`/center/${center.center_id}/inventory`}
                  className={`inventory-btn ${isAuthLoading ? "disabled-link" : ""}`}
                >
                  Gestionar
                </Link>
                <button className="info-button" onClick={() => handleShowInfo(center.center_id)} disabled={isAuthLoading}>
                  Ver Detalles
                </button>

                <StatusSwitch center={center} onToggle={handleToggleActive} disabled={isAuthLoading} />

                <Link
                  to={`/admin/centers/${center.center_id}/edit`}
                  className={`edit-btn ${isAuthLoading ? "disabled-link" : ""}`}
                >
                  Editar
                </Link>

                {user?.es_apoyo_admin === true && (
                  <button
                    onClick={() => handleDeleteClick(center.center_id)}
                    className="delete-btn"
                    disabled={isAuthLoading}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro de que deseas eliminar el centro con ID: <strong>{centerToDelete}</strong>? Esta acción es
              irreversible y eliminará todos los datos relacionados.
            </p>
            <div className="modal-actions">
              <button onClick={handleConfirmDelete} className="confirm-btn" disabled={isAuthLoading}>
                Sí, eliminar
              </button>
              <button onClick={handleCancelDelete} className="cancel-btn" disabled={isAuthLoading}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterManagementPage;
