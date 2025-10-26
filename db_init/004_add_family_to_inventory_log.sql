-- Migration: Añadir columna family_id a InventoryLog para trazabilidad de entregas
-- Fecha: 2025-10-26
-- Descripción: Esta migración añade la capacidad de rastrear a qué grupo familiar 
-- se entregaron los recursos en las salidas de inventario (HDU Gestión de Inventario)

-- Verificar que la tabla existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'inventorylog'
    ) THEN
        RAISE EXCEPTION 'La tabla InventoryLog no existe';
    END IF;
END $$;

-- Añadir columna family_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventorylog' 
        AND column_name = 'family_id'
    ) THEN
        ALTER TABLE InventoryLog 
        ADD COLUMN family_id INT REFERENCES FamilyGroups(family_id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Columna family_id añadida exitosamente a InventoryLog';
    ELSE
        RAISE NOTICE 'La columna family_id ya existe en InventoryLog';
    END IF;
END $$;

-- Crear índice para mejorar rendimiento de consultas por familia
CREATE INDEX IF NOT EXISTS idx_inventorylog_family_id 
ON InventoryLog(family_id) 
WHERE family_id IS NOT NULL;

COMMENT ON COLUMN InventoryLog.family_id IS 'ID del grupo familiar destinatario en caso de salidas (SUB). NULL para entradas y ajustes.';
