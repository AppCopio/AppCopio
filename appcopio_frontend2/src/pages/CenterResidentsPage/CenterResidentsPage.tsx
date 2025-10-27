import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./CenterResidentsPage.css"; // Archivo CSS necesario
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import Papa from "papaparse";

import {
  ActiveCenter,
  Person,
  ResidentGroup,
  DepartureReason,
} from "@/types/residents";
import {
  getCenterCapacity,
  listResidentGroups,
  listPeopleByCenter,
  getFamilyMembers,
  listActiveCenters,
  registerFamilyDeparture,
  getFamilyDetails,
} from "@/services/residents.service";


// --- Funciones de Utilidad ---

const toISODate = (s?: string) => {
  if (!s) return "";
  const iso = s?.includes(" ") ? s.replace(" ", "T") : s;   // "YYYY-MM-DDTHH:mm:ssZ"
  const d = new Date(iso || "");
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); // "YYYY-MM-DD"
};

const formatCL = (s?: string) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-CL");
};

// === CONSTANTE DE NECESIDADES (DEBE COINCIDIR CON LA FUENTE DE DATOS) ===
const NEEDS_OPTIONS = [
  "Alimentos",
  "Agua",
  "Alimentación lactantes",
  "Colchones/frazadas",
  "Artículos de higiene personal",
  "Solución habitacional transitoria",
  "Pañales adulto",
  "Pañales niño",
  "Vestuario",
  "Calefacción",
  "Artículos de aseo",
  "Materiales de cocina",
  "Materiales de construcción",
];
// =======================================================================


// Define un tipo de entrada que puede ser ResidentGroup (desde lista de familias) o Person (desde lista de personas)
type FamilyDetailsInput = ResidentGroup | Person;


const CenterResidentsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<ResidentGroup[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    nombre: "",
    rut: "",
    fechaIngreso: "",
    fechaSalida: "",
    edad: "",
    genero: "",
  });

  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false); 
  const [exitReason, setExitReason] = useState<"" | DepartureReason>("");
  const [exitDate, setExitDate] = useState("");
  const [residentToExit, setResidentToExit] = useState<ResidentGroup | null>(null);
  
  // selectedFamily contendrá ahora la versión enriquecida con detalles
  const [selectedFamily, setSelectedFamily] = useState<ResidentGroup | null>(null); 
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<Person[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false); // Nuevo estado para la carga de detalles

  const [destinationActivationId, setDestinationActivationId] = useState("");
  const [activeCenters, setActiveCenters] = useState<ActiveCenter[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [centerCapacity, setCenterCapacity] = useState<number>(0);
  const [currentCapacity, setCurrentCapacity] = useState<number>(0);
  const [availableCapacity, setAvailableCapacity] = useState<number>(0);

  const [showFamilies, setShowFamilies] = useState(true);

  // ---------- EXPORTS (Se mantiene igual) ----------
  const LOGO_PATH = "/logoMuni/munilogo.png"; // está dentro de /public

  async function addLogo(doc: jsPDF) {
    const img = new Image();
    img.src = LOGO_PATH;
    try {
      if ((img as any).decode) {
        await img.decode();
      } else {
        await new Promise((res, rej) => {
          img.onload = () => res(null);
          img.onerror = rej;
        });
      }
      doc.addImage(img, "PNG", 12, 10, 16, 16);
    } catch {
      /* si no carga, seguimos sin logo */
    }
  }

  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await addLogo(doc);
    const currentDate = new Date().toLocaleString();
    const title = showFamilies
      ? `Listado de Familias - Centro ${centerId}`
      : `Listado de Personas - Centro ${centerId}`;

    doc.setFontSize(16);
    doc.text(title, 32, 18);
    doc.setFontSize(9);
    doc.text(`Fecha de descarga: ${currentDate}`, 32, 25);

    const head = showFamilies
      ? [["Nombre Jefe/a de Hogar", "RUT", "Nº Integrantes"]]
      : [[
          "Nombre","RUT","F. Ingreso","F. Salida","Edad","Género",
          "1°Apellido","2°Apellido","Nacionalidad","Estudia","Trabaja","Pérdida Trabajo","Rubro","Discapacidad","Dependencia"
        ]];

    const body = showFamilies
      ? groups.map(g => [g.nombre_completo, g.rut, g.integrantes_grupo])
      : people.map(p => [
          `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`.trim(),
          p.rut, p.fecha_ingreso || "", p.fecha_salida || "", p.edad ?? "", p.genero || "",
          p.primer_apellido || "", p.segundo_apellido || "", p.nacionalidad || "",
          p.estudia ? "Sí" : "No", p.trabaja ? "Sí" : "No", p.perdida_trabajo ? "Sí" : "No",
          p.rubro || "", p.discapacidad ? "Sí" : "No", p.dependencia ? "Sí" : "No",
        ]);

    const margin = { top: 20, left: 10, right: 10 };
    const pageW = doc.internal.pageSize.getWidth();
    const usableW = pageW - margin.left - margin.right;

    doc.setLineHeightFactor(1.1);

    autoTable(doc, {
      startY: 32,
      head,
      body,
      theme: "grid",
      tableWidth: usableW,
      styles: {
        font: "helvetica",
        fontSize: 5.5,
        cellPadding: 1.0,
        overflow: "linebreak",
        valign: "middle",
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fillColor: [240, 240, 240],
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        fontSize: 6,
        cellPadding: 0.6,
        minCellHeight: 5,
      },
      columnStyles: showFamilies
        ? {
            0: { cellWidth: 90, halign: "left"  },
            1: { cellWidth: 40, halign: "center" },
            2: { cellWidth: 30, halign: "center" },
          }
        : {
            0:  { cellWidth: 15, halign: "left"  },
            1:  { cellWidth: 13, halign: "center" },
            2:  { cellWidth: 15, halign: "center" },
            3:  { cellWidth: 15, halign: "center" },
            4:  { cellWidth: 8, halign: "center" },
            5:  { cellWidth: 10, halign: "center" },
            6:  { cellWidth: 12, halign: "left"  },
            7:  { cellWidth: 12, halign: "left"  },
            8:  { cellWidth: 18, halign: "center" },
            9:  { cellWidth: 9, halign: "center" },
            10: { cellWidth: 10, halign: "center" },
            11: { cellWidth: 10, halign: "center" },
            12: { cellWidth: 15, halign: "left"  },
            13: { cellWidth: 15, halign: "center" },
            14: { cellWidth: 15, halign: "center" },
          },
      margin,
    });

    doc.save(`Listado_${showFamilies ? "Familias" : "Personas"}_${centerId}.pdf`);
  };

  const exportToCSV = () => {
    const headers = showFamilies
      ? ["nombre_completo", "rut", "integrantes_grupo"]
      : [
          "nombre",
          "rut",
          "fecha_ingreso",
          "fecha_salida",
          "edad",
          "genero",
          "primer_apellido",
          "segundo_apellido",
          "nacionalidad",
          "estudia",
          "trabaja",
          "perdida_trabajo",
          "rubro",
          "discapacidad",
          "dependencia",
        ];

    type Row = Record<string, string | number | null | undefined>;

    const rows: Row[] = showFamilies
      ? groups.map((g) => ({
          nombre_completo: g.nombre_completo,
          rut: g.rut,
          integrantes_grupo: g.integrantes_grupo,
        }))
      : people.map((p) => ({
          nombre: `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`.trim(),
          rut: p.rut,
          fecha_ingreso: p.fecha_ingreso,
          fecha_salida: p.fecha_salida,
          edad: p.edad,
          genero: p.genero,
          primer_apellido: p.primer_apellido,
          segundo_apellido: p.segundo_apellido,
          nacionalidad: p.nacionalidad,
          estudia: p.estudia ? "Sí" : "No",
          trabaja: p.trabaja ? "Sí" : "No",
          perdida_trabajo: p.perdida_trabajo ? "Sí" : "No",
          rubro: p.rubro,
          discapacidad: p.discapacidad ? "Sí" : "No",
          dependencia: p.dependencia ? "Sí" : "No",
        }));

    const dataMatrix = rows.map((r) => headers.map((h) => (r[h] ?? "") as string | number));

    const csvCore = Papa.unparse(
      {
        fields: headers,
        data: dataMatrix,
      },
      {
        delimiter: ";",
        quotes: true,
        newline: "\r\n",
      }
    );

    const csv = "sep=;\r\n" + csvCore;
    const csvWithBOM = "\uFEFF" + csv;

    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `Listado_${showFamilies ? "Familias" : "Personas"}_${centerId}.csv`);
  };

  // ---------- DATA LOAD (Se mantiene igual) ----------
  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!centerId) return;
      setLoading(true);
      setError(null);
      try {
        const [cap, grps, ppl, actives] = await Promise.all([
          getCenterCapacity(centerId!),
          listResidentGroups(centerId!),
          listPeopleByCenter(centerId!, filters),
          listActiveCenters(),
        ]);
        if (cancel) return;

        if (cap) {
          setCenterCapacity(cap.capacity ?? 0);
          setCurrentCapacity(cap.current_capacity ?? 0);
          setAvailableCapacity(cap.available_capacity ?? 0);
        }

        setGroups(Array.isArray(grps) ? grps : []);
        const raw = Array.isArray(ppl) ? ppl : [];
        const normalized = raw.map((p: any) => ({
          ...p,
          fecha_ingreso: toISODate(p.fecha_ingreso ?? p.fechaIngreso ?? p.created_at ?? p.createdAt),
          fecha_salida:  toISODate(p.fecha_salida  ?? p.fechaSalida),
          // Asumimos que la lista de personas trae family_id
          family_id: p.family_id,
        }));
        setPeople(normalized);
        setActiveCenters(Array.isArray(actives) ? actives : []);
      } catch (e: any) {
        if (!cancel) setError(e?.response?.data?.message || e?.message || "Error al cargar los datos.");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId, JSON.stringify(filters)]);

  // ---------- MODAL HANDLERS (UNIFICADO PARA PERSONA Y GRUPO) ----------
  const handleOpenDetailsModal = async (input: FamilyDetailsInput) => {
    
    // Identificamos el family_id a partir del input (tanto Person como ResidentGroup deben tenerlo)
    const familyId = String(input.family_id); 
    
    if (!familyId || familyId === 'undefined' || familyId === 'null') { 
        window.alert('No se pudo cargar la familia: falta el identificador de grupo.');
        setSelectedFamily(null);
        setSelectedFamilyMembers([]);
        return;
    }

    setIsDetailsLoading(true);
    setSelectedFamily(null); // Limpiar datos anteriores
    setSelectedFamilyMembers([]);

    try {
        // 1. Obtener detalles completos del grupo (Incluye necesidades y observaciones)
        const [fullDetails, members] = await Promise.all([
            getFamilyDetails(familyId),
            getFamilyMembers(familyId), 
        ]);

        // 2. Composición de los detalles finales
        const finalDetails: ResidentGroup = {
            // Usamos la info básica de la lista/persona como fallback
            ...(input as ResidentGroup), 
            // Sobreescribimos con los detalles completos (incluyendo FIBE)
            ...fullDetails,      
            // Aseguramos family_id y rut por si acaso
            family_id: fullDetails.family_id || input.family_id,
            rut: fullDetails.rut || ('rut' in input ? input.rut : ''), 
            nombre_completo: fullDetails.nombre_completo || ('nombre_completo' in input ? input.nombre_completo : input.nombre) || '',
            // Si el input es un Person, no tiene integrantes_grupo, lo tomamos del fullDetails o members.length
            integrantes_grupo: fullDetails.integrantes_grupo || ('integrantes_grupo' in input ? input.integrantes_grupo : members.length), 
        };

        setSelectedFamily(finalDetails);
        setSelectedFamilyMembers(Array.isArray(members) ? members : []);
        setIsDetailsModalOpen(true);

    } catch (error) {
        console.error('Error cargando los detalles de la familia:', error);
        window.alert('No se pudieron cargar los detalles completos de la familia. Intente de nuevo.');
        
        // Fallback para abrir el modal con la info básica si falla la carga completa
        setSelectedFamily({
          ...input,
          rut: ('rut' in input ? input.rut : '') || '',
          nombre_completo: ('nombre_completo' in input ? input.nombre_completo : input.nombre) || 'Jefe/a Desconocido/a',
          integrantes_grupo: 0, 
          family_id: input.family_id,
        } as ResidentGroup);
        
        setSelectedFamilyMembers([]); // Limpiamos miembros en caso de error
        setIsDetailsModalOpen(true);
    } finally {
        setIsDetailsLoading(false);
    }
  };


  const handleOpenExitModal = (resident: ResidentGroup) => {
    setResidentToExit(resident);
    setIsExitModalOpen(true);
  };

  const resetExitForm = () => {
    setIsExitModalOpen(false);
    setExitReason("");
    setExitDate("");
    setDestinationActivationId("");
    setResidentToExit(null);
  };

  const handleCloseExitModal = async () => {
    resetExitForm();
    if (centerId) {
      try {
        // Recargar solo la lista de grupos, ya que es la que se modifica al egresar
        const [cap, grps] = await Promise.all([getCenterCapacity(centerId), listResidentGroups(centerId)]);
        if (cap) {
          setCenterCapacity(cap.capacity ?? 0);
          setCurrentCapacity(cap.current_capacity ?? 0);
          setAvailableCapacity(cap.available_capacity ?? 0);
        }
        setGroups(grps);
      } catch {
        /* noop */
      }
    }
  };

  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentToExit || !residentToExit.family_id || !exitReason || !exitDate) {
      window.alert("Debe completar todos los campos necesarios.");
      return;
    }
    if (exitReason === "traslado" && !destinationActivationId) {
      window.alert("Seleccione el centro de destino para un traslado.");
      return;
    }

    setIsSubmitting(true);
    try {
      // familyId es number
      await registerFamilyDeparture({
        familyId: residentToExit.family_id,
        departure_reason: exitReason as DepartureReason,
        destination_activation_id: exitReason === "traslado" ? destinationActivationId : null,
        departure_date: exitDate,
      });
      window.alert("Salida registrada con éxito. Recargando datos...");
      await handleCloseExitModal();
    } catch (err: any) {
      console.error("Error registrando la salida:", err);
      window.alert(err?.response?.data?.message || `Error: ${err?.message || "No se pudo registrar la salida."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- FILTERS (Se mantiene igual) ----------
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const fullName = `${person.nombre} ${person.primer_apellido} ${person.segundo_apellido || ""}`.toLowerCase().trim();
      const filterNombre = filters.nombre.toLowerCase().trim();
      
      return (
        (filterNombre ? fullName.includes(filterNombre) : true) &&
        (filters.rut ? person.rut.includes(filters.rut) : true) &&
        (filters.fechaIngreso ? (person.fecha_ingreso || "") === filters.fechaIngreso : true) &&
        (filters.fechaSalida  ? (person.fecha_salida  || "") === filters.fechaSalida  : true) &&
        (filters.edad ? String(person.edad) === String(filters.edad) : true) &&
        (filters.genero ? person.genero?.toLowerCase().startsWith(filters.genero.toLowerCase()) : true)
      );
    });
  }, [people, filters]);

  // ---------- RENDER ----------
  if (!error && loading) return <div className="residents-container">Cargando...</div>;
  if (error)
    return (
      <div className="residents-container">
        <div className="error-box">{error}</div>
        <button onClick={() => navigate(-1)} className="back-button" style={{ marginTop: 12 }}>
          ← Volver
        </button>
      </div>
    );

  return (
    <div className="residents-container">
      {/* ... (Contenido principal - Capacidad, Botones, Tablas) ... */}
      <div className="residents-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Volver
        </button>
        <h2>Familias/Personas Albergadas - Centro {centerId}</h2>
      </div>

      <div className="capacity-info">
        <p>
          <strong>Capacidad Total:</strong> {centerCapacity}
        </p>
        <p>
          <strong>Ocupado:</strong> {currentCapacity}
        </p>
        <p>
          <strong>Disponible:</strong> {availableCapacity}
        </p>
      </div>

      <div className="export-buttons" style={{ marginBottom: "1rem" }}>
        <button onClick={exportToPDF} className="export-btn">
          Exportar a PDF
        </button>
        <button onClick={exportToCSV} className="export-btn">
          Exportar a Excel
        </button>
      </div>

      <div className="navigate-button">
        <button
          onClick={() => setShowFamilies(true)}
          className={`Maps-btn ${showFamilies ? "active" : ""}`}
          aria-pressed={showFamilies}
        >
          Ver Listado de Familias
        </button>
        <button
          onClick={() => setShowFamilies(false)}
          className={`Maps-btn ${!showFamilies ? "active" : ""}`}
          aria-pressed={!showFamilies}
        >
          Ver Listado de Personas
        </button>
      </div>

      {showFamilies ? (
        <div>
          {groups.length === 0 ? (
            <p>No hay familias registradas actualmente en este centro.</p>
          ) : (
            <table className="residents-table">
              <thead>
                <tr>
                  <th>Nombre Jefe/a de Hogar</th>
                  <th>RUT</th>
                  <th>Nº Integrantes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((resident) => (
                  <tr key={resident.family_id ?? `${resident.rut}-${resident.nombre_completo}`}>
                    <td>{resident.nombre_completo}</td>
                    <td>{resident.rut}</td>
                    <td>{resident.integrantes_grupo}</td>
                    <td className="action-buttons">
                      <button 
                        onClick={() => handleOpenDetailsModal(resident)} 
                        className="action-btn view-details-btn"
                        disabled={isDetailsLoading}
                      >
                        {isDetailsLoading && selectedFamily?.family_id === resident.family_id ? 'Cargando...' : 'Ver Detalles'}
                      </button>
                      <button onClick={() => handleOpenExitModal(resident)} className="action-btn">
                        Registrar Salida
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        // --- VISTA DE PERSONAS ---
        <div>
          <section className="filters-card filters-compact" aria-labelledby="filters-title">
            <div className="filters-header">
              <h3 id="filters-title">Filtrar Personas</h3>
              <div className="filters-actions">
                <button
                  type="button"
                  className="btn-secondary-outlined"
                  onClick={() =>
                    setFilters({ nombre: "", rut: "", fechaIngreso: "", fechaSalida: "", edad: "", genero: "" })
                  }
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="filters-grid">
              <label className="filter-field">
                <span>Nombre</span>
                <input type="text" name="nombre" value={filters.nombre} onChange={handleFilterChange} placeholder="nombre (ej: Juan) :" />
              </label>

              <label className="filter-field">
                <span>RUT</span>
                <input type="text" name="rut" value={filters.rut} onChange={handleFilterChange} placeholder="rut (ej: 12.345.678-9) :" />
              </label>

              <label className="filter-field">
                <span>Fecha de Ingreso</span>
                <input type="date" name="fechaIngreso" value={filters.fechaIngreso} onChange={handleFilterChange} />
              </label>

              <label className="filter-field">
                <span>Fecha de Salida</span>
                <input type="date" name="fechaSalida" value={filters.fechaSalida} onChange={handleFilterChange} />
              </label>

              <label className="filter-field">
                <span>Edad</span>
                <input type="number" name="edad" value={filters.edad} onChange={handleFilterChange} placeholder="edad (ej: 12) :" />
              </label>

              <label className="filter-field">
                <span>Género</span>
                <input type="text" name="genero" value={filters.genero} onChange={handleFilterChange} placeholder="Genero (ej: F / M / X) :" />
              </label>
            </div>
          </section>

          {filteredPeople.length === 0 ? (
            <p>No hay personas que coincidan con los filtros en este centro.</p>
          ) : (
            <table className="people-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Fecha Ingreso</th>
                  <th>Fecha Salida</th>
                  <th>Edad</th>
                  <th>Género</th>
                  <th>Primer Apellido</th>
                  <th>Segundo Apellido</th>
                  <th>Nacionalidad</th>
                  <th>Estudia</th>
                  <th>Trabaja</th>
                  <th>Pérdida de Trabajo</th>
                  <th>Rubro</th>
                  <th>Discapacidad</th>
                  <th>Dependencia</th>
                  <th>Acciones</th> 
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => (
                  <tr key={person.rut}>
                    <td>{`${person.nombre} ${person.primer_apellido} ${person.segundo_apellido || ""}`.trim()}</td>
                    <td>{person.rut}</td>
                    <td>{formatCL(person.fecha_ingreso)}</td>
                    <td>{formatCL(person.fecha_salida)}</td>
                    <td>{person.edad}</td>
                    <td>{person.genero}</td>
                    <td>{person.primer_apellido}</td>
                    <td>{person.segundo_apellido}</td>
                    <td>{person.nacionalidad}</td>
                    <td>{person.estudia ? "Sí" : "No"}</td>
                    <td>{person.trabaja ? "Sí" : "No"}</td>
                    <td>{person.perdida_trabajo ? "Sí" : "No"}</td>
                    <td>{person.rubro}</td>
                    <td>{person.discapacidad ? "Sí" : "No"}</td>
                    <td>{person.dependencia ? "Sí" : "No"}</td>
                    {/* <-- BOTÓN "VER GRUPO" */}
                    <td className="action-buttons">
                      <button 
                        onClick={() => handleOpenDetailsModal(person)} // <-- PASAMOS EL OBJETO PERSON
                        className="action-btn view-details-btn"
                        // Desactivamos si no tiene family_id
                        disabled={isDetailsLoading || !person.family_id} 
                        title={person.family_id ? "Ver Grupo" : "Persona no asignada a grupo familiar"}
                      >
                        Ver Grupo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL DE SALIDA (Se mantiene igual) */}
      {isExitModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Registrar Salida de: {residentToExit?.nombre_completo}</h3>
            <form onSubmit={handleExitSubmit}>
              <div className="form-group">
                <label htmlFor="exitReason">Motivo de la salida:</label>
                <select
                  id="exitReason"
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value as DepartureReason | "")}
                  required
                >
                  <option value="">Seleccione un motivo</option>
                  <option value="traslado">Traslado a otro centro</option>
                  <option value="regreso">Regreso a casa</option>
                  <option value="reubicacion">Reubicación</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="exitDate">Fecha de salida:</label>
                <input
                  id="exitDate"
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  required
                />
              </div>

              {exitReason === "traslado" && (
                <div className="form-group">
                  <label htmlFor="destinationActivationId">Centro de destino:</label>
                  <select
                    id="destinationActivationId"
                    value={destinationActivationId}
                    onChange={(e) => setDestinationActivationId(e.target.value)}
                    required
                  >
                    <option value="">Seleccione centro...</option>
                    {activeCenters
                      .filter(center => center.activation_id !== centerId)
                      .map((center) => (
                        <option key={center.activation_id} value={center.activation_id}>
                          {center.center_name} ({center.center_id})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetExitForm} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Registrando..." : "Registrar Salida"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES (FINALIZADO) */}
      {isDetailsModalOpen && selectedFamily && (
        <div className="modal-overlay">
          <div className="modal-content details-modal">
            <div className="modal-header">
              <h3>Detalles del Grupo Familiar (ID: {selectedFamily.family_id})</h3>
              <button onClick={() => setIsDetailsModalOpen(false)} className="close-button">×</button>
            </div>

            {isDetailsLoading ? (
                <p>Cargando información detallada...</p>
            ) : (
                <>
                    {/* Información básica */}
                    <section className="details-section">
                    <h4>Información FIBE</h4>
                    <div className="details-grid">
                        <div className="details-item">
                        <strong>Jefe/a de Hogar:</strong> {selectedFamily.nombre_completo}
                        </div>
                        <div className="details-item">
                        <strong>RUT:</strong> {selectedFamily.rut}
                        </div>
                        <div className="details-item">
                        <strong>Número de Integrantes:</strong> {selectedFamily.integrantes_grupo || selectedFamilyMembers.length}
                        </div>
                        <div className="details-item">
                        <strong>Fecha de Ingreso:</strong> {selectedFamily.fecha_ingreso ? formatCL(selectedFamily.fecha_ingreso) : 'N/A'}
                        </div>
                        <div className="details-item">
                        <strong>Fecha de Salida:</strong> {formatCL(selectedFamily.fecha_salida)}
                        </div>
                    </div>
                    </section>

                    {/* Necesidades y Observaciones */}
                    <section className="details-section">
                    <h4>Necesidades y Apoyos Registrados</h4>
                    <div className="details-grid details-grid-full">
                        <div className="details-item full-width">
                        <strong>Necesidades Básicas:</strong> 
                            <div className="needs-tags-container">
                            {selectedFamily.necesidades_basicas && selectedFamily.necesidades_basicas.length > 0 ? (
                                
                                // SOLUCIÓN DE UNICIDAD DE NECESIDADES
                                Array.from(new Set(selectedFamily.necesidades_basicas))
                                    .map(index => NEEDS_OPTIONS[index] || `Índice Desconocido (${index})`)
                                    .map((needText, idx) => (
                                        <span key={needText + idx} className="need-tag">
                                            {needText}
                                        </span>
                                    ))

                            ) : (
                                <span>Ninguna</span>
                            )}
                            </div>
                        </div>
                            
                        <div className="details-item">
                            <strong>Necesidades Especiales:</strong> {selectedFamily.necesidades_especiales || 'No aplica'}
                        </div>
                        <div className="details-item">
                            <strong>Apoyo Requerido:</strong> {selectedFamily.apoyo_requerido || 'No aplica'}
                        </div>

                        <div className="details-item full-width observation-box">
                        <strong>Observaciones:</strong> 
                            <p>{selectedFamily.observaciones || 'Sin observaciones'}</p>
                        </div>
                    </div>
                    </section>

                    {/* Lista de integrantes */}
                    <section className="details-section">
                    <h4>Integrantes del Grupo Familiar ({selectedFamilyMembers.length})</h4>
                    {selectedFamilyMembers.length === 0 ? (
                        <p>No hay integrantes registrados para esta familia.</p>
                    ) : (
                        <div className="table-container"> 
                        <table className="members-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>RUT</th>
                                    <th>Edad</th>
                                    <th>Parentesco</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedFamilyMembers.map(member => (
                                    <tr key={member.rut}>
                                        <td>{`${member.nombre} ${member.primer_apellido}`}</td>
                                        <td>{member.rut}</td>
                                        <td>{member.edad}</td>
                                        <td>{member.parentesco || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                    </section>
                </>
            )}

            <div className="modal-actions">
                <button 
                    onClick={() => setIsDetailsModalOpen(false)} 
                    className="btn-secondary"
                    disabled={isDetailsLoading}
                >
                    Cerrar
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterResidentsPage;
