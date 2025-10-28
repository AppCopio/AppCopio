import * as React from "react";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import type { Person } from "@/types/person";
import type { StepHandle } from "@/types/fibe";
import { initialPerson } from "@/types/fibe";
import PersonFormCard from "@/pages/FibePage/PersonFormCard";
import { cleanRut } from "@/utils/rut";

type Props = {
  personas: Person[];
  onChangeAll: (next: Person[]) => void;
};

const StepGrupoFamiliar = React.forwardRef<StepHandle, Props>(
  ({ personas, onChangeAll }, ref) => {
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

    // Normaliza RUT usando helper compartido
    const normalizeRut = React.useCallback((v: string) => cleanRut(v || ""), []);

    // Set con RUTs duplicados (normalizados)
    const dupRutSet = React.useMemo(() => {
      const counts = new Map<string, number>();
      personas.forEach((p) => {
        const s = normalizeRut(p.rut || "");
        if (!s) return;
        counts.set(s, (counts.get(s) || 0) + 1);
      });
      const dups = new Set<string>();
      counts.forEach((c, s) => {
        if (c > 1) dups.add(s);
      });
      return dups;
    }, [personas, normalizeRut]);

    // Tick para forzar validación en PersonFormCard
    const [validateTick, setValidateTick] = React.useState(-1);

    React.useImperativeHandle(ref, () => ({
      validate: () => {
        if (personas.length < 1) return false;

        // 1) Primer índice con requeridos vacíos
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

        // 2) Primer índice con RUT duplicado (no vacío)
        const firstDup = personas.findIndex((p) => {
          const s = normalizeRut(p.rut || "");
          return s && dupRutSet.has(s);
        });

        const allOk = firstBad === -1 && firstDup === -1;

        if (!allOk) {
          setValidateTick((t) => t + 1);
          const target = firstBad !== -1 ? firstBad : firstDup;
          const elId = `person-card-${target}`;
          requestAnimationFrame(() => {
            document.getElementById(elId)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
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
            isRutDuplicated={dupRutSet.has(normalizeRut(p.rut || ""))}
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
  }
);

export default StepGrupoFamiliar;
