// src/pages/CenterResidentsPage/CenterResidentsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./CenterResidentsPage.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import Papa from "papaparse";

import {
  ActiveCenter,
  CapacityInfo,
  Person,
  ResidentGroup,
  DepartureReason,
} from "@/types/residents";
import {
  getCenterCapacity,
  listResidentGroups,
  listPeopleByCenter,
  listActiveCenters,
  registerFamilyDeparture,
} from "@/services/residents.service";

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
  const [exitReason, setExitReason] = useState<"" | DepartureReason>("");
  const [exitDate, setExitDate] = useState("");
  const [residentToExit, setResidentToExit] = useState<ResidentGroup | null>(null);
  const [destinationActivationId, setDestinationActivationId] = useState("");
  const [activeCenters, setActiveCenters] = useState<ActiveCenter[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [centerCapacity, setCenterCapacity] = useState<number>(0);
  const [currentCapacity, setCurrentCapacity] = useState<number>(0);
  const [availableCapacity, setAvailableCapacity] = useState<number>(0);

  const [showFamilies, setShowFamilies] = useState(true);

  // ---------- EXPORTS ----------
  const LOGO_PATH = "/logoMuni/munilogo.png"; // está dentro de /public

async function addLogo(doc: jsPDF) {
  const img = new Image();
  img.src = LOGO_PATH;         // misma origin => sin CORS
  try {
    // espera a que la imagen cargue
    if ((img as any).decode) {
      await img.decode();
    } else {
      await new Promise((res, rej) => {
        img.onload = () => res(null);
        img.onerror = rej;
      });
    }
    // x, y, width, height (ajusta tamaño si quieres)
    doc.addImage(img, "PNG", 12, 10, 16, 16);
  } catch {
    // si no carga, seguimos sin logo
  }
}

const exportToPDF = async () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Header
  await addLogo(doc);
  const currentDate = new Date().toLocaleString();
  const title = showFamilies
    ? `Listado de Familias - Centro ${centerId}`
    : `Listado de Personas - Centro ${centerId}`;

  doc.setFontSize(16);
  doc.text(title, 32, 18);
  doc.setFontSize(9);
  doc.text(`Fecha de descarga: ${currentDate}`, 32, 25);

  // Datos
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

  // Márgenes y ancho útil
  const margin = { top: 20, left: 10, right: 10 };
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - margin.left - margin.right;

  // Compactar altura de línea (jsPDF)
  doc.setLineHeightFactor(1.1);

  autoTable(doc, {
    startY: 32,
    head,
    body,
    theme: "grid",
    tableWidth: usableW,
    styles: {
      font: "helvetica",
      fontSize: 5.5,         // chico para que quepa
      cellPadding: 1.0,      // menos padding
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
          0: { cellWidth: 90, halign: "left"   },
          1: { cellWidth: 40, halign: "center" },
          2: { cellWidth: 30, halign: "center" },
        }
      : {
          0:  { cellWidth: 15, halign: "left"   }, // Nombre
          1:  { cellWidth: 13, halign: "center" }, // RUT
          2:  { cellWidth: 15, halign: "center" }, // F. Ingreso
          3:  { cellWidth: 15, halign: "center" }, // F. Salida
          4:  { cellWidth: 8, halign: "center" }, // Edad
          5:  { cellWidth: 10, halign: "center" }, // Género
          6:  { cellWidth: 12, halign: "left"   }, // 1er Ap.
          7:  { cellWidth: 12, halign: "left"   }, // 2do Ap.
          8:  { cellWidth: 18, halign: "center" }, // Nac.
          9:  { cellWidth: 9, halign: "center" }, // Est.
          10: { cellWidth: 10, halign: "center" }, // Trab.
          11: { cellWidth: 10, halign: "center" }, // Pérdida
          12: { cellWidth: 15, halign: "left"   }, // Rubro
          13: { cellWidth: 15, halign: "center" }, // Discap.
          14: { cellWidth: 15, halign: "center" }, // Dep.
        },
    margin,
  });

  doc.save(`Listado_${showFamilies ? "Familias" : "Personas"}_${centerId}.pdf`);
};

  const exportToCSV = () => {
  // 1) Armamos headers y filas en el orden exacto
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
        rut: g.rut, // si quieres “blindarlo” ante Excel: rut: `="${g.rut}"`,
        integrantes_grupo: g.integrantes_grupo,
      }))
    : people.map((p) => ({
        nombre: `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`.trim(),
        rut: p.rut, // o `="${p.rut}"` para evitar que Excel lo formatee
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

  // 2) Convertimos a matriz en el mismo orden que headers
  const dataMatrix = rows.map((r) => headers.map((h) => (r[h] ?? "") as string | number));

  // 3) Generamos CSV con delimitador ;, comillas y saltos CRLF
  const csvCore = Papa.unparse(
    {
      fields: headers,   // cabeceras
      data: dataMatrix,  // filas
    },
    {
      delimiter: ";",
      quotes: true,
      newline: "\r\n",
    }
  );

  // 4) Pista para Excel + BOM para UTF-8
  const csv = "sep=;\r\n" + csvCore;
  const csvWithBOM = "\uFEFF" + csv;

  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `Listado_${showFamilies ? "Familias" : "Personas"}_${centerId}.csv`);
};

  // ---------- DATA LOAD ----------
  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!centerId) return;
      setLoading(true);
      setError(null);
      try {
        const [cap, grps, ppl, actives] = await Promise.all([
          getCenterCapacity(centerId),
          listResidentGroups(centerId),
          listPeopleByCenter(centerId, filters),
          listActiveCenters(centerId),
        ]);
        if (cancel) return;

        setCenterCapacity(cap.capacity ?? 0);
        setCurrentCapacity(cap.current_capacity ?? 0);
        setAvailableCapacity(cap.available_capacity ?? 0);

        setGroups(Array.isArray(grps) ? grps : []);
        setPeople(Array.isArray(ppl) ? ppl : []);
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

  // ---------- EXIT MODAL ----------
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
        const [cap, grps] = await Promise.all([getCenterCapacity(centerId), listResidentGroups(centerId)]);
        setCenterCapacity(cap.capacity ?? 0);
        setCurrentCapacity(cap.current_capacity ?? 0);
        setAvailableCapacity(cap.available_capacity ?? 0);
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
      await registerFamilyDeparture({
        family_id: residentToExit.family_id,
        departure_reason: exitReason as DepartureReason,
        destination_activation_id: exitReason === "traslado" ? destinationActivationId : null,
        departure_date: exitDate,
      });
      window.alert("Salida registrada con éxito.");
      await handleCloseExitModal();
    } catch (err: any) {
      console.error("Error registrando la salida:", err);
      window.alert(err?.response?.data?.message || `Error: ${err?.message || "No se pudo registrar la salida."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- FILTERS ----------
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      return (
        (filters.nombre ? person.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) : true) &&
        (filters.rut ? person.rut.includes(filters.rut) : true) &&
        (filters.fechaIngreso ? (person.fecha_ingreso || "").includes(filters.fechaIngreso) : true) &&
        (filters.fechaSalida ? (person.fecha_salida || "").includes(filters.fechaSalida) : true) &&
        (filters.edad ? String(person.edad).includes(String(filters.edad)) : true) &&
        (filters.genero ? person.genero.toLowerCase().includes(filters.genero.toLowerCase()) : true)
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
          className={`navigate-btn ${showFamilies ? "active" : ""}`}
          aria-pressed={showFamilies}
        >
          Ver Listado de Familias
        </button>
        <button
          onClick={() => setShowFamilies(false)}
          className={`navigate-btn ${!showFamilies ? "active" : ""}`}
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
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((resident) => (
                  <tr key={resident.family_id ?? `${resident.rut}-${resident.nombre_completo}`}>
                    <td>{resident.nombre_completo}</td>
                    <td>{resident.rut}</td>
                    <td>{resident.integrantes_grupo}</td>
                    <td>
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
        <div>
          <section className="filters-card filters-compact" aria-labelledby="filters-title">
            <div className="filters-header">
              <h3 id="filters-title">Filtrar</h3>
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
            <p>No hay personas registradas en este centro.</p>
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
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => (
                  <tr key={person.rut}>
                    <td>{`${person.nombre} ${person.primer_apellido} ${person.segundo_apellido || ""}`.trim()}</td>
                    <td>{person.rut}</td>
                    <td>{person.fecha_ingreso}</td>
                    <td>{person.fecha_salida}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
                    {activeCenters.map((center) => (
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
    </div>
  );
};

export default CenterResidentsPage;
