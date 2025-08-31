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

interface ActiveCenter {
  activation_id: number;
  center_id: string;
  center_name: string;
}

const CenterResidentsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ResidentGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitReason, setExitReason] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [residentToExit, setResidentToExit] = useState<ResidentGroup | null>(null);
  const [destinationActivationId, setDestinationActivationId] = useState('');
  const [activeCenters, setActiveCenters] = useState<ActiveCenter[]>([]);

  const [centerCapacity, setCenterCapacity] = useState<number>(0);
  const [currentCapacity, setCurrentCapacity] = useState<number>(0);
  const [availableCapacity, setAvailableCapacity] = useState<number>(0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Listado de Personas - Centro ${centerId}`, 14, 16);

    autoTable(doc, {
      startY: 20,
      head: [['Nombre Jefe/a de Hogar', 'RUT', 'Nº Integrantes']],
      body: groups.map(g => [g.nombre_completo, g.rut, g.integrantes_grupo]),
    });

    doc.save(`Listado_Personas_${centerId}.pdf`);
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(groups, {
      header: true,
      columns: ['nombre_completo', 'rut', 'integrantes_grupo']
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Listado_Personas_${centerId}.csv`);
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
    fetchActiveCenters(); // ← Esta es la línea nueva
  }, [centerId]);

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

  return (
    <div className="residents-container">
      <div className="residents-header">
        <button onClick={() => navigate(-1)} className="back-button">← Volver</button>
        <h2>Personas Albergadas - Centro {centerId}</h2>
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

      {groups.length === 0 ? (
        <p>No hay personas registradas actualmente en este centro.</p>
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
