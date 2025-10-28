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
  PersonDetailsEnriched,
} from "@/types/residents";
import {
  getCenterCapacity,
  listResidentGroups,
  listPeopleByCenter,
  listActiveCenters,
  registerFamilyDeparture,
  getFamilyDetails,
  getPersonDetailsEnriched,
} from "@/services/residents.service";

const toISODate = (s?: string) => {
  if (!s) return "";
  const iso = s.includes(" ") ? s.replace(" ", "T") : s; // "YYYY-MM-DDTHH:mm:ssZ"
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); // "YYYY-MM-DD"
};

const formatCL = (s?: string) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-CL", { timeZone: "UTC" });
};

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
  const [openDetailsFamilyId, setOpenDetailsFamilyId] = useState<number | null>(null);
  const [familyDetails, setFamilyDetails] = useState<any | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Detalle persona enriquecido
  const [openDetailsPersonId, setOpenDetailsPersonId] = useState<number | null>(null);
  const [personDetails, setPersonDetails] = useState<PersonDetailsEnriched | null>(null);
  const [isPersonDetailsLoading, setIsPersonDetailsLoading] = useState(false);
  const [personDetailsError, setPersonDetailsError] = useState<string | null>(null);
  const [familyDetailsMap, setFamilyDetailsMap] = useState<Record<number, any>>({});

  // EXPORTS
  const LOGO_PATH = "/logoMuni/munilogo.png"; // dentro de /public

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
      // seguir sin logo si falla
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
      : [
          [
            "Nombre",
            "RUT",
            "F. Ingreso",
            "F. Salida",
            "Edad",
            "Género",
            "1°Apellido",
            "2°Apellido",
            "Nacionalidad",
            "Estudia",
            "Trabaja",
            "Pérdida Trabajo",
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
          p.fecha_ingreso || "",
          p.fecha_salida || "",
          p.edad ?? "",
          p.genero || "",
          p.primer_apellido || "",
          p.segundo_apellido || "",
          p.nacionalidad || "",
          p.estudia ? "Sí" : "No",
          p.trabaja ? "Sí" : "No",
          p.perdida_trabajo ? "Sí" : "No",
          p.rubro || "",
          p.discapacidad ? "Sí" : "No",
          p.dependencia ? "Sí" : "No",
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
            0: { cellWidth: 90, halign: "left" },
            1: { cellWidth: 40, halign: "center" },
            2: { cellWidth: 30, halign: "center" },
          }
        : {
            0: { cellWidth: 15, halign: "left" },
            1: { cellWidth: 13, halign: "center" },
            2: { cellWidth: 15, halign: "center" },
            3: { cellWidth: 15, halign: "center" },
            4: { cellWidth: 8, halign: "center" },
            5: { cellWidth: 10, halign: "center" },
            6: { cellWidth: 12, halign: "left" },
            7: { cellWidth: 12, halign: "left" },
            8: { cellWidth: 18, halign: "center" },
            9: { cellWidth: 9, halign: "center" },
            10: { cellWidth: 10, halign: "center" },
            11: { cellWidth: 10, halign: "center" },
            12: { cellWidth: 15, halign: "left" },
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

  // DATA LOAD
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
          fecha_salida: toISODate(p.fecha_salida ?? p.fechaSalida),
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

  // EXIT MODAL
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
      await registerFamilyDeparture({
        familyId: residentToExit.family_id,
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

  const translateNeedCode = (code: number): string => {
    const needsMap: { [key: number]: string } = {
      1: "Alimentación (Canasta de víveres)",
      2: "Abrigo (Ropa de cama, frazadas)",
      3: "X",
      4: "XX",
      5: "XXX",
      6: "XXXX",
      7: "XXXXX",
      8: "XXXXXX",
      9: "XXXXXXX",
      10: "XXXXXXX",
      11: "XXXXXXXX",
      12: "XXXXXXXXX",
      13: "XXXXXXXXXX",
      14: "Otro (Especificar en Observaciones)",
    };
    return needsMap[code] || `Código Desconocido (${code})`;
  };

  const toggleDetails = async (familyId: number | undefined) => { 
    if (!familyId) return;

    if (openDetailsFamilyId === familyId) {
      setOpenDetailsFamilyId(null);
      setFamilyDetails(null);
      setDetailsError(null);
      return;
    }

    setOpenDetailsFamilyId(familyId);
    setFamilyDetails(null);
    setDetailsError(null);

    setIsDetailsLoading(true);
    try {
      const details = await getFamilyDetails(familyId);
      setFamilyDetails(details);
    } catch (e: any) {
      console.error("Error al obtener detalles de la familia:", e);
      setDetailsError("No se pudo cargar la información detallada: " + (e?.response?.data?.error || "Error de conexión."));
    } finally {
      setIsDetailsLoading(false);
    }
  };

 const togglePersonDetails = async (personId: number | undefined) => {
  console.log("🔘 togglePersonDetails called with:", personId);
  console.log("Current openDetailsPersonId:", openDetailsPersonId);
  if (!personId) return;

  // Cerrar si es el mismo
  if (openDetailsPersonId === personId) {
    setOpenDetailsPersonId(null);
    setPersonDetails(null);
    setPersonDetailsError(null);
    setFamilyDetailsMap({});
    return;
  }

  // Abrir nuevo
  setOpenDetailsPersonId(personId);
  setPersonDetails(null);
  setPersonDetailsError(null);
  setFamilyDetailsMap({});
  setIsPersonDetailsLoading(true);

  try {
    console.log("Fetching details for:", personId);
    const details = await getPersonDetailsEnriched(personId); // tu servicio que llama /api/persons/:id/details
    console.log("🧾 Received person details:", details);
    setPersonDetails(details);

    // Si hay memberships, cargar detalles completos de cada family (getFamilyDetails ya existe)
    if (details?.family_memberships && Array.isArray(details.family_memberships) && details.family_memberships.length > 0) {
      const map: Record<number, any> = {};
      await Promise.all(
        details.family_memberships.map(async (fm: any) => {
          try {
            const fd = await getFamilyDetails(fm.family_id); // servicio que ya tienes
            map[fm.family_id] = fd;
          } catch (err) {
            console.error("Error cargando family details for", fm.family_id, err);
            map[fm.family_id] = null;
          }
        })
      );
      setFamilyDetailsMap(map);
    }
  } catch (e: any) {
    console.error("Error al obtener detalles de la persona:", e);
    setPersonDetailsError("No se pudo cargar la información detallada: " + (e?.response?.data?.error || "Error de conexión."));
  } finally {
    setIsPersonDetailsLoading(false);
  }
};

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      return (
        (filters.nombre ? person.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) : true) &&
        (filters.rut ? person.rut.includes(filters.rut) : true) &&
        (filters.fechaIngreso ? (person.fecha_ingreso || "") === filters.fechaIngreso : true) &&
        (filters.fechaSalida ? (person.fecha_salida || "") === filters.fechaSalida : true) &&
        (filters.edad ? String(person.edad).includes(String(filters.edad)) : true) &&
        (filters.genero ? person.genero.toLowerCase().includes(filters.genero.toLowerCase()) : true)
      );
    });
  }, [people, filters]);

  // RENDER
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
                  <React.Fragment key={resident.family_id ?? `${resident.rut}-${resident.nombre_completo}`}>
                    <tr>
                      <td>{resident.nombre_completo}</td>
                      <td>{resident.rut}</td>
                      <td>{resident.integrantes_grupo}</td>
                      <td>
                        <button
                          onClick={() => toggleDetails(resident.family_id)}
                          className="action-btn action-btn-view"
                          style={{
                            marginRight: "8px",
                            backgroundColor: openDetailsFamilyId === resident.family_id ? "#dc3545" : "#007bff",
                          }}
                        >
                          {openDetailsFamilyId === resident.family_id ? "Ocultar Detalles" : "Ver Detalles"}
                        </button>

                        <button onClick={() => handleOpenExitModal(resident)} className="action-btn">
                          Registrar Salida
                        </button>
                      </td>
                    </tr>

                    {openDetailsFamilyId === resident.family_id && (
                      <tr>
                        <td colSpan={4} className="family-details-row" style={{ padding: "0" }}>
                          <div style={{ padding: "15px 20px", backgroundColor: "#f0f0f0", borderTop: "1px solid #ddd" }}>
                            {isDetailsLoading && <p>Cargando detalles del grupo familiar...</p>}
                            {detailsError && (
                              <p style={{ color: "red", fontWeight: "bold" }}>⚠️ Error: {detailsError}</p>
                            )}

                            {familyDetails && (
                              <div className="family-details-card-v2">
                                <header className="card-header-v2">
                                  <div className="header-meta-v2">
                                    {(() => {
                                      const jefeDeHogar = (familyDetails.miembros || []).find((m: any) => m.es_jefe_hogar);
                                      const fechaIngreso = jefeDeHogar?.created_at;
                                      if (fechaIngreso) {
                                        return (
                                          <div className="meta-item">
                                            <i className="fas fa-calendar-alt meta-icon" />
                                            <span className="meta-label">Ingreso al Centro:</span>
                                            <span className="meta-value">{formatCL(fechaIngreso)}</span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </header>

                                <div className="card-body-v2">
                                  <h4 className="section-title-v2">Observaciones y Necesidades Básicas</h4>

                                  <p className="observations-text-v2">
                                    {familyDetails.observaciones || "No hay observaciones registradas."}
                                  </p>

                                  <div className="needs-list-v2">
                                    {(() => {
                                      const needsToDisplay = familyDetails.necesidades_basicas
                                        ? familyDetails.necesidades_basicas.filter((need: number) => need > 0)
                                        : [];

                                      if (needsToDisplay.length > 0) {
                                        return needsToDisplay.map((need: number, index: number) => (
                                          <span key={index} className="need-badge">
                                            {translateNeedCode(need)}
                                          </span>
                                        ));
                                      } else {
                                        return <p className="no-needs-text">No se registraron necesidades básicas urgentes.</p>;
                                      }
                                    })()}
                                  </div>

                                  <h4 className="section-title-v2 members-title">
                                    Miembros del Grupo Familiar ({(familyDetails.miembros || []).length})
                                  </h4>

                                  <div style={{ overflowX: "auto" }}>
                                    <table className="members-table-v2" style={{ minWidth: "1200px" }}>
                                      <thead>
                                        <tr>
                                          <th>Nombre Completo</th>
                                          <th>Parentesco</th>
                                          <th>Edad</th>
                                          <th>Género</th>
                                          <th>RUT</th>
                                          <th>Nacionalidad</th>
                                          <th>Estudia</th>
                                          <th>Trabaja</th>
                                          <th>Rubro</th>
                                          <th>Pérdida Trabajo</th>
                                          <th>Discapacidad</th>
                                          <th>Dependencia</th>
                                          <th>ID Persona</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(familyDetails.miembros || []).map((miembro: any) => (
                                          <tr key={miembro.person_id} className={miembro.es_jefe_hogar ? "is-head" : ""}>
                                            <td>
                                              {miembro.nombre} {miembro.primer_apellido} {miembro.segundo_apellido}
                                            </td>
                                            <td>
                                              <span className={miembro.es_jefe_hogar ? "head-badge" : "member-badge"}>
                                                {miembro.parentesco}
                                              </span>
                                            </td>
                                            <td>{miembro.edad || "-"}</td>
                                            <td>{miembro.genero || "-"}</td>
                                            <td>{miembro.rut || "-"}</td>
                                            <td>{miembro.nacionalidad || "-"}</td>
                                            <td>
                                              <span className={miembro.estudia ? "value-yes" : "value-no"}>
                                                {miembro.estudia ? "Sí" : "No"}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={miembro.trabaja ? "value-yes" : "value-no"}>
                                                {miembro.trabaja ? "Sí" : "No"}
                                              </span>
                                            </td>
                                            <td>{miembro.rubro || "-"}</td>
                                            <td>
                                              <span className={miembro.perdida_trabajo ? "value-yes" : "value-no"}>
                                                {miembro.perdida_trabajo ? "Sí" : "No"}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={miembro.discapacidad ? "value-yes" : "value-no"}>
                                                {miembro.discapacidad ? "Sí" : "No"}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={miembro.dependencia ? "value-yes" : "value-no"}>
                                                {miembro.dependencia ? "Sí" : "No"}
                                              </span>
                                            </td>
                                            <td>{miembro.person_id || "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
                    setFilters({
                      nombre: "",
                      rut: "",
                      fechaIngreso: "",
                      fechaSalida: "",
                      edad: "",
                      genero: "",
                    })
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
            <div style={{ overflowX: "auto" }}>
              <table className="people-table" style={{ minWidth: "1500px" }}>
                <thead>
                  <tr>
                    <th>Nombre Completo</th>
                    <th>RUT</th>
                    <th>Fecha Ingreso</th>
                    <th>Fecha Salida</th>
                    <th>Edad</th>
                    <th>Género</th>
                    <th>Nacionalidad</th>
                    <th>Estudia</th>
                    <th>Trabaja</th>
                    <th>Pérdida de Trabajo</th>
                    <th>Rubro</th>
                    <th>Discapacidad</th>
                    <th>Dependencia</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person) => (
                    <React.Fragment key={person.person_id}>
                      <tr>
                        <td>{`${person.nombre} ${person.primer_apellido} ${person.segundo_apellido || ""}`.trim()}</td>
                        <td>{person.rut}</td>
                        <td>{person.fecha_ingreso ? formatCL(person.fecha_ingreso) : "-"}</td>
                        <td>{person.fecha_salida ? formatCL(person.fecha_salida) : "-"}</td>
                        <td>{person.edad || "-"}</td>
                        <td>{person.genero ?? "-"}</td>
                        <td>{person.nacionalidad || "-"}</td>
                        <td>{person.estudia ? "Sí" : "No"}</td>
                        <td>{person.trabaja ? "Sí" : "No"}</td>
                        <td>{person.perdida_trabajo ? "Sí" : "No"}</td>
                        <td>{person.rubro || "-"}</td>
                        <td>{person.discapacidad ? "Sí" : "No"}</td>
                        <td>{person.dependencia ? "Sí" : "No"}</td>
                        <td>
                          <button
                            onClick={() => togglePersonDetails(person.person_id)}
                            className="action-btn action-btn-view"
                            style={{
                              marginRight: "8px",
                              backgroundColor: openDetailsPersonId === person.person_id ? "#dc3545" : "#007bff",
                            }}
                          >
                            {openDetailsPersonId === person.person_id ? "Ocultar Detalles" : "Ver Detalles"}
                          </button>
                        </td>
                      </tr>

                      {openDetailsPersonId === person.person_id && (
                        <tr>
                          <td colSpan={14} className="person-details-row" style={{ padding: 0 }}>
                            <div
                              style={{
                                padding: "15px 20px",
                                backgroundColor: "#f0f0f0",
                                borderTop: "1px solid #ddd",
                              }}
                            >
                              {isPersonDetailsLoading && <p>Cargando detalles de la persona...</p>}
                              {personDetailsError && (
                                <p style={{ color: "red", fontWeight: "bold" }}>⚠️ Error: {personDetailsError}</p>
                              )}

                              {/* ---------------- HEADER META: Ingreso al Centro (igual que en familias) ---------------- */}
                              {personDetails?.person_details && (
                                <div className="family-details-card-v2">
                                  <header className="card-header-v2">
                                    <div className="header-meta-v2">
                                      {/* Ingreso al Centro: fecha formatted */}
                                      <div className="meta-item">
                                        <i className="fas fa-calendar-alt meta-icon" />
                                        <span className="meta-label">Ingreso al Centro:</span>
                                        <span className="meta-value">
                                          {personDetails.person_details.created_at
                                            ? formatCL(personDetails.person_details.created_at)
                                            : "Desconocido"}
                                        </span>
                                      </div>
                                    </div>
                                  </header>

                                  <div className="card-body-v2">
                                    {/* Observaciones y Necesidades (tomadas desde familyDetailsMap si existe) */}
                                    <h4 className="section-title-v2">Observaciones y Necesidades Básicas</h4>

                                    {/* Observaciones: mostramos la observación de la primera familia asociada si está disponible */}
                                    {personDetails.family_memberships?.[0] && familyDetailsMap[personDetails.family_memberships[0].family_id] ? (
                                      <p className="observations-text-v2" style={{ marginBottom: 15 }}>
                                        {familyDetailsMap[personDetails.family_memberships[0].family_id].observaciones ||
                                          "No hay observaciones registradas."}
                                      </p>
                                    ) : personDetails.family_memberships?.length > 0 ? (
                                      <p>Cargando observaciones de la familia...</p>
                                    ) : (
                                      <p className="observations-text-v2">No hay observaciones registradas.</p>
                                    )}

                                    {/* Necesidades: buscamos en la misma familyDetailsMap (igual que familias) */}
                                    <div className="needs-list-v2" style={{ marginBottom: 12 }}>
                                      {(() => {
                                        const fm = personDetails.family_memberships?.[0];
                                        const fd = fm ? familyDetailsMap[fm.family_id] : null;
                                        const needsToDisplay = fd?.necesidades_basicas
                                          ? fd.necesidades_basicas.filter((need: number) => need > 0)
                                          : [];
                                        if (needsToDisplay.length > 0) {
                                          return needsToDisplay.map((need: number, i: number) => (
                                            <span key={i} className="need-badge">
                                              {translateNeedCode(need)}
                                            </span>
                                          ));
                                        } else {
                                          return <p className="no-needs-text">No se registraron necesidades básicas urgentes.</p>;
                                        }
                                      })()}
                                    </div>

                                    {/* Miembros del Grupo Familiar (reutiliza fd si existe) */}
                                    {Array.isArray(personDetails.family_memberships) && personDetails.family_memberships.length > 0 ? (
                                      personDetails.family_memberships.map((fm: any) => {
                                        const fd = familyDetailsMap[fm.family_id];
                                        return (
                                          <div key={fm.family_id} style={{ marginBottom: 16 }}>
                                            <h4 className="section-title-v2 members-title">
                                              Miembros del Grupo Familiar ({(fd?.miembros || []).length})
                                            </h4>

                                            {fd ? (
                                              <div style={{ overflowX: "auto" }}>
                                                <table className="members-table-v2" style={{ minWidth: "1000px" }}>
                                                  <thead>
                                                    <tr>
                                                      <th>Nombre Completo</th>
                                                      <th>Parentesco</th>
                                                      <th>Edad</th>
                                                      <th>Género</th>
                                                      <th>RUT</th>
                                                      <th>Nacionalidad</th>
                                                      <th>Estudia</th>
                                                      <th>Trabaja</th>
                                                      <th>Rubro</th>
                                                      <th>Pérdida Trabajo</th>
                                                      <th>Discapacidad</th>
                                                      <th>Dependencia</th>
                                                      <th>ID Persona</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {(fd.miembros || []).map((mi: any) => (
                                                      <tr key={mi.person_id} className={mi.es_jefe_hogar ? "is-head" : ""}>
                                                        <td>{mi.nombre} {mi.primer_apellido} {mi.segundo_apellido}</td>
                                                        <td><span className={mi.es_jefe_hogar ? "head-badge" : "member-badge"}>{mi.parentesco}</span></td>
                                                        <td>{mi.edad || "-"}</td>
                                                        <td>{mi.genero || "-"}</td>
                                                        <td>{mi.rut || "-"}</td>
                                                        <td>{mi.nacionalidad || "-"}</td>
                                                        <td>{mi.estudia ? "Sí" : "No"}</td>
                                                        <td>{mi.trabaja ? "Sí" : "No"}</td>
                                                        <td>{mi.rubro || "-"}</td>
                                                        <td>{mi.perdida_trabajo ? "Sí" : "No"}</td>
                                                        <td>{mi.discapacidad ? "Sí" : "No"}</td>
                                                        <td>{mi.dependencia ? "Sí" : "No"}</td>
                                                        <td>{mi.person_id || "-"}</td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            ) : (
                                              <p> Cargando información de la familia {fm.family_id}... </p>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <p>No pertenece a ningún grupo familiar.</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* -------------------------------------------------------------------------------- */}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
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
                <input id="exitDate" type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} required />
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
