// src/components/fibe/StepGrupoFamiliar.tsx
import * as React from "react";
import { Box, Button, Typography } from "@mui/material";
import type { Person } from "../../types/person";
import type { StepHandle } from "../../types/fibe";
import { initialPerson } from "../../types/fibe";
import PersonFormCard from "./PersonFormCard";
import { Add as AddIcon } from "@mui/icons-material";

type Props = {
  personas: Person[];
  onChangeAll: (next: Person[]) => void;
};

const StepGrupoFamiliar = React.forwardRef<StepHandle, Props>(({ personas, onChangeAll }, ref) => {
  const updatePerson = (idx: number, patch: Partial<Person>) => {
    const arr = [...personas];
    arr[idx] = { ...arr[idx], ...patch };
    if (idx === 0) arr[0].parentesco = "Jefe de hogar";
    onChangeAll(arr);
  };

  const addPerson = () => onChangeAll([...personas, initialPerson(false)]);

  const removePerson = (idx: number) => {
    const arr = personas.filter((_, i) => i !== idx);
    if (arr.length > 0) arr[0].parentesco = "Jefe de hogar";
    onChangeAll(arr.length ? arr : [initialPerson(true)]);
  };

  // Validación: al menos 1 persona con campos mínimos
  React.useImperativeHandle(ref, () => ({
    validate: () => {
      if (personas.length < 1) return false;
      const head = personas[0];
      const ok =
        head.rut.trim() !== "" &&
        head.nombre.trim() !== "" &&
        head.primer_apellido.trim() !== "" &&
        head.genero !== "" &&
        head.edad !== "";
      return ok;
    },
  }));

  return (
    <Box display="grid" gap={2}>
      {personas.map((p, i) => (
        <PersonFormCard
          key={i}
          person={p}
          index={i}
          onChange={updatePerson}
          onRemove={removePerson}
          isRemovable={i !== 0}
        />
      ))}

      <Box display="flex" justifyContent="flex-end">
        <Button startIcon={<AddIcon />} variant="outlined" onClick={addPerson}>
          Agregar persona
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary">
        * Debes completar RUT, Nombre, Primer apellido, Género y Edad del Jefe de hogar.
      </Typography>
    </Box>
  );
});

export default StepGrupoFamiliar;
