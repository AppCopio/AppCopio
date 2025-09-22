// src/pages/NeedsFormPage/NeedsFormPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './NeedsFormPage.css';
import api from '../../lib/api';

const NeedsFormPage: React.FC = () => {
    // --- 1. OBTENCIÓN DE DATOS ---
    const { centerId } = useParams<{ centerId: string }>();
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useAuth();
    const apiUrl = import.meta.env.VITE_API_URL;

    // --- 2. ESTADOS DEL FORMULARIO ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [urgency, setUrgency] = useState('Media');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- 3. EL GUARDIÁN DE DATOS ---
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Este efecto vigila los datos asíncronos.
        // Solo cuando la autenticación haya terminado Y tengamos un usuario Y un centerId,
        // daremos la señal de que es seguro proceder.
        if (!isAuthLoading && user && centerId) {
            setIsReady(true);
        }
    }, [isAuthLoading, user, centerId]);

    // --- 4. MANEJADOR DE ENVÍO ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isReady || !user) {
            setError("Error inesperado: Intento de envío en estado no válido.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await api.post("/updates", {
            center_id: centerId,
            title: title.trim(),
            description: description.trim(),
            urgency,
            status: "Pendiente",
            created_by: user.user_id,
            });

            alert("¡Solicitud registrada con éxito!");
            navigate(`/center/${centerId}/updates`);
        } catch (err: any) {
            console.error("Error al enviar la solicitud:", err);
            const msg =
            err?.response?.data?.msg ||
            err?.response?.data?.message ||
            err?.message ||
            "Error desconocido.";
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, [isReady, user, centerId, navigate, title, description, urgency]);


    // --- 5. RENDERIZADO CONDICIONAL ---
    if (!isReady) {
        return (
            <div className="needs-page">
                <h3>Crear Solicitud de Actualización</h3>
                <p>Cargando información de la sesión y del centro...</p>
            </div>
        );
    }

    return (
        <div className="needs-page">
            <h3>Crear Solicitud de Actualización (Centro {centerId})</h3>
            <p className="instructions">Reporta necesidades de recursos o cualquier otra actualización importante.</p>

            <form onSubmit={handleSubmit} className="needs-form">
                <div className="form-group">
                    <label htmlFor="title">Título:</label><br />
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ej: Se necesitan pañales y leche"
                        required
                        disabled={isSubmitting}
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="description">Descripción:</label><br />
                    <textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Detalles, cantidades, urgencia..."
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

                {error && <p className="error-message">{error}</p>}
            </form>
        </div>
    );
};

export default NeedsFormPage;