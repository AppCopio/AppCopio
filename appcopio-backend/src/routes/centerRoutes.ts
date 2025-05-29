// src/routes/centerRoutes.ts
import { Router, Request, Response } from 'express';
import pool from '../config/db'; // Importamos nuestro pool de conexiones configurado

const router = Router(); // Creamos una instancia del Router de Express

// Definimos la ruta GET para '/' (que será montada en /api/centers)
// Esta ruta obtendrá todos los centros de la base de datos
router.get('/', async (req: Request, res: Response) => {
  try {
    // Usamos el pool para ejecutar una consulta SQL
    // 'SELECT * FROM Centers' obtiene todas las columnas de todos los registros en la tabla Centers
    // 'ORDER BY name ASC' ordena los resultados alfabéticamente por el nombre del centro
    const result = await pool.query('SELECT * FROM Centers ORDER BY name ASC');

    // Si la consulta es exitosa, result.rows contendrá un array de objetos, cada uno representando un centro
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener los centros desde la base de datos:', error);
    // Devolvemos un error 500 (Error Interno del Servidor) si algo sale mal
    if (error instanceof Error) {
        res.status(500).json({ message: 'Error interno del servidor al consultar los centros.', error: error.message });
    } else {
        res.status(500).json({ message: 'Error interno del servidor desconocido al consultar los centros.' });
    }
  }
});

// --- Futuras Rutas para Centros ---
// GET /api/centers/:id (Obtener un centro específico)
// POST /api/centers (Crear un nuevo centro)
// PUT /api/centers/:id (Actualizar un centro)
// DELETE /api/centers/:id (Eliminar un centro)
// PATCH /api/centers/:id/activate (Activar/Desactivar un centro)

export default router; // Exportamos el router para usarlo en index.ts