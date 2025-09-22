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
  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString();
    const title = showFamilies
      ? `Listado de Familias - Centro ${centerId}`
      : `Listado de Personas - Centro ${centerId}`;

    doc.setFontSize(18);
    doc.text(title, 14, 16);
    doc.setFontSize(12);
    doc.text(`Fecha de descarga: ${currentDate}`, 14, 24);

    const head = showFamilies
      ? [["Nombre Jefe/a de Hogar", "RUT", "Nº Integrantes"]]
      : [
          [
            "Nombre",
            "RUT",
            "Fecha Ingreso",
            "Fecha Salida",
            "Edad",
            "Género",
            "Primer Apellido",
            "Segundo Apellido",
            "Nacionalidad",
            "Estudia",
            "Trabaja",
            "Pérdida de Trabajo",
            "Rubro",
            "Discapacidad",
            "Dependencia",
          ],
        ];

    const body = showFamilies
      ? groups.map((g) => [g.nombre_completo, g.rut, g.integrantes_grupo])
      : people.map((p) => [
          `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ""}`.trim(),
          p.rut,
          p.fecha_ingreso,
          p.fecha_salida,
          p.edad,
          p.genero,
          p.primer_apellido,
          p.segundo_apellido,
          p.nacionalidad,
          p.estudia ? "Sí" : "No",
          p.trabaja ? "Sí" : "No",
          p.perdida_trabajo ? "Sí" : "No",
          p.rubro,
          p.discapacidad ? "Sí" : "No",
          p.dependencia ? "Sí" : "No",
        ]);

    autoTable(doc, {
      startY: 30,
      head,
      body,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        halign: "center",
        overflow: "linebreak",
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fillColor: [240, 240, 240],
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
      },
      margin: { top: 20, left: 10, right: 10 },
    });

    doc.save(`Listado_${showFamilies ? "Familias" : "Personas"}_${centerId}.pdf`);
  };

  const exportToCSV = () => {
    const csv = showFamilies
      ? Papa.unparse(
          groups.map((g) => ({
            nombre_completo: g.nombre_completo,
            rut: g.rut,
            integrantes_grupo: g.integrantes_grupo,
          })),
          { header: true, columns: ["nombre_completo", "rut", "integrantes_grupo"] }
        )
      : Papa.unparse(
          people.map((p) => ({
            nombre: p.nombre,
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
          })),
          {
            header: true,
            columns: [
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
            ],
          }
        );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
          <div className="person-filters">
            <h3>Filtrar</h3>
            <div>
              <label>Nombre:</label>
              <input type="text" name="nombre" value={filters.nombre} onChange={handleFilterChange} />
            </div>
            <div>
              <label>RUT:</label>
              <input type="text" name="rut" value={filters.rut} onChange={handleFilterChange} />
            </div>
            <div>
              <label>Fecha de Ingreso:</label>
              <input type="date" name="fechaIngreso" value={filters.fechaIngreso} onChange={handleFilterChange} />
            </div>
            <div>
              <label>Fecha de Salida:</label>
              <input type="date" name="fechaSalida" value={filters.fechaSalida} onChange={handleFilterChange} />
            </div>
            <div>
              <label>Edad:</label>
              <input type="number" name="edad" value={filters.edad} onChange={handleFilterChange} />
            </div>
            <div>
              <label>Género:</label>
              <input type="text" name="genero" value={filters.genero} onChange={handleFilterChange} />
            </div>
          </div>

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
