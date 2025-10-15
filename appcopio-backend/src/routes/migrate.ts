import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../config/db';

const router = Router();

// Endpoint protegido para ejecutar la migración
// IMPORTANTE: Eliminar este endpoint después de usarlo o protegerlo adecuadamente
router.post('/migrate-zones', async (req, res) => {
  try {
    // Verificar un token de seguridad (configúralo en .env como MIGRATION_SECRET)
    const secret = req.headers['x-migration-secret'];
    if (secret !== process.env.MIGRATION_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // OMZ Zonas
    // En producción, la ruta es relativa al directorio raíz del proyecto
    const omzZonesPath = path.join(__dirname, '../../../appcopio_frontend2/public/data/omz_zones.json');
    
    // Verificar si el archivo existe
    if (!fs.existsSync(omzZonesPath)) {
      return res.status(400).json({ 
        error: 'Archivo omz_zones.json no encontrado',
        path: omzZonesPath,
        __dirname,
        cwd: process.cwd()
      });
    }

    const omzZones = JSON.parse(fs.readFileSync(omzZonesPath, 'utf8'));
    
    let omzZonesCount = 0;
    for (const feature of omzZones.features) {
      await db.query(
        'INSERT INTO municipal_zones (name, type, geojson, icon, color) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name, type) DO NOTHING',
        [
          feature.properties.name,
          'OMZ',
          feature,
          feature.properties.icon || null,
          feature.properties['icon-color'] || null
        ]
      );
      omzZonesCount++;
    }

    // OMZ Offices
    const omzOfficesPath = path.join(__dirname, '../../../appcopio_frontend2/public/data/omz_offices1.json');
    
    if (!fs.existsSync(omzOfficesPath)) {
      return res.status(400).json({ 
        error: 'Archivo omz_offices1.json no encontrado',
        path: omzOfficesPath,
        __dirname,
        cwd: process.cwd()
      });
    }

    const omzOffices = JSON.parse(fs.readFileSync(omzOfficesPath, 'utf8'));
    
    let omzOfficesCount = 0;
    for (const feature of omzOffices.features) {
      await db.query(
        'INSERT INTO municipal_zones (name, type, geojson, icon, color) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name, type) DO NOTHING',
        [
          feature.properties.name,
          'OMZ_OFFICE',
          feature,
          feature.properties.icon || null,
          feature.properties['icon-color'] || null
        ]
      );
      omzOfficesCount++;
    }

    res.json({ 
      success: true,
      message: 'Migración completada',
      details: {
        omzZones: omzZonesCount,
        omzOffices: omzOfficesCount
      }
    });
  } catch (error) {
    console.error('Error en migración:', error);
    res.status(500).json({ 
      error: 'Error en la migración',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
