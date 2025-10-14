// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import "./CenterManagementPage.css";

import { Center } from "@/types/center";
import { listCenters, updateCenterStatus, deleteCenter } from "@/services/centers.service";
import { getOmzZoneForCenter } from "@/services/zones.service";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { listPeopleByCenter } from "@/services/residents.service";
import { listCenterInventory } from "@/services/inventory.service";
import { listUpdates } from "@/services/updates.service";
import { listAssignedUsersToCenter } from "@/services/centers.service";
import type { User } from "@/types/user"; // Usaremos este tipo

// Formatea RUT y lo fuerza a texto para Excel
const formatRut = (raw: any, { withDots = true, forceExcelText = false } = {}) => {
  if (raw == null) return "";
  const s = String(raw).replace(/[.\-\s\u2010-\u2015\u2212]/g, "");
  if (s.length < 2) return String(raw);

  const cuerpo = s.slice(0, -1);
  const dv = s.slice(-1).toUpperCase();
  // Uso de expresión regular para añadir puntos (separadores de miles)
  const cuerpoFmt = withDots ? cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : cuerpo;
  const rutFmt = `${cuerpoFmt}-${dv}`;

  // Si se fuerza el texto para Excel (usando ="" para evitar que Excel lo interprete como número), 
  // devolvemos la cadena envuelta en esa fórmula.
  return forceExcelText ? `="${rutFmt}"` : rutFmt;
};

// Normaliza a "YYYY-MM-DD" aunque venga "2025-10-07 12:00:00"
const toISODate = (s?: string | null) => {
  if (!s) return "";
  const iso = s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

// Busca la primera fecha válida entre alias posibles
const pickDateISO = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    const iso = toISODate(v);
    if (iso) return iso;
  }
  return "";
};

// Convierte un string a UTF-16LE con BOM (Excel-friendly)
const utf16leArrayBuffer = (text: string) => {
  const bom = new Uint8Array([0xff, 0xfe]); // BOM
  const buf = new Uint16Array(text.length);
  for (let i = 0; i < text.length; i++) buf[i] = text.charCodeAt(i);
  const bytes = new Uint8Array(buf.buffer);
  // Concatenar BOM + bytes
  const out = new Uint8Array(bom.length + bytes.length);
  out.set(bom, 0);
  out.set(bytes, bom.length);
  return out.buffer; // ArrayBuffer listo para zip.file
};

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
    // Helper CSV con ;, comillas, CRLF y BOM para Excel
    const toCSV = (rows: any[], headers?: string[]) => {
      const csvCore = Papa.unparse(
        headers ? { fields: headers, data: rows.map(r => headers.map(h => r[h])) } : rows,
        { delimiter: ";", quotes: true, newline: "\r\n" }
      );
      const csv = "sep=;\r\n" + csvCore;
      return "\uFEFF" + csv; // BOM UTF-8
    };

    // 1) Centro
    const centerHeaders = ["ID","Nombre","Dirección","Tipo","Activo","Abastecimiento","Zona_OMZ"];
    const centerRows = [{
      ID: center.center_id,
      Nombre: center.name ?? "",
      Dirección: center.address ?? "",
      Tipo: center.type ?? "",
      Activo: center.is_active ? "Sí" : "No",
      Abastecimiento: typeof center.fullnessPercentage === "number"
        ? `${center.fullnessPercentage.toFixed(1)}%`
        : "N/A",
      Zona_OMZ: omzZones[center.center_id] ?? "No asignada",    }];

    // 2) Personas
    let peopleRows: any[] = [];
    const peopleHeaders = [
      "RUT","Nombre","Edad","Género","Fecha_Ingreso","Fecha_Salida",
      "Primer_Apellido","Segundo_Apellido","Nacionalidad",
      "Estudia","Trabaja","Perdio_Trabajo","Rubro","Discapacidad","Dependencia"
    ];
    try {
      const people = await listPeopleByCenter(center.center_id);
      peopleRows = (people ?? []).map((p: any) => ({
        RUT: formatRut(p.rut, { withDots: true, forceExcelText: true }),
        Nombre: p.nombre ?? "",
        Edad: p.edad ?? "",
        Género: p.genero ?? "",
        Fecha_Ingreso: pickDateISO(p, ["fecha_ingreso","fechaIngreso","entry_date","entryDate","created_at","createdAt"]),
        Fecha_Salida : pickDateISO(p, ["fecha_salida","fechaSalida","departure_date","departureDate","egreso","salida"]),
        Primer_Apellido: p.primer_apellido ?? "",
        Segundo_Apellido: p.segundo_apellido ?? "",
        Nacionalidad: p.nacionalidad ?? "",
        Estudia: p.estudia ? "Sí" : "No",
        Trabaja: p.trabaja ? "Sí" : "No",
        Perdio_Trabajo: p.perdida_trabajo ? "Sí" : "No",
        Rubro: p.rubro ?? "",
        Discapacidad: p.discapacidad ? "Sí" : "No",
        Dependencia: p.dependencia ? "Sí" : "No",
      }));
    } catch (e) {
      console.error("Personas:", e);
      window.alert("No se pudieron incluir las personas del centro.");
    }
    // 3) Inventario
    let inventoryRows: any[] = [];
    const inventoryHeaders = ["Categoria","Nombre","Cantidad","Unidad","Ultima_Actualizacion","Actualizado_Por"];
    try {
      const inventory = await listCenterInventory(center.center_id);
      inventoryRows = (inventory ?? []).map((item: any) => ({
        Categoria: item.category || "Sin categoría",
        Nombre: item.name,
        Cantidad: item.quantity,
        Unidad: item.unit || "-",
        Ultima_Actualizacion: item.updated_at ? new Date(item.updated_at).toLocaleString("es-CL") : "",
        Actualizado_Por: item.updated_by_user || "Sistema",
      }));
    } catch (e) {
      console.error("Inventario:", e);
    }

    // 4) Actualizaciones
    let updatesRows: any[] = [];
    const updatesHeaders = ["Fecha","Centro","Solicitado_por","Descripcion","Urgencia","Estado","Asignado_a","Comentario_resolucion"];
    try {
      const fetchAllUpdatesForCenter = async (centerId: string) => {
        const STATUSES: Array<"pending"|"approved"|"rejected"|"canceled"> = ["pending","approved","rejected","canceled"];
        const LIMIT = 500;
        const all: any[] = [];
        for (const status of STATUSES) {
          let page = 1;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const resp = await listUpdates({ status, page, limit: LIMIT, centerId: String(centerId) } as any);
            const items = resp?.requests ?? [];
            all.push(...items);
            if (items.length < LIMIT) break;
            page++;
          }
        }
        all.sort((a,b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
        return all;
      };
      const updates = await fetchAllUpdatesForCenter(String(center.center_id));
      updatesRows = (updates ?? []).map((u: any) => ({
        Fecha: u.registered_at ? new Date(u.registered_at).toLocaleString("es-CL") : "",
        Centro: u.center_name ?? "",
        Solicitado_por: u.requested_by_name ?? "",
        Descripcion: u.description ?? "",
        Urgencia: u.urgency ?? "",
        Estado: u.status ?? "",
        Asignado_a: u.assigned_to_name ?? "Sin asignar",
        Comentario_resolucion: u.resolution_comment ?? ""
      }));
    } catch (e) {
      console.error("Actualizaciones:", e);
    }
    // 5) Encargados / Usuarios (poblamos la sección de encargados)
    let encargadosRows: any[] = [];
    const encargadosHeaders = ["Nombre", "RUT", "Telefono" ,"Email", "Rol"];
    
    // La sección 'usuarios' se mantiene vacía, ya que 'encargados' es más específico.
    try {
        // USAMOS LA NUEVA FUNCIÓN DEL FRONTEND
        const assignedUsers = await listAssignedUsersToCenter(center.center_id);
        
        encargadosRows = (assignedUsers ?? []).map((u: any) => ({
            Nombre: u.nombre ?? "",
            RUT: formatRut(u.rut, { withDots: true, forceExcelText: true }),
            // Nota: Aquí no tenemos el teléfono directamente en el objeto User completo, 
            // asumiremos que el backend lo incluye. Si no lo incluye, será null.
            Telefono: u.celular ?? "", 
            Email: u.email ?? "",
            Rol: u.role_name ?? "Sin Rol",
        }));

    } catch (e) {
        console.error("Encargados/Usuarios:", e);
        window.alert("No se pudieron incluir los usuarios/encargados del centro.");
    }
    //const usuariosHeaders = ["Fecha","Tipo","Detalle","Cantidad","Unidad","Origen"];
    //const usuariosRows: any[] = [];

    // Archivos que vamos a generar
    const files: Array<{name: string, csv: string}> = [
      { name: `Centro_${center.center_id}__CentroInfo.csv`,          csv: toCSV(centerRows,  centerHeaders) },
      { name: `Centro_${center.center_id}__Personas.csv`,        csv: toCSV(peopleRows,  peopleHeaders) },
      { name: `Centro_${center.center_id}__Inventario.csv`,      csv: toCSV(inventoryRows, inventoryHeaders) },
      { name: `Centro_${center.center_id}__Actualizaciones.csv`, csv: toCSV(updatesRows, updatesHeaders) },
      { name: `Centro_${center.center_id}__Encargados.csv`,      csv: toCSV(encargadosRows, encargadosHeaders) },
     // { name: `Centro_${center.center_id}__Usuarios.csv`,      csv: toCSV(usuariosRows, usuariosHeaders) },
    ];

    // A) Guardar dentro de una carpeta elegida (Chromium)
    const saveToDirectory = async () => {
      if (typeof (window as any).showDirectoryPicker !== "function") {
        throw new Error("No soportado");
      }
      const dirHandle = await (window as any).showDirectoryPicker({
        id: `Centro_${center.center_id}`,
        mode: "readwrite",
        startIn: "downloads",
      });
      if (dirHandle.requestPermission) {
        const perm = await dirHandle.requestPermission({ mode: "readwrite" });
        if (perm !== "granted") throw new Error("Permiso denegado");
      }
      for (const f of files) {
        const fileHandle = await dirHandle.getFileHandle(f.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(new Blob([f.csv], { type: "text/csv;charset=utf-8" }));
        await writable.close();
      }
      window.alert(`Se exportaron ${files.length} CSV a la carpeta seleccionada.`);
    };

    // B) Fallback: descargas múltiples (funciona en todos los navegadores)
    const saveIndividually = async () => {
      for (const f of files) {
        saveAs(new Blob([f.csv], { type: "text/csv;charset=utf-8" }), f.name);
        // Pequeña pausa para no saturar el gestor de descargas
        await new Promise(r => setTimeout(r, 120));
      }
      // Tip: recuerda decirle al usuario que habilite múltiples descargas si el navegador lo pide
    };

    try {
      await saveToDirectory();
    } catch (_err) {
      await saveIndividually();
    }
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
