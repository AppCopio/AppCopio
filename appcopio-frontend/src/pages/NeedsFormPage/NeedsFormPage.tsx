// src/pages/NeedsFormPage/NeedsFormPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './NeedsFormPage.css';

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
        
        const token = user?.token;
        if (!isReady || !token || !user) {
            setError("Error inesperado: Intento de envío en estado no válido.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch(`${apiUrl}/updates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    center_id: centerId,
                    title: title.trim(),
                    description: description.trim(),
                    urgency: urgency,
                    status: 'Pendiente',
                    created_by: user.user_id
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ msg: 'Error desconocido.' }));
                throw new Error(errorData.msg || `Error HTTP ${response.status}`);
            }

            alert('¡Solicitud registrada con éxito!');
            navigate(`/center/${centerId}/updates`);

        } catch (err) {
            console.error('Error al enviar la solicitud:', err);
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    }, [isReady, user, centerId, navigate, title, description, urgency, apiUrl]);


    // --- 5. RENDERIZADO CONDICIONAL ---
    if (!isReady) {
        return (
            <div className="needs-page">
                <h3>Crear Solicitud de Actualización</h3>
                <p>Cargando información de la sesión y del centro...</p>

                {/* --- AÑADE ESTE PANEL DE DEPURACIÓN AQUÍ TAMBIÉN --- */}
                <div style={{ background: '#ffdddd', color: 'black', border: '2px solid red', padding: '10px', marginTop: '20px', fontFamily: 'monospace' }}>
                    <h3>Panel de Depuración (Estado de Carga)</h3>
                    <p>isAuthLoading: <strong>{String(isAuthLoading)}</strong></p>
                    <p>user existe?: <strong>{user ? 'Sí' : 'No'}</strong></p>
                    <p>centerId: <strong>{centerId || 'undefined'}</strong></p>
                    <p>isReady (Guardián): <strong>{String(isReady)}</strong></p>
                </div>
            </div>
        );
    }

    return (
        <div className="needs-page">
            <h3>Crear Solicitud de Actualización (Centro {centerId})</h3>
            <p className="instructions">Reporta necesidades de recursos o cualquier otra actualización importante.</p>

            {/* --- AÑADE ESTE PANEL DE DEPURACIÓN AQUÍ --- */}
            <div style={{ background: '#eee', color: 'black', padding: '10px', marginBottom: '20px', fontFamily: 'monospace' }}>
                <h3>Panel de Depuración en Vivo (Estado Listo)</h3>
                <p>isAuthLoading: <strong>{String(isAuthLoading)}</strong></p>
                <p>user existe?: <strong>{user ? 'Sí' : 'No'}</strong></p>
                <p>token existe?: <strong>{user?.token ? 'Sí' : 'No'}</strong></p>
                <p>centerId: <strong>{centerId || 'undefined'}</strong></p>
                <p>isReady (Guardián): <strong>{String(isReady)}</strong></p>
            </div>

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