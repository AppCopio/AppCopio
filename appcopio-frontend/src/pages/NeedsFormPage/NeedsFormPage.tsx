import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createUpdateRequest } from "@/services/updates.service";
import type { UpdateCreateDTO } from "@/types/update";
import "./NeedsFormPage.css";

export default function NeedsFormPage() {
  // --- 1. OBTENCIÓN DE DATOS ---
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const { user, loadingAuth: isAuthLoading } = useAuth();

  // --- 2. ESTADOS DEL FORMULARIO ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("Media");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 3. EL GUARDIÁN DE DATOS ---
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user && centerId) {
      setIsReady(true);
    }
  }, [isAuthLoading, user, centerId]);

  // --- 4. MANEJADOR DE ENVÍO ---
  const abortRef = React.useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isReady || !user || !centerId) {
        setError("Error inesperado: Intento de envío en estado no válido.");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const payload: UpdateCreateDTO = {
          center_id: centerId,
          title: title.trim(),
          description: description.trim(),
          urgency,                           // tu UI sigue usando “Baja/Media/Alta”
          created_by: user.user_id,
          status: "pending",                 // ⚠️ backend espera "pending"
        };

        await createUpdateRequest(payload, controller.signal);

        alert("¡Solicitud registrada con éxito!");
        navigate(`/center/${centerId}/updates`);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        const msg =
          err?.response?.data?.msg ||
          err?.response?.data?.message ||
          err?.message ||
          "Error desconocido.";
        setError(msg);
      } finally {
        setIsSubmitting(false);
        abortRef.current = null;
      }
    },
    [isReady, user, centerId, navigate, title, description, urgency]
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

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
      <p className="instructions">
        Reporta necesidades de recursos o cualquier otra actualización importante.
      </p>

      <form onSubmit={handleSubmit} className="needs-form">
        <div className="form-group">
          <label htmlFor="title">Título:</label><br />
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles, cantidades, urgencia..."
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="urgency">Nivel de Urgencia:</label><br />
          <select
            id="urgency"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
        </button>

        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
}
