import * as React from "react";
import {
  Card, CardContent, Box, Typography, IconButton, TextField, MenuItem,
  FormGroup, FormControlLabel, Checkbox,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import DeleteIcon from "@mui/icons-material/Delete";

import type { Gender, Nationality, Person } from "@/types/person";
import { parentescoOpciones } from "@/types/fibe";
import { cleanRut, formatRut, isValidRut } from "@/utils/rut";

type Props = {
  person: Person;
  index: number;
  onChange: (index: number, patch: Partial<Person>) => void;
  onRemove: (index: number) => void;
  isRemovable: boolean;
  forceValidate?: number;
  isRutDuplicated?: boolean;
};

export default function PersonFormCard({
  person,
  index,
  onChange,
  onRemove,
  isRemovable,
  forceValidate,
  isRutDuplicated,
}: Props) {
  const isHead = index === 0;

  // Requeridos
  const required = {
    rut: true,
    nombre: true,
    primer_apellido: true,
    nacionalidad: true,
    genero: true,
    edad: true,
    parentesco: !isHead,
  };

  const [touched, setTouched] = React.useState({
    rut: false,
    nombre: false,
    primer_apellido: false,
    nacionalidad: false,
    genero: false,
    edad: false,
    parentesco: false,
  });

  const markTouched = (k: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [k]: true }));

  const isEmpty = (v: any) =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "");

  // Validación forzada (por submit padre)
  const lastValidateTickRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (forceValidate === undefined) return;
    if (lastValidateTickRef.current === null) {
      lastValidateTickRef.current = forceValidate;
      return;
    }
    if (forceValidate !== lastValidateTickRef.current) {
      lastValidateTickRef.current = forceValidate;
      setTouched((t) => ({
        ...t,
        rut: true,
        nombre: true,
        primer_apellido: true,
        nacionalidad: true,
        genero: true,
        edad: true,
        parentesco: isHead ? t.parentesco : true,
      }));
    }
  }, [forceValidate, isHead]);

  // RUT
  const rutDVInvalid = React.useMemo(() => {
    const s = cleanRut(person.rut || "");
    if (!touched.rut || s.length < 2) return false;
    return !isValidRut(s);
  }, [touched.rut, person.rut]);

  const rutDupError = !!isRutDuplicated && !isEmpty(person.rut) && !rutDVInvalid;

  // Errores
  const errors = {
    rut: required.rut && isEmpty(person.rut),
    rutDV: rutDVInvalid,
    rutDup: rutDupError,
    nombre: required.nombre && isEmpty(person.nombre),
    primer_apellido: required.primer_apellido && isEmpty(person.primer_apellido),
    nacionalidad: required.nacionalidad && isEmpty(person.nacionalidad),
    genero: required.genero && isEmpty(person.genero),
    edad: required.edad && (person.edad === "" || Number.isNaN(person.edad)),
    parentesco: required.parentesco && isEmpty(person.parentesco),
  };

  return (
    <Card id={`person-card-${index}`} variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1">
            Persona {index + 1} {isHead ? "(Jefe de hogar)" : ""}
          </Typography>
          {isRemovable && (
            <IconButton
              aria-label="Eliminar persona"
              onClick={() => onRemove(index)}
              sx={{
                bgcolor: "#0c3a80",
                color: "#fff",
                "&:hover": { bgcolor: "#686868" },
              }}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>

        {/* === Grid layout === */}
        <Box sx={{ display: "grid", gap: 1 }}>
          {/* Fila 1 */}
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
              "& .field": { width: "100%" },
            }}
          >
            <TextField
              className="field"
              label="RUT"
              value={person.rut}
              onChange={(e) => {
                const formatted = formatRut(e.target.value);
                onChange(index, { rut: formatted });
                markTouched("rut");
              }}
              onBlur={() => markTouched("rut")}
              required={required.rut}
              inputProps={{ inputMode: "numeric", pattern: "[0-9kK\\.-]*" }}
              placeholder="12.345.678-5"
              error={touched.rut && (errors.rut || errors.rutDV || errors.rutDup)}
              helperText={
                touched.rut
                  ? errors.rut
                    ? "Ingresa el RUT."
                    : errors.rutDV
                    ? "RUT inválido."
                    : errors.rutDup
                    ? "RUT duplicado en el grupo."
                    : " "
                  : " "
              }
            />

            <TextField
              className="field"
              label="Nombre"
              value={person.nombre}
              onChange={(e) => onChange(index, { nombre: e.target.value })}
              onBlur={() => markTouched("nombre")}
              required={required.nombre}
              error={touched.nombre && errors.nombre}
              helperText={touched.nombre && errors.nombre ? "Ingresa el nombre." : " "}
            />

            <TextField
              className="field"
              label="Primer apellido"
              value={person.primer_apellido}
              onChange={(e) => onChange(index, { primer_apellido: e.target.value })}
              onBlur={() => markTouched("primer_apellido")}
              required={required.primer_apellido}
              error={touched.primer_apellido && errors.primer_apellido}
              helperText={touched.primer_apellido && errors.primer_apellido ? "Ingresa el primer apellido." : " "}
            />

            <TextField
              className="field"
              label="Segundo apellido"
              value={person.segundo_apellido}
              onChange={(e) => onChange(index, { segundo_apellido: e.target.value })}
            />
          </Box>

          {/* Fila 2 */}
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
              "& .field": { width: "100%" },
            }}
          >
            <TextField
              className="field"
              select
              label="Nacionalidad"
              value={person.nacionalidad}
              onChange={(e) => onChange(index, { nacionalidad: e.target.value as Nationality | "" })}
              onBlur={() => markTouched("nacionalidad")}
              required={required.nacionalidad}
              error={touched.nacionalidad && errors.nacionalidad}
              helperText={touched.nacionalidad && errors.nacionalidad ? "Selecciona la nacionalidad." : " "}
            >
              <MenuItem value={"CH"}>Chilena</MenuItem>
              <MenuItem value={"EXT"}>Extranjera</MenuItem>
            </TextField>

            <TextField
              className="field"
              select
              label="Género"
              value={person.genero}
              onChange={(e) => onChange(index, { genero: e.target.value as Gender | "" })}
              onBlur={() => markTouched("genero")}
              required={required.genero}
              error={touched.genero && errors.genero}
              helperText={touched.genero && errors.genero ? "Selecciona el género." : " "}
            >
              <MenuItem value={"F"}>F</MenuItem>
              <MenuItem value={"M"}>M</MenuItem>
              <MenuItem value={"Otro"}>Otro</MenuItem>
            </TextField>

            <TextField
              className="field"
              label="Edad"
              type="number"
              inputProps={{ min: 0 }}
              value={person.edad}
              onChange={(e) => {
                const v = e.target.value;
                onChange(index, { edad: v === "" ? "" : Number(v) });
              }}
              onBlur={() => markTouched("edad")}
              required={required.edad}
              error={touched.edad && errors.edad}
              helperText={touched.edad && errors.edad ? "Ingresa la edad." : " "}
            />

            {isHead ? (
              <TextField className="field" label="Parentesco" value="Jefe de hogar" disabled />
            ) : (
              <Autocomplete
                freeSolo
                options={parentescoOpciones.filter((p) => p !== "Jefe de hogar")}
                value={person.parentesco || ""}
                inputValue={person.parentesco || ""}
                onChange={(_, newValue) => onChange(index, { parentesco: (newValue ?? "") as string })}
                onInputChange={(_, newInputValue) => onChange(index, { parentesco: newInputValue })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    className="field"
                    label="Parentesco"
                    required={required.parentesco}
                    onBlur={() => markTouched("parentesco")}
                    error={touched.parentesco && errors.parentesco}
                    helperText={touched.parentesco && errors.parentesco ? "Ingresa el parentesco." : " "}
                  />
                )}
              />
            )}

            <TextField
              className="field"
              label="Rubro"
              value={person.rubro}
              onChange={(e) => onChange(index, { rubro: e.target.value })}
            />
          </Box>
        </Box>

        {/* Checkboxes */}
        <Box
          sx={{
            mt: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            columnGap: 2,
            rowGap: 1,
            "& .MuiFormControlLabel-root": { m: 0 },
          }}
        >
          <FormGroup row>
            <FormControlLabel
              control={<Checkbox checked={!!person.estudia} onChange={(e) => onChange(index, { estudia: e.target.checked })} />}
              label="Estudia"
            />
            <FormControlLabel
              control={<Checkbox checked={!!person.trabaja} onChange={(e) => onChange(index, { trabaja: e.target.checked })} />}
              label="Trabaja"
            />
            <FormControlLabel
              control={<Checkbox checked={!!person.perdida_trabajo} onChange={(e) => onChange(index, { perdida_trabajo: e.target.checked })} />}
              label="Pérdida de trabajo"
            />
            <FormControlLabel
              control={<Checkbox checked={!!person.discapacidad} onChange={(e) => onChange(index, { discapacidad: e.target.checked })} />}
              label="Discapacidad"
            />
            <FormControlLabel
              control={<Checkbox checked={!!person.dependencia} onChange={(e) => onChange(index, { dependencia: e.target.checked })} />}
              label="Dependencia"
            />
          </FormGroup>
        </Box>
      </CardContent>
    </Card>
  );
}
