// src/routes/centerRoutes.ts
// src/routes/centerRoutes.ts
import { Request, Response, Router } from 'express';
import pool from '../config/db';

const router = Router();

interface RequestParams {
  id: string;
}

// GET (funciona)
router.get('/', async (req: Request, res: Response) => {
  try {
    const centersResult = await pool.query(
      'SELECT center_id, name, address, type, capacity, is_active, latitude, longitude FROM Centers'
    );
    const centers = centersResult.rows;
    const centersWithFullness = await Promise.all(centers.map(async (center) => {
            try {
                // Sumar la cantidad de todos los ítems asociados a este centro en CenterInventories.
                // COALESCE(SUM(quantity), 0) asegura que si no hay ítems, el total sea 0 en lugar de NULL.
                const inventoryResult = await pool.query(
                    'SELECT COALESCE(SUM(quantity), 0) AS total_quantity FROM CenterInventories WHERE center_id = $1',
                    [center.center_id]
                );

                const totalQuantity = parseInt(inventoryResult.rows[0].total_quantity, 10); // Convertir a número entero

                let fullnessPercentage = 0;
                // Definir la capacidad efectiva del centro para el cálculo del porcentaje.
                // Si la capacidad definida en la DB es 0 (ej. para centros de acopio sin una capacidad numérica fija),
                // asumimos una capacidad predeterminada de 1000 unidades para el cálculo.
                const effectiveCapacity = center.capacity > 0 ? center.capacity : 1000; 

                if (effectiveCapacity > 0) { // Evitar división por cero
                    fullnessPercentage = (totalQuantity / effectiveCapacity) * 100;
                }

                // Devolver un nuevo objeto de centro que incluya todas sus propiedades originales
                // más el nuevo campo 'fullnessPercentage'.
                return {
                    ...center,
                    fullnessPercentage: parseFloat(fullnessPercentage.toFixed(2)) // Redondear a 2 decimales para limpieza
                };
            } catch (innerError) {
                // Si ocurre un error al procesar un centro individual (ej. problema con la consulta de inventario),
                // lo registramos y lo relanzamos para que el bloque catch principal lo maneje.
                console.error(`Error al procesar el centro ${center.center_id}:`, innerError);
                throw innerError; 
            }
        }));
        res.json(centersWithFullness);
  } catch (error) {
    console.error('Error al obtener centros con porcentaje de llenado (general):', error);
        // Asegúrate de que solo se envíe una respuesta por solicitud.
        if (!res.headersSent) { 
            res.status(500).json({ message: 'Error interno del servidor al cargar centros.' });
        }
  }
});

// GET /api/centers/:id - Obtener un centro específico por su ID
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Centers WHERE center_id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Centro no encontrado.' });
      return; // Añadido para consistencia y claridad
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error al obtener el centro ${id}:`, error);
    if (error instanceof Error) {
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    } else {
        res.status(500).json({ message: 'Error interno del servidor desconocido.' });
    }
  }
});

// POST /api/centers - Crear un nuevo centro
router.post('/', async (req: Request, res: Response) => {
  const {
    center_id, name, address, type, capacity, is_active = false, latitude, longitude
  } = req.body;

  if (!center_id || !name || !type) {
    res.status(400).json({ message: 'center_id, name, y type son campos requeridos.' });
    return;
  }
  if (!['Acopio', 'Albergue'].includes(type)) {
    res.status(400).json({ message: 'El tipo de centro debe ser "Acopio" o "Albergue".' });
    return;
  }

  try {
    const newCenter = await pool.query(
      `INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [center_id, name, address, type, capacity || 0, is_active, latitude, longitude]
    );
    res.status(201).json(newCenter.rows[0]);
  } catch (error) {
    console.error('Error al crear el centro:', error);
    if (error instanceof Error && (error as any).code === '23505') {
        res.status(409).json({ message: `El center_id '${center_id}' ya existe.`, error: error.message });
    } else if (error instanceof Error) {
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    } else {
        res.status(500).json({ message: 'Error interno del servidor desconocido.' });
    }
  }
});

// PUT /api/centers/:id - Actualizar un centro existente
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const {
    name, address, type, capacity, is_active, latitude, longitude
  } = req.body;

  if (!name || !type) {
    res.status(400).json({ message: 'name y type son campos requeridos para la actualización.' });
    return;
  }
  if (type && !['Acopio', 'Albergue'].includes(type)) {
    res.status(400).json({ message: 'El tipo de centro debe ser "Acopio" o "Albergue".' });
    return;
  }

  try {
    const updatedCenter = await pool.query(
      `UPDATE Centers
       SET name = $1, address = $2, type = $3, capacity = $4, is_active = $5, latitude = $6, longitude = $7, updated_at = CURRENT_TIMESTAMP
       WHERE center_id = $8
       RETURNING *`,
      [name, address, type, capacity, is_active, latitude, longitude, id]
    );

    if (updatedCenter.rows.length === 0) {
      res.status(404).json({ message: 'Centro no encontrado para actualizar.' });
      return;
    }
    res.status(200).json(updatedCenter.rows[0]);
  } catch (error) {
    console.error(`Error al actualizar el centro ${id}:`, error);
    if (error instanceof Error) {
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    } else {
        res.status(500).json({ message: 'Error interno del servidor desconocido.' });
    }
  }
});

// DELETE /api/centers/:id - Eliminar un centro (tu versión corregida)
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  try {
    const deleteOp = await pool.query('DELETE FROM Centers WHERE center_id = $1 RETURNING *', [id]);

    if (deleteOp.rowCount === 0) { // o deleteOp.rows.length === 0
      res.status(404).json({ message: 'Centro no encontrado para eliminar.' });
      return; 
    }
    res.status(204).send(); // Correcto para DELETE exitoso sin contenido que devolver
  } catch (error) {
    console.error(`Error al eliminar el centro ${id}:`, error);
    if (error instanceof Error) {
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    } else {
        res.status(500).json({ message: 'Error interno del servidor desconocido.' });
    }
  }
});

// PATCH /api/centers/:id/status - Activar o desactivar un centro
router.patch('/:id/status', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body; 

    if (typeof isActive !== 'boolean') {
        res.status(400).json({ message: 'El campo "isActive" es requerido y debe ser un booleano.' });
        return;
    }

    try {
        const updatedCenter = await pool.query(
            'UPDATE Centers SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE center_id = $2 RETURNING *',
            [isActive, id]
        );

        if (updatedCenter.rows.length === 0) {
            res.status(404).json({ message: 'Centro no encontrado para actualizar estado.' });
            return;
        }
        res.status(200).json(updatedCenter.rows[0]);
    } catch (error) {
        console.error(`Error al actualizar estado del centro ${id}:`, error);
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
        } else {
            res.status(500).json({ message: 'Error interno del servidor desconocido.' });
        }
    }
});

// GET /api/centers/:centerId/inventory - Obtener el inventario de un centro
router.get('/:centerId/inventory', async (req: Request<{ centerId: string }>, res: Response) => {
  const { centerId } = req.params;
  try {
    const query = `
      SELECT ci.item_id, ci.quantity, p.name, p.category 
      FROM CenterInventories AS ci JOIN Products AS p ON ci.item_id = p.item_id 
      WHERE ci.center_id = $1 ORDER BY p.name`;
    const result = await pool.query(query, [centerId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error al obtener inventario para el centro ${centerId}:`, error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// POST /api/centers/:centerId/inventory - Añadir un item al inventario
router.post('/:centerId/inventory', async (req: Request<{ centerId: string }>, res: Response) => {
  const { centerId } = req.params;
  const { itemName, category, quantity } = req.body;

  if (!itemName || !category || !quantity || quantity <= 0) {
    res.status(400).json({ message: 'Se requieren itemName, category y una quantity mayor a 0.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let productResult = await client.query('SELECT item_id FROM Products WHERE name = $1', [itemName]);
    let itemId;
    if (productResult.rows.length === 0) {
      const newProductResult = await client.query('INSERT INTO Products (name, category) VALUES ($1, $2) RETURNING item_id', [itemName, category]);
      itemId = newProductResult.rows[0].item_id;
    } else {
      itemId = productResult.rows[0].item_id;
    }
    const inventoryResult = await client.query(
      `INSERT INTO CenterInventories (center_id, item_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (center_id, item_id) DO UPDATE SET quantity = CenterInventories.quantity + $3, last_updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [centerId, itemId, quantity]
    );
    await client.query('COMMIT');
    res.status(201).json(inventoryResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error en transacción de inventario para el centro ${centerId}:`, error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
});

// PUT /api/centers/:centerId/inventory/:itemId - Actualizar la cantidad de un item
router.put('/:centerId/inventory/:itemId', async (req: Request<{ centerId: string; itemId: string }>, res: Response) => {
  const { centerId, itemId } = req.params;
  const { quantity } = req.body;

  if (typeof quantity !== 'number' || quantity < 0) {
    res.status(400).json({ message: 'Se requiere una "quantity" numérica y mayor o igual a 0.' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE CenterInventories SET quantity = $1, last_updated_at = CURRENT_TIMESTAMP WHERE center_id = $2 AND item_id = $3 RETURNING *`,
      [quantity, centerId, itemId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'No se encontró el item en el inventario de este centro.' });
      return;
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error al actualizar el inventario para el centro ${centerId}:`, error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

router.delete('/:centerId/inventory/:itemId', async (req: Request, res: Response) => {
  const { centerId, itemId } = req.params;

  try {
    const deleteOp = await pool.query(
      'DELETE FROM CenterInventories WHERE center_id = $1 AND item_id = $2',
      [centerId, itemId]
    );

    if (deleteOp.rowCount === 0) {
      res.status(404).json({ message: 'No se encontró el item en el inventario de este centro para eliminar.' });
      return;
    }
    res.status(204).send(); // 204 No Content indica éxito sin devolver datos
  } catch (error) {
    console.error(`Error al eliminar item del inventario para el centro ${centerId}:`, error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

export default router;