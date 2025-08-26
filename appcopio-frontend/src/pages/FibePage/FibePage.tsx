// src/pages/FibePage.tsx
import { useState } from "react";
import FibeMultiStepForm from "./FibeMultiStepForm";
import "./FibePage.css";

import { createCompose } from "../../services/fibeApi";
import type { FormData } from "../../types/fibe"; // ajusta la ruta si tu type vive en otro lado

export default function Page() {
  // Estado de envío (opcional, por UX)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: reemplazar por el activation_id real (de la vista/estado/URL)
  const ACTIVATION_ID = 123;

  // onSubmit que recibe el payload del form (FormData) y dispara la transacción
  const handleSubmit = async (payload: FormData) => {
    setIsSubmitting(true);
    try {
      // Idempotencia opcional para reintentos seguros
      const idem = (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));

      const resp = await createCompose(
        { activation_id: ACTIVATION_ID, data: payload },
        { idempotencyKey: idem }
      );

      console.log("Transacción FIBE OK:", resp);
      alert(`Familia creada. ID: ${resp.family_id}`);
      // Aquí podrías redirigir, limpiar el formulario, etc.
      // navigate(`/familias/${resp.family_id}`)
    } catch (err: any) {
      console.error("Error FIBE:", err);
      alert(err?.message ?? "Error enviando FIBE");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <FibeMultiStepForm
        onSubmit={handleSubmit}
        // si tu componente soporta deshabilitado:
        disabled={isSubmitting}
      />
      {isSubmitting && (
        <div className="sending">Enviando datos…</div>
      )}
    </div>
  );
}
