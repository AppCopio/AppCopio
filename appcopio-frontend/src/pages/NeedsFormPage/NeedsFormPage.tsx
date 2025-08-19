// src/pages/NeedsFormPage/NeedsFormPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { addRequestToOutbox } from '../../utils/offlineDb';
// Se corrige la importación al nuevo archivo que acabamos de crear
import { registerForSync } from '../../utils/syncManager'; 
import './NeedsFormPage.css';

const NeedsFormPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Media');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const request = {
      url: `${apiUrl}/incidents`,
      method: 'POST',
      body: {
        center_id: centerId,
        description,
        urgency,
      },
    };

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      if (!response.ok) {
        throw new Error('No se pudo enviar la solicitud');
      }
      alert('Incidencia registrada con éxito');
      setDescription('');
      setUrgency('Media');
    } catch (error) {
      console.error('Error al enviar la incidencia:', error);
      if (!navigator.onLine) {
        alert('Estás sin conexión. La incidencia se guardó y se enviará cuando te conectes.');
        addRequestToOutbox(request);
        // Se llama a la función importada con una etiqueta específica para las incidencias
        registerForSync('sync-incidents');
      } else {
        alert('Error al enviar la solicitud. Intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="needs-page">
      <h3>Crear Solicitud o Incidencia (Centro {centerId})</h3>
      <p className="instructions">Reporta necesidades de recursos o cualquier otra incidencia importante.</p>

      <form onSubmit={handleSubmit} className="needs-form">
        <div className="form-group">
          <label htmlFor="description">Descripción:</label><br />
          <textarea 
            id="description" 
            rows={4} 
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            disabled={isSubmitting}
          ></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="urgency">Nivel de Urgencia:</label><br />
          <select 
            id="urgency"
            value={urgency}
            onChange={e => setUrgency(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      </form>
    </div>
  );
};

export default NeedsFormPage;