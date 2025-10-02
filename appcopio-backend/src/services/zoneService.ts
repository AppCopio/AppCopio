import db from '../config/db';
import type { MunicipalZone } from '../types/zone';

export async function getAllZones(type?: 'OMZ' | 'OMZ_OFFICE'): Promise<MunicipalZone[]> {
  const result = await db.query(
    'SELECT * FROM municipal_zones' + (type ? ' WHERE type = $1' : ''),
    type ? [type] : []
  );
  return result.rows;
}

export async function getZoneById(id: number): Promise<MunicipalZone | null> {
  const result = await db.query('SELECT * FROM municipal_zones WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// Puedes agregar create, update, delete si lo necesitas
