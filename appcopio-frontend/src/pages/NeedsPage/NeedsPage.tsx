// src/pages/NeedsPage/NeedsPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
// import './NeedsPage.css'; // Si necesitas estilos específicos

const NeedsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Media');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Enviar la solicitud/incidencia a la API
    alert(`Centro ${centerId} solicita:\nDescripción: ${description}\nUrgencia: ${urgency}`);
    setDescription('');
  };

  return (
    <div>
      <h3>Crear Solicitud o Incidencia (Centro {centerId})</h3>
      <p>Reporta necesidades de recursos o cualquier otra incidencia importante.</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="description">Descripción:</label><br />
          <textarea 
            id="description" 
            rows={4} 
            cols={50}
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          ></textarea>
        </div>
        <div>
          <label htmlFor="urgency">Nivel de Urgencia:</label><br />
          <select 
            id="urgency"
            value={urgency}
            onChange={e => setUrgency(e.target.value)}
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        <button type="submit">Enviar Solicitud</button>
      </form>
      {/* Aquí podrías mostrar una lista de solicitudes existentes */}
    </div>
  );
};

export default NeedsPage;