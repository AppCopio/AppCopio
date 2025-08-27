// src/pages/NeedsFormPage/NeedsFormPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Importar useAuth
import { addRequestToOutbox } from '../../utils/offlineDb';
import { registerForSync } from '../../utils/syncManager';
import './NeedsFormPage.css';

const NeedsFormPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const { user } = useAuth(); // Obtener el usuario y token del contexto
  const apiUrl = import.meta.env.VITE_API_URL;

  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Media');
  const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !user) return;
    setIsSubmitting(true);

    const request = {
      url: `${apiUrl}/updates`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ CAMBIO 2: Accedemos al token a través de user.token
        'Authorization': `Bearer ${user?.token}` 
      },
      body: {
        center_id: centerId,
        description,
        urgency,
        requested_by: user.user_id 
      },
    };

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(request.body),
      });
      if (!response.ok) {
        throw new Error('No se pudo enviar la solicitud');
      }
      alert('Solicitud registrada con éxito');
      setDescription('');
      setUrgency('Media');
    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
      if (!navigator.onLine) {
        alert('Estás sin conexión. La solicitud se guardó y se enviará cuando te conectes.');
        addRequestToOutbox(request);
        // ✅ CAMBIO: Usamos una etiqueta de sincronización coherente
        registerForSync('sync-updates');
      } else {
        alert('Error al enviar la solicitud. Intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="needs-page">
      <h3>Crear Solicitud de Actualización (Centro {centerId})</h3>
      <p className="instructions">Reporta necesidades de recursos o cualquier otra actualización importante.</p>

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