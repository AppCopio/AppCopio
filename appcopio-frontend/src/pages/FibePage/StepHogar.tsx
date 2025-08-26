// src/components/fibe/StepHogar.tsx
import * as React from "react";
import { Box, TextField, FormControl, Typography, FormHelperText, Chip } from "@mui/material";
import type { HouseholdData } from "../../types/family";
import type { NEEDS_OPTIONS as _O, StepHandle } from "../../types/fibe";
import { NEEDS_OPTIONS } from "../../types/fibe";

type Props = {
  value: HouseholdData;
  onChange: (patch: Partial<HouseholdData>) => void;
};

const StepHogar = React.forwardRef<StepHandle, Props>(({ value, onChange }, ref) => {
  const [folioError, setFolioError] = React.useState<string | null>(null);
  const [needsError, setNeedsError] = React.useState<string | null>(null);

  const handleNeedsChange = (next: string[]) => {
    onChange({ selectedNeeds: next });
    if (next.length > 3) setNeedsError("Solo puedes seleccionar hasta 3 opciones.");
    else setNeedsError(null);
  };


  const toggleNeed = (opt: string) => {
    const selected = value.selectedNeeds;
    const exists = selected.includes(opt);
    if (exists && selected.length === 1) {
      setNeedsError("Debes seleccionar al menos 1 opción.");
      return;
    }
    if (!exists && selected.length >= 3) {
      setNeedsError("Solo puedes seleccionar hasta 3 opciones.");
      return;
    }
    const next = exists ? selected.filter(n => n !== opt) : [...selected, opt];
    handleNeedsChange(next);
  };


React.useImperativeHandle(ref, () => ({
  validate: () => {
    const folioOk = value.fibeFolio.trim() !== "";
    const needsOk = value.selectedNeeds.length <= 3;

    setFolioError(folioOk ? null : "Debes ingresar el folio FIBE.");
    if (value.selectedNeeds.length < 1) {
      setNeedsError("Debes seleccionar al menos 1 opción.");
    } else if (value.selectedNeeds.length > 3) {
      setNeedsError("Solo puedes seleccionar hasta 3 opciones.");
    } else {
      setNeedsError(null);
    }
    return folioOk && needsOk;
  },
}));


  return (
    <Box display="grid" gap={2}>
      <TextField
        label="Folio FIBE"
        required
        value={value.fibeFolio}
        onChange={(e) => {
          onChange({ fibeFolio: e.target.value });
          if (folioError) setFolioError(null);
        }}
        error={Boolean(folioError)}
        helperText={folioError ?? " "}
        fullWidth
      />

      <TextField
        label="Observaciones"
        value={value.observations}
        onChange={(e) => onChange({ observations: e.target.value })}
        fullWidth
        multiline
        minRows={3}
      />

      <FormControl component="fieldset" fullWidth error={Boolean(needsError)}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Necesidades (máx. 3)
        </Typography>

        {/* Chips seleccionables en grilla */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
            gap: 1,
          }}
        >
          {NEEDS_OPTIONS.map((opt) => {
            const selected = value.selectedNeeds.includes(opt);
            return (
              <Chip
                key={opt}
                label={opt}
                variant={selected ? "filled" : "outlined"}
                color={selected ? "primary" : "default"}
                onClick={() => toggleNeed(opt)}
                disabled={!selected && value.selectedNeeds.length >= 3}
                clickable
                sx={{ justifyContent: "flex-start" }} // el texto no queda centrado
              />
            );
          })}
        </Box>

        <FormHelperText>
          {needsError ?? `${value.selectedNeeds.length}/3 seleccionadas`}
        </FormHelperText>
      </FormControl>


    </Box>
  );
});

export default StepHogar;
