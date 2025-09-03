import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CenterResidentsPage.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

interface ResidentGroup {
  rut: string;
  nombre_completo: string;
  integrantes_grupo: number;
  family_id: number;
}

interface Person {
  rut: string;
  nombre: string;
  fecha_ingreso: string;
  fecha_salida: string;
  edad: number;
  genero: string;
  primer_apellido: string;
  segundo_apellido: string;
  nacionalidad: string;
  estudia: boolean;
  trabaja: boolean;
  perdida_trabajo: boolean;
  rubro: string;
  discapacidad: boolean;
  dependencia: boolean;
}

interface ActiveCenter {
  activation_id: number;
  center_id: string;
  center_name: string;
}

const CenterResidentsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ResidentGroup[]>([]);
  const [people, setPeople] = useState<Person[]>([]); // Lista de personas
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    nombre: '',
    rut: '',
    fechaIngreso: '',
    fechaSalida: '',
    edad: '',
    genero: '',
  });

  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitReason, setExitReason] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [residentToExit, setResidentToExit] = useState<ResidentGroup | null>(null);
  const [destinationActivationId, setDestinationActivationId] = useState('');
  const [activeCenters, setActiveCenters] = useState<ActiveCenter[]>([]);

  const [centerCapacity, setCenterCapacity] = useState<number>(0);
  const [currentCapacity, setCurrentCapacity] = useState<number>(0);
  const [availableCapacity, setAvailableCapacity] = useState<number>(0);

  const [showFamilies, setShowFamilies] = useState(true); // Estado para manejar qué tabla mostrar

  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString(); // Fecha de descarga
    const title = showFamilies ? `Listado de Familias - Centro ${centerId}` : `Listado de Personas - Centro ${centerId}`;

    // Encabezado
    doc.setFontSize(18);
    doc.text(title, 14, 16);
    doc.setFontSize(12);
    doc.text(`Fecha de descarga: ${currentDate}`, 14, 24);

    // Cabecera de la tabla con estilos
    const head = showFamilies
      ? [['Nombre Jefe/a de Hogar', 'RUT', 'Nº Integrantes']]
      : [['Nombre', 'RUT', 'Fecha Ingreso', 'Fecha Salida', 'Edad', 'Género', 'Primer Apellido', 'Segundo Apellido', 'Nacionalidad', 'Estudia', 'Trabaja', 'Pérdida de Trabajo', 'Rubro', 'Discapacidad', 'Dependencia']];

    const body = showFamilies
      ? groups.map(g => [g.nombre_completo, g.rut, g.integrantes_grupo])
      : people.map(p => [
          `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ''}`,
          p.rut,
          p.fecha_ingreso,
          p.fecha_salida,
          p.edad,
          p.genero,
          p.primer_apellido,
          p.segundo_apellido,
          p.nacionalidad,
          p.estudia ? 'Sí' : 'No',
          p.trabaja ? 'Sí' : 'No',
          p.perdida_trabajo ? 'Sí' : 'No',
          p.rubro,
          p.discapacidad ? 'Sí' : 'No',
          p.dependencia ? 'Sí' : 'No',
        ]);

    autoTable(doc, {
      startY: 30,
      head: head,
      body: body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8, // Fuente más pequeña para las celdas
        halign: 'center',
        overflow: 'linebreak', // Ajustar texto largo
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fillColor: [240, 240, 240],
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8, // Reducir tamaño de fuente en los encabezados
      },
      columnStyles: {
        // Ajuste de las columnas para que se vean bien organizadas
        'Nombre': { cellWidth: 45 },
        'RUT': { cellWidth: 30 },
        'Fecha Ingreso': { cellWidth: 30 },
        'Fecha Salida': { cellWidth: 30 },
        'Edad': { cellWidth: 15 },
        'Género': { cellWidth: 15 },
        'Primer Apellido': { cellWidth: 25 },
        'Segundo Apellido': { cellWidth: 25 },
        'Nacionalidad': { cellWidth: 25 },
        'Estudia': { cellWidth: 15 },
        'Trabaja': { cellWidth: 15 },
        'Pérdida de Trabajo': { cellWidth: 20 },
        'Rubro': { cellWidth: 20 },
        'Discapacidad': { cellWidth: 20 },
        'Dependencia': { cellWidth: 20 },
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255], // Alternar color de fila
      },
      margin: { top: 20, left: 10, right: 10 },
    });


    doc.save(`Listado_${showFamilies ? 'Familias' : 'Personas'}_${centerId}.pdf`);
  };

 const exportToCSV = () => {
    const csv = showFamilies
      ? Papa.unparse(groups.map(g => ({
          nombre_completo: g.nombre_completo,
          rut: g.rut,
          integrantes_grupo: g.integrantes_grupo,
        })), {
          header: true,
          columns: ['nombre_completo', 'rut', 'integrantes_grupo'],
        })
      : Papa.unparse(people.map(p => ({
          nombre: p.nombre,
          rut: p.rut,
          fecha_ingreso: p.fecha_ingreso,
          fecha_salida: p.fecha_salida,
          edad: p.edad,
          genero: p.genero,
          primer_apellido: p.primer_apellido,
          segundo_apellido: p.segundo_apellido,
          nacionalidad: p.nacionalidad,
          estudia: p.estudia ? 'Sí' : 'No',
          trabaja: p.trabaja ? 'Sí' : 'No',
          perdida_trabajo: p.perdida_trabajo ? 'Sí' : 'No',
          rubro: p.rubro,
          discapacidad: p.discapacidad ? 'Sí' : 'No',
          dependencia: p.dependencia ? 'Sí' : 'No',
        }), {
          header: true,
          columns: [
            'nombre', 'rut', 'fecha_ingreso', 'fecha_salida', 'edad', 'genero', 
            'primer_apellido', 'segundo_apellido', 'nacionalidad', 'estudia', 
            'trabaja', 'perdida_trabajo', 'rubro', 'discapacidad', 'dependencia'
          ], 
        }));

    // Aquí nos aseguramos de que csv sea una cadena
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    // Usamos el archivo CSV generado para descargarlo
    saveAs(blob, `Listado_${showFamilies ? 'Familias' : 'Personas'}_${centerId}.csv`);
  };




  const fetchCenterCapacity = async (centerId: string) => {
    const response = await fetch(`http://localhost:4000/api/centers/${centerId}/capacity`);
    const data = await response.json();
    setCenterCapacity(data.capacity);
    setCurrentCapacity(data.current_capacity);
    setAvailableCapacity(data.available_capacity);
  };

  const fetchResidents = async () => {
    if (!centerId) return;
    try {
      const response = await fetch(`http://localhost:4000/api/centers/${centerId}/residents`);
      if (!response.ok) throw new Error('Error al obtener los residentes del centro');
      const data = await response.json();
      setGroups(data);
    } catch (err) {
      console.error('Error cargando residentes:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPeople = async () => {
    if (!centerId) return;
    try {
      const { nombre, rut, fechaIngreso, fechaSalida, edad, genero } = filters;
      const params = new URLSearchParams({
        nombre: nombre,
        rut: rut,
        fechaIngreso: fechaIngreso,
        fechaSalida: fechaSalida,
        edad: edad,
        genero: genero,
      }).toString();

      const response = await fetch(`http://localhost:4000/api/centers/${centerId}/people?${params}`);
      if (!response.ok) throw new Error('Error al obtener las personas del centro');
      const data = await response.json();
      setPeople(data);
    } catch (err) {
      console.error('Error cargando personas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const fetchActiveCenters = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/centers/${centerId}/active-centers`);
      if (!response.ok) throw new Error('No se pudieron cargar los centros activos');
      const data = await response.json();
      setActiveCenters(data);
    } catch (error) {
      console.error('Error al obtener centros activos:', error);
    }
  };

  useEffect(() => {
    if (centerId) {
      fetchCenterCapacity(centerId);
    }
    fetchResidents();
    fetchPeople(); // Llamada a la API de personas
    fetchActiveCenters();
  }, [centerId, filters]);

  const handleOpenExitModal = (resident: ResidentGroup) => {
    setResidentToExit(resident);
    setIsExitModalOpen(true);
  };

  const handleCloseExitModal = () => {
    setIsExitModalOpen(false);
    setExitReason('');
    setExitDate('');
    setDestinationActivationId('');
    fetchResidents();
    fetchCenterCapacity(centerId as string);
  };

  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentToExit || !residentToExit.family_id || !exitReason || !exitDate || (exitReason === 'traslado' && !destinationActivationId)) {
      alert('Debe completar todos los campos necesarios');
      return;
    }

    try {
      const url = `http://localhost:4000/api/family/${residentToExit.family_id}/depart`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departure_reason: exitReason,
          destination_activation_id: exitReason === 'traslado' ? destinationActivationId : null,
        }),
      });

      if (!response.ok) throw new Error('Error al registrar la salida');

      alert('Salida registrada con éxito');
      handleCloseExitModal();
    } catch (err) {
      console.error('Error registrando la salida:', err);
      alert(`Error: ${(err as Error).message}`);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const filteredPeople = people.filter(person => {
    return (
      (filters.nombre ? person.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) : true) &&
      (filters.rut ? person.rut.includes(filters.rut) : true) &&
      (filters.fechaIngreso ? person.fecha_ingreso.includes(filters.fechaIngreso) : true) &&
      (filters.fechaSalida ? person.fecha_salida.includes(filters.fechaSalida) : true) &&
      (filters.edad ? person.edad.toString().includes(filters.edad) : true) &&
      (filters.genero ? person.genero.toLowerCase().includes(filters.genero.toLowerCase()) : true)
    );
  });

  return (
    <div className="residents-container">
      <div className="residents-header">
        <button onClick={() => navigate(-1)} className="back-button">← Volver</button>
        <h2>Familias/Personas Albergadas - Centro {centerId}</h2>
      </div>

      <div className="capacity-info">
        <p><strong>Capacidad Total:</strong> {centerCapacity}</p>
        <p><strong>Ocupado:</strong> {currentCapacity}</p>
        <p><strong>Disponible:</strong> {availableCapacity}</p>
      </div>

      <div className="export-buttons" style={{ marginBottom: '1rem' }}>
        <button onClick={exportToPDF} className="export-btn">Exportar a PDF</button>
        <button onClick={exportToCSV} className="export-btn">Exportar a Excel</button>
      </div>

      {/* Botón para ver listado de familias y personas */}
      <div className="navigate-button">
        <button onClick={() => setShowFamilies(true)} className="navigate-btn">Ver Listado de Familias</button>
        <button onClick={() => setShowFamilies(false)} className="navigate-btn">Ver Listado de Personas</button>
      </div>

      {/* Mostrar el listado de familias */}
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
                {groups.map((resident, index) => (
                  <tr key={index}>
                    <td>{resident.nombre_completo}</td>
                    <td>{resident.rut}</td>
                    <td>{resident.integrantes_grupo}</td>
                    <td>
                      <button onClick={() => handleOpenExitModal(resident)} className="action-btn">Registrar Salida</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div>
          {/* Filtros para listado de personas */}
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

          {/* Mostrar el listado de personas */}
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
                {filteredPeople.map((person, index) => (
                  <tr key={index}>
                    <td>{`${person.nombre} ${person.primer_apellido} ${person.segundo_apellido || ''}`}</td>
                    <td>{person.rut}</td>
                    <td>{person.fecha_ingreso}</td>
                    <td>{person.fecha_salida}</td>
                    <td>{person.edad}</td>
                    <td>{person.genero}</td>
                    <td>{person.primer_apellido}</td>
                    <td>{person.segundo_apellido}</td>
                    <td>{person.nacionalidad}</td>
                    <td>{person.estudia ? 'Sí' : 'No'}</td>
                    <td>{person.trabaja ? 'Sí' : 'No'}</td>
                    <td>{person.perdida_trabajo ? 'Sí' : 'No'}</td>
                    <td>{person.rubro}</td>
                    <td>{person.discapacidad ? 'Sí' : 'No'}</td>
                    <td>{person.dependencia ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal de salida */}
      {isExitModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Registrar Salida de: {residentToExit?.nombre_completo}</h3>
            <form onSubmit={handleExitSubmit}>
              <div className="form-group">
                <label htmlFor="exitReason">Motivo de la salida:</label>
                <select id="exitReason" value={exitReason} onChange={(e) => setExitReason(e.target.value)} required>
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

              {exitReason === 'traslado' && (
                <div className="form-group">
                  <label htmlFor="destinationActivationId">Centro de destino:</label>
                  <select
                    id="destinationActivationId"
                    value={destinationActivationId}
                    onChange={(e) => setDestinationActivationId(e.target.value)}
                    required
                  >
                    <option value="">Seleccione centro...</option>
                    {activeCenters.map(center => (
                      <option key={center.activation_id} value={center.activation_id}>
                        {center.center_name} ({center.center_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseExitModal}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Salida</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterResidentsPage;
