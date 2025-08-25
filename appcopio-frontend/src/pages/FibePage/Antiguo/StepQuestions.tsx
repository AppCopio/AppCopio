import React from "react";
import type { Field, TextField, MultiSelectField, LikertField } from "./question-types";
import "./StepQuestions.css";

type Props = {
  title: string;
  fields: Field[];
  values: Record<string, any>;   // tu objeto 'data'
  errors?: Record<string, string | null>;
  touched?: Record<string, boolean>;
  onChange: (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      | { target: { name: string; value: any } } // synthetic para arrays/checkboxes
  ) => void;
  onBlur?: (name: string) => void; // para marcar touched en el padre
};

export default function StepQuestions({
  title,
  fields,
  values,
  errors = {},
  touched = {},
  onChange,
  onBlur,
}: Props) {
  return (
    <div>
      <h2 className="">{title}</h2>

      <div className="form-row">
        {fields.map((f) => {
          const val = values[f.name];
          const showError = touched[f.name] && !!errors[f.name];
          const groupCls = `form-group ${f.colSpan === 2 ? "col-span-2" : ""}`;

          // helpers UI
          const renderError = () =>
            showError ? <div style={{ color: "#b91c1c", fontSize: ".85rem" }}>{errors[f.name]}</div> : null;

          const handleBlur = () => onBlur?.(f.name);

          switch (f.kind) {
            case "textarea": {
              const tf = f as TextField;
              return (
                <div key={f.name} className={groupCls}>
                  <label htmlFor={f.name} className="form-label">{f.label}</label>
                  <textarea
                    id={f.name}
                    name={f.name}
                    rows={tf.rows ?? 4}
                    placeholder={tf.placeholder}
                    value={val ?? ""}
                    onChange={onChange}
                    onBlur={handleBlur}
                    className="form-input"
                  />
                  {f.helpText && <small>{f.helpText}</small>}
                  {renderError()}
                </div>
              );
            }

            case "text":
            case "email":
            case "tel":
            case "number": {
              const tf = f as TextField;
              return (
                <div key={f.name} className={groupCls}>
                  <label htmlFor={f.name} className="form-label">{f.label}</label>
                  <input
                    id={f.name}
                    name={f.name}
                    type={tf.kind}
                    inputMode={tf.inputMode}
                    placeholder={tf.placeholder}
                    value={val ?? ""}
                    onChange={onChange}
                    onBlur={handleBlur}
                    className={`form-input${showError ? " input-error" : ""}`}
                  />
                  {f.helpText && <small>{f.helpText}</small>}
                  {renderError()}
                </div>
              );
            }

            case "select-one":
              return (
                <div key={f.name} className={groupCls}>
                  <label htmlFor={f.name} className="form-label">{f.label}</label>
                  <select
                    id={f.name}
                    name={f.name}
                    value={val ?? ""}
                    onChange={onChange}
                    onBlur={handleBlur}
                    className="form-input"
                  >
                    <option value="" disabled>
                      {"Selecciona..."}
                    </option>
                    {"options" in f &&
                      f.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                  {f.helpText && <small>{f.helpText}</small>}
                  {renderError()}
                </div>
              );

            case "radio":
              return (
                <div key={f.name} className={groupCls}>
                  <span className="form-label">{f.label}</span>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    {"options" in f &&
                      f.options.map((opt) => (
                        <label key={opt.value} style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
                          <input
                            type="radio"
                            name={f.name}
                            value={opt.value}
                            checked={val === opt.value}
                            onChange={onChange}
                            onBlur={handleBlur}
                          />
                          {opt.label}
                        </label>
                      ))}
                  </div>
                  {f.helpText && <small>{f.helpText}</small>}
                  {renderError()}
                </div>
              );

            case "multi": {
              const mf = f as MultiSelectField;
              const selected: string[] = Array.isArray(val) ? val : [];
              const limit = mf.maxSelected ?? Infinity;
              const reached = selected.length >= limit;

              return (
                <div key={f.name} className={groupCls}>
                  <span className="form-label">{f.label}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                    {mf.options.map((opt) => {
                      const checked = selected.includes(opt.value);
                      const disableThis = !checked && reached; // bloquéa extras al llegar al límite
                      return (
                        <label key={opt.value} style={{ display: "inline-flex", alignItems: "center", gap: ".5rem" }}>
                          <input
                            type="checkbox"
                            name={`${f.name}__${opt.value}`} // nombre técnico, hacemos synthetic event
                            checked={checked}
                            disabled={disableThis}
                            onChange={(e) => {
                              const next = checked
                                ? selected.filter((v) => v !== opt.value)
                                : [...selected, opt.value];
                              onChange({ target: { name: f.name, value: next } });
                            }}
                            onBlur={handleBlur}
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                  <small style={{ color: "#6b7280" }}>
                    {Number.isFinite(limit) ? `${selected.length}/${limit} seleccionadas` : `${selected.length} seleccionadas`}
                  </small>
                  {f.helpText && <div><small>{f.helpText}</small></div>}
                  {renderError()}
                </div>
              );
            }

            case "likert": {
              const lf = f as LikertField;
              const min = lf.min ?? 1;
              const max = lf.max ?? 5;
              const current = Number(val);
              return (
                <div key={f.name} className={groupCls}>
                  <span className="form-label">{f.label}</span>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
                      <label key={n} style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}>
                        <input
                          type="radio"
                          name={f.name}
                          value={n}
                          checked={current === n}
                          onChange={(e) => {
                            onChange({ target: { name: f.name, value: String(n) } });
                          }}
                          onBlur={handleBlur}
                        />
                        {lf.labels?.[n] ?? n}
                      </label>
                    ))}
                  </div>
                  {f.helpText && <small>{f.helpText}</small>}
                  {renderError()}
                </div>
              );
            }

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
