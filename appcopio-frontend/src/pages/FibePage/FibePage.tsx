// src/pages/FibePage.tsx
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FibeMultiStepForm from "./FibeMultiStepForm";
import "./FibePage.css";

import { createFibeSubmission } from "../../services/fibeApi";
import type { FormData } from "../../types/fibe"; // ajusta la ruta si tu type vive en otro lado

export default function Page() {
  // Estado de envío (opcional, por UX)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: reemplazar por el activation_id real (de la vista/estado/URL)
  const activationId  = 1;

  /* // 1) De la query string: /admin/fibe?activation_id=123
  const [params] = useSearchParams();
  const activationId = useMemo(
    () => Number(params.get("activation_id")) || 0,
    [params]
  );
  */

  // onSubmit que recibe el payload del form (FormData) y dispara la transacción
  const handleSubmit = async (payload: FormData) => {
    setIsSubmitting(true);
    try {
      // Idempotencia opcional para reintentos seguros
      const idem = (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));

      const resp = await createFibeSubmission(
        { activation_id: activationId , data: payload },
        { idempotencyKey: idem }
      );

      console.log("Transacción FIBE OK:", resp);
      alert(`Familia creada. ID: ${resp.family_id}`);
      // TODO: navegar, limpiar formulario, etc.
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
      <FibeMultiStepForm onSubmit={handleSubmit} disabled={isSubmitting}/>
      {isSubmitting && (<div className="sending">Enviando datos…</div>)}
    </div>
  );
}
