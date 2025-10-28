// PARA USARLO, en consola: npx ts-node scripts/migrate_zones.ts
//Script para migrar las zonas desde los archivos JSON ala base de datos
//pueden poner cualquier zona u oficina nueva en los JSON y correr este script, asi es mas facil
import fs from 'fs';
import path from 'path';
import db from '../src/config/db';

async function migrateZones() {
  // OMZ Zonas
  const omzZonesPath = path.join(__dirname, '../../appcopio_frontend2/public/data/omz_zones.json');
  const omzZones = JSON.parse(fs.readFileSync(omzZonesPath, 'utf8'));
  for (const feature of omzZones.features) {
    await db.query(
      'INSERT INTO municipal_zones (name, type, geojson, icon, color) VALUES ($1, $2, $3, $4, $5)',
      [
        feature.properties.name,
        'OMZ',
        feature,
        feature.properties.icon || null,
        feature.properties['icon-color'] || null
      ]
    );
  }

  // OMZ Offices
  const omzOfficesPath = path.join(__dirname, '../../appcopio_frontend2/public/data/omz_offices1.json');
  const omzOffices = JSON.parse(fs.readFileSync(omzOfficesPath, 'utf8'));
  for (const feature of omzOffices.features) {
    await db.query(
      'INSERT INTO municipal_zones (name, type, geojson, icon, color) VALUES ($1, $2, $3, $4, $5)',
      [
        feature.properties.name,
        'OMZ_OFFICE',
        feature,
        feature.properties.icon || null,
        feature.properties['icon-color'] || null
      ]
    );
  }
  console.log('Migración completada.');
}

migrateZones().then(() => process.exit(0));
