import * as React from "react";
import { useState, useRef, useMemo, useCallback } from "react";
import {
  Toolbar,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Button,
} from "@mui/material";

import StepHogar from "@/pages/FibePage/StepHogar";
import StepGrupoFamiliar from "@/pages/FibePage/StepGrupoFamiliar";
import StepResumen from "@/pages/FibePage/StepResumen";

import type { FormData, StepHandle } from "@/types/fibe";
import { initialData } from "@/types/fibe";

import "./FibePage.css";

type Props = {
  onSubmit?: (data: FormData) => void | Promise<void>;
  disabled?: boolean;
};

export default function FibeMultiStepForm({ onSubmit, disabled }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [data, setData] = useState<FormData>(initialData);

  const hogarRef = useRef<StepHandle>(null);
  const grupoRef = useRef<StepHandle>(null);

  const steps = useMemo(
    () => ["Datos FIBE", "Información grupo familiar", "Comprobación de datos"],
    []
  );

  const handleBack = useCallback(() => {
    setActiveStep((s) => Math.max(0, s - 1));
  }, []);

  const tryNext = useCallback(async () => {
    if (disabled) return;

    // Validación por paso
    if (activeStep === 0 && hogarRef.current && !hogarRef.current.validate()) return;
    if (activeStep === 1 && grupoRef.current && !grupoRef.current.validate()) return;

    // Avanza o envía
    if (activeStep < steps.length - 1) {
      setActiveStep((s) => s + 1);
    } else {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        // fallback de debug si aún no conectas el submit real
        // eslint-disable-next-line no-console
        console.log("SUBMIT =>", data);
      }
    }
  }, [activeStep, data, disabled, onSubmit, steps.length]);

  return (
    <Box sx={{ width: "100%", maxWidth: 980, mx: "auto" }}>
      <Toolbar />
      <Typography variant="titlePage" sx={{ mb: 2 }}>
        Registro FIBE – Hogar y Grupo Familiar
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((s) => (
          <Step key={s}>
            <StepLabel>{s}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <StepHogar
          ref={hogarRef}
          value={data.hogar}
          onChange={(patch) =>
            setData((prev) => ({ ...prev, hogar: { ...prev.hogar, ...patch } }))
          }
        />
      )}

      {activeStep === 1 && (
        <StepGrupoFamiliar
          ref={grupoRef}
          personas={data.personas}
          onChangeAll={(next) => setData((prev) => ({ ...prev, personas: next }))}
        />
      )}

      {activeStep === 2 && <StepResumen data={data} />}

      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 5, mt: 3 }}>
        <Button
          className="outlineGray"
          onClick={handleBack}
          disabled={activeStep === 0 || disabled}
        >
          Atrás
        </Button>
        <Button className="bare" onClick={tryNext} disabled={disabled}>
          {activeStep === steps.length - 1 ? "Enviar" : "Siguiente"}
        </Button>
      </Box>
    </Box>
  );
}
