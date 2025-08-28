// src/components/fibe/FibeWizard.tsx
import * as React from "react";
import { useState, useRef } from "react";
import { Box, Stepper, Step, StepLabel, Typography, Button } from "@mui/material";
import StepHogar from "./StepHogar";
import StepGrupoFamiliar from "./StepGrupoFamiliar";
import StepResumen from "./StepResumen";
import type { FormData, StepHandle } from "../../types/fibe";
import { initialData } from "../../types/fibe";

import "./FibePage.css";

export default function FibeMultiStepForm({ onSubmit }: { onSubmit?: (data: FormData) => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const [data, setData] = useState<FormData>(initialData);

  const hogarRef = useRef<StepHandle>(null);
  const grupoRef = useRef<StepHandle>(null);

  const steps = ["Hogar", "Grupo familiar", "Comprobación"];

  const tryNext = () => {
    // Validación por paso
    if (activeStep === 0 && hogarRef.current && !hogarRef.current.validate()) return;
    if (activeStep === 1 && grupoRef.current && !grupoRef.current.validate()) return;

    if (activeStep < steps.length - 1) {
      setActiveStep((s) => s + 1);
    } else {
      onSubmit ? onSubmit(data) : console.log("SUBMIT =>", data);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 980, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Registro FIBE – Hogar y Grupo Familiar
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((s) => (
          <Step key={s}><StepLabel>{s}</StepLabel></Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <StepHogar
          ref={hogarRef}
          value={data.hogar}
          onChange={(patch) => setData((prev) => ({ ...prev, hogar: { ...prev.hogar, ...patch } }))}
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
        <Button className="nav-link nav-link--prev"  onClick={() => setActiveStep((s) => Math.max(0, s - 1))} disabled={activeStep === 0}>
          Atrás
        </Button>
        <Button className="nav-link nav-link--next" onClick={tryNext}> 
          {activeStep === steps.length - 1 ? "Enviar" : "Siguiente"}
        </Button>
      </Box>
    </Box>
  );
}

