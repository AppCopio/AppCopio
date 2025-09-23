-- Actualización automática de updated_at al modificar registros
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Actualización automática de updated_at al modificar registros en las tablas relevantes
CREATE TRIGGER bu_dataset_fields_updated_at
BEFORE UPDATE ON DatasetFields
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bu_dataset_records_updated_at
BEFORE UPDATE ON DatasetRecords
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bu_dataset_fieldOpt_updated_at
BEFORE UPDATE ON DatasetFieldOptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bu_dataset_recordOpVal_updated_at
BEFORE UPDATE ON DatasetRecordOptionValues
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bu_dataset_recordRelations_updated_at
BEFORE UPDATE ON DatasetRecordRelations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bu_dataset_recordCoreRelations_updated_at
BEFORE UPDATE ON DatasetRecordCoreRelations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bu_dataset_templateFields_updated_at
BEFORE UPDATE ON TemplateFields
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bu_dataset_template_updated_at
BEFORE UPDATE ON Templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

