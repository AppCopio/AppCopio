// src/pages/CenterResidentsPage/CenterResidentsPage.tsx
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
}



const CenterResidentsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string}>();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ResidentGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
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

    fetchResidents();
  }, [centerId]);

  if (isLoading) return <div className="residents-container">Cargando residentes...</div>;

  if (error) return (
    <div className="residents-container">
      <p className="error-message">{error}</p>
      <button onClick={() => navigate(-1)} className="back-button">Volver</button>
    </div>
  );

  return (
    <div className="residents-container">
      <div className="residents-header">
        <button onClick={() => navigate(-1)} className="back-button">← Volver</button>
        <h2>Personas Albergadas - Centro {centerId}</h2>
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
            </tr>
          </thead>
          <tbody>
            {groups.map((resident, index) => (
              <tr key={index}>
                <td>{resident.nombre_completo}</td>
                <td>{resident.rut}</td>
                <td>{resident.integrantes_grupo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CenterResidentsPage;
