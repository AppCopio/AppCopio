import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import './NeedsFormPage.css';

const NeedsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Media');
  // Estado para gestionar el proceso de envío.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Previene envíos múltiples si la petición anterior aún está en curso.
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          center_id: centerId,
          description,
          urgency,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo enviar la solicitud');
      }

      alert('Incidencia registrada con éxito');
      // Resetea el formulario tras un envío exitoso.
      setDescription('');
      setUrgency('Media');
    } catch (error) {
      console.error('Error al enviar la incidencia:', error);
      alert('Error al enviar la solicitud. Intenta nuevamente.');
    } finally {
      // Se asegura de reactivar el formulario sin importar el resultado.
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
            cols={50}
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            disabled={isSubmitting} // Deshabilita el campo durante el envío.
          ></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="urgency">Nivel de Urgencia:</label><br />
          <select 
            id="urgency"
            value={urgency}
            onChange={e => setUrgency(e.target.value)}
            disabled={isSubmitting} // Deshabilita el campo durante el envío.
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        {/* El botón se deshabilita y cambia su texto durante el envío. */}
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      </form>
    </div>
  );
};

export default NeedsPage;