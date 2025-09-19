import * as React from "react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import FibeMultiStepForm from "./FibeMultiStepForm";
import "./FibePage.css";

import { createFibeSubmission } from "@/services/fibe.service";
import type { FibeFormData, CreateFibeSubmissionDTO } from "@/types/fibe";
import { useActivation } from "@/contexts/ActivationContext";

export default function FibePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1) Intentamos sacar el activation_id desde el contexto
  const { activation } = useActivation();
  const activationIdFromCtx = activation?.activation_id;

  // 2) Fallback: querystring ?activation_id=123
  const [params] = useSearchParams();
  const activationIdFromQS = useMemo(
    () => Number(params.get("activation_id")) || undefined,
    [params]
  );

  // 3) Resolución final del activation_id (ctx > querystring)
  const activation_id = useMemo(
    () => activationIdFromCtx ?? activationIdFromQS,
    [activationIdFromCtx, activationIdFromQS]
  );

  const handleSubmit = async (payload: FibeFormData) => {
    if (!activation_id) {
      alert("Falta activation_id (no viene en contexto ni querystring).");
      return;
    }

    setIsSubmitting(true);
    try {
      // Idempotencia opcional para reintentos
      const idem = globalThis.crypto?.randomUUID?.() ?? String(Date.now());

      const dto: CreateFibeSubmissionDTO = {
        activation_id,
        data: payload,
      };

      const resp = await createFibeSubmission(dto, { idempotencyKey: idem });
      alert(`Familia creada. ID: ${resp.family_id}`);
      // TODO: navegar o limpiar formulario si corresponde
      // navigate(`/familias/${resp.family_id}`)
    } catch (err: any) {
      console.error("Error FIBE:", err);
      alert(err?.response?.data?.message || err?.message || "Error registrando FIBE");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <FibeMultiStepForm onSubmit={handleSubmit} disabled={isSubmitting} />
      {isSubmitting && <div className="sending">Enviando datos…</div>}
    </div>
  );
}
