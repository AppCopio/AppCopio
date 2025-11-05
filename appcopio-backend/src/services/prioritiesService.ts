// ============================================================================
// 1. IMPORTS Y CONFIGURACIÓN
// ============================================================================
import pool from "../config/db";
import { Db } from "../types/db";

type Priority = 'bajo' | 'medio' | 'alto';

// ============================================================================
// 2. FUNCIONES DEL SERVICIO (Consultas a la BD)
// ============================================================================

export async function getPrioritiesByCenter(centerId: string) {
  const query = `
    SELECT
      cip.center_id,
      cip.item_id,
      cip.priority,
      cip.updated_at,
      u.username AS updated_by_user
      FROM CenterItemPriority cip
    LEFT JOIN Users u ON cip.updated_by = u.user_id
    WHERE cip.center_id = $1
    ORDER BY cip.updated_at DESC
  `;
  const { rows } = await pool.query(query, [centerId]);
  return rows;
}

export async function upsertPriority(
  centerId: string,
  itemId: string,
  priority: Priority,
  updatedBy: string
) {
  const query = `
    INSERT INTO CenterItemPriority (center_id, item_id, priority, updated_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (center_id, item_id)
    DO UPDATE SET
      priority = EXCLUDED.priority,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING *
  `;
  const { rows } = await pool.query(query, [centerId, itemId, priority, updatedBy]);
  return rows[0];
}


export async function deletePriority(centerId: string, itemId: string) {
  const query = `DELETE FROM CenterItemPriority WHERE center_id = $1 AND item_id = $2`;
  await pool.query(query, [centerId, itemId]);
}


export async function getItemsWithPriorities(centerId: string) {
  const query = `
    SELECT 
      p.item_id,
      p.name AS item_name,
      p.category_id,
      c.name AS category_name,
      COALESCE(cip.priority, 'bajo') AS priority,
      cip.updated_at,
      u.username AS updated_by_user
    FROM Products p
    LEFT JOIN Categories c
      ON p.category_id = c.category_id
    LEFT JOIN CenterInventoryItems cii
      ON cii.center_id = $1 AND cii.item_id = p.item_id
    LEFT JOIN CenterItemPriority cip
      ON cip.center_id = $1 AND cip.item_id = p.item_id
    LEFT JOIN Users u 
      ON cip.updated_by = u.user_id
    WHERE cii.center_id = $1
    ORDER BY cip.priority DESC, c.name;
  `;
  const { rows } = await pool.query(query, [centerId]);
  return rows;
}