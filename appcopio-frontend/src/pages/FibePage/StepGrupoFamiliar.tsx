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

  /* * * * * * V A L I D A C I Ó N   C A M P O S   V A C Í O S * * * * * */
  const [validateTick, setValidateTick] = React.useState(-1); // para forzar validación en PersonFormCard

  React.useImperativeHandle(ref, () => ({
    validate: () => {
      if (personas.length < 1) return false;

      // Busca el primer índice inválido
      const firstBad = personas.findIndex((p, i) => {
        const reqOk =
          (p.rut?.trim() ?? "") !== "" &&
          (p.nombre?.trim() ?? "") !== "" &&
          (p.primer_apellido?.trim() ?? "") !== "" &&
          (p.nacionalidad ?? "") !== "" &&
          (p.genero ?? "") !== "" &&
          (p.edad !== "" && p.edad !== undefined && p.edad !== null);

        const parentescoOk = i === 0 ? true : (p.parentesco?.trim() ?? "") !== "";

        return !(reqOk && parentescoOk);
      });

      const allOk = firstBad === -1;

      if (!allOk) {
        // Fuerza mostrar errores en todas las tarjetas
        setValidateTick((t) => t + 1);
        const elId = `person-card-${firstBad}`;
        requestAnimationFrame(() => {
          document.getElementById(elId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }

      return allOk;
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
          forceValidate={validateTick}
        />
      ))}

      <Box display="flex" justifyContent="flex-end">
        <Button startIcon={<AddIcon />} variant="outlined" onClick={addPerson}>
          Agregar persona
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary">
        * Campos obligatorios.
      </Typography>
    </Box>
  );
});

export default StepGrupoFamiliar;
