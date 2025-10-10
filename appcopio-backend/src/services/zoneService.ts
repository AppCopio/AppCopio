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

// Devuelve la zona OMZ correspondiente a un centro por su id
export async function getOmzZoneForCenter(centerId: string): Promise<{ zoneName: string|null, zoneData?: MunicipalZone|null }> {
  // Obtener centro
  const centerResult = await db.query('SELECT latitude, longitude FROM Centers WHERE center_id = $1', [centerId]);
  if (centerResult.rowCount === 0) return { zoneName: null };
  const { latitude, longitude } = centerResult.rows[0];
  if (latitude == null || longitude == null) return { zoneName: null };
  
  // Obtener zonas OMZ
  const zonesResult = await db.query("SELECT * FROM municipal_zones WHERE type = 'OMZ'");
  const omzZones: MunicipalZone[] = zonesResult.rows;

  // Importar turf
  const turf = require('@turf/turf');
  const pt = turf.point([longitude, latitude]);
  for (const zone of omzZones) {
    let geo = zone.geojson as any;
    if (geo && geo.type === 'Feature' && geo.geometry) {
      geo = geo.geometry;
    }
    if (!geo || !geo.type || !geo.coordinates) {
      continue;
    }
    if (geo.type === 'Polygon') {
      const poly = turf.polygon(geo.coordinates);
      const found = turf.booleanPointInPolygon(pt, poly);
      if (found) {
        return { zoneName: zone.name, zoneData: zone };
      }
    } else if (geo.type === 'MultiPolygon') {
      for (const coords of geo.coordinates) {
        const poly = turf.polygon(coords);
        const found = turf.booleanPointInPolygon(pt, poly);
        if (found) {
          return { zoneName: zone.name, zoneData: zone };
        }
      }
    }
  }
  return { zoneName: null };
}
