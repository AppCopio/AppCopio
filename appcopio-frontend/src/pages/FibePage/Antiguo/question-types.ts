export type Option = { label: string; value: string };

type BaseRules = {
  required?: boolean | string;                 // true o mensaje
  pattern?: { value: RegExp; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  custom?: (value: any, values: Record<string, any>) => string | null; // validación libre
};

type BaseField = {
  name: string;
  label: string;
  kind: "text" | "email" | "tel" | "likert" | "multi" | "select-one";
  helpText?: string;
  colSpan?: 1 | 2;           // usa tu .col-span-2
  rules?: BaseRules;
  initial?: any; // valor inicial
};

export type TextField = BaseField & {
  kind: "text" | "email" | "tel" | "number" | "textarea";
  placeholder?: string;
  rows?: number;             // textarea
  inputMode?: "text" | "numeric" | "decimal";
};

export type SelectOneField = BaseField & {
  kind: "select-one" | "radio";
  options: Option[];
  placeholder?: string;      // para <select>
};

export type MultiSelectField = BaseField & {
  kind: "multi";
  options: Option[];
  maxSelected?: number;      // límite de selección
};

export type LikertField = BaseField & {
  kind: "likert";
  min?: number;              // default 1
  max?: number;              // default 5
  labels?: Partial<Record<number, string>>; // etiquetas opcionales por número
};

export type Field = TextField | SelectOneField | MultiSelectField | LikertField;
