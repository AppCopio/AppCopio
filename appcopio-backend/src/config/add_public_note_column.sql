-- Agregar columna public_note a la tabla Centers
-- Esta columna almacenará notas públicas cuando el centro esté "Cerrado Temporalmente"

ALTER TABLE Centers 
ADD COLUMN IF NOT EXISTS public_note TEXT;
