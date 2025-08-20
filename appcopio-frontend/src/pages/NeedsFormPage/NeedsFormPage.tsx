import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { addRequestToOutbox } from '../../utils/offlineDb';
// NOTA: Asumo que ya creaste este archivo como te indiqué anteriormente.
// Si no, créalo en src/utils/syncManager.ts
import { registerForSync } from '../../utils/syncManager'; 
import './NeedsFormPage.css';

const NeedsPage: React.FC = () => {
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
      // --- LÓGICA OFFLINE CORREGIDA ---
      if (!navigator.onLine) {
        alert('Estás sin conexión. La incidencia se guardó y se enviará cuando te conectes.');
        addRequestToOutbox(request);
        registerForSync('sync-incidents'); // Usamos la etiqueta que el SW ahora entiende
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

export default NeedsPage; 