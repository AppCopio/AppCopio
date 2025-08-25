// src/routes/centerRoutes.ts
// src/routes/centerRoutes.ts
import { Request, Response, Router } from 'express';
import pool from '../config/db';

const router = Router();

const itemRatiosPerPerson: { [key: string]: number } = {
    'Alimentos y Bebidas': 1,      // 5 unidades de alimentos/bebidas por persona
    'Ropa de Cama y Abrigo': 1,    // 2 unidades de ropa de cama/abrigo por persona
    'Higiene Personal': 1,         // 3 unidades de higiene personal por persona
    'Mascotas': 1,                 // 1 unidad de comida para mascotas por persona
    'Herramientas': 1              // Ejemplo de otra categoría
};

interface RequestParams {
  id: string;
}

// GET (funciona)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Intentar primero con center_id, si falla intentar con id
    let centersResult;
    try {
      centersResult = await pool.query(
        'SELECT center_id, name, address, type, capacity, is_active, operational_status, public_note, latitude, longitude FROM centers'
      );
    } catch (firstError) {
      console.log('Intentando con columna "id" en lugar de "center_id"');
      centersResult = await pool.query(
        'SELECT id as center_id, name, address, type, capacity, is_active, operational_status, public_note, latitude, longitude FROM centers'
      );
    }
    const centers = centersResult.rows;
    const centersWithFullness = await Promise.all(centers.map(async (center) => {
            try {
                // Si la capacidad del centro es 0 o indefinida, no podemos calcular un porcentaje significativo.
                // Asumimos que para centros de acopio sin capacidad definida, pueden apuntar a 100 personas como objetivo.
                // PARA ALBERGUES, la 'capacity' ya es el número de personas.
                const peopleCapacity = center.capacity // Capacidad en número de personas

                // Si por alguna razón la capacidad sigue siendo 0, el llenado es 0%
                if (peopleCapacity === 0) {
                    console.log(`--- Centro: ${center.name} (${center.center_id}) ---`);
                    console.log(`Capacidad en personas: ${peopleCapacity}`);
                    console.log(`Porcentaje de llenado calculado: 0% (Capacidad 0)`);
                    return { ...center, fullnessPercentage: 0 };
                }
                // Obtener el inventario del centro agrupado por categoría de producto
                const inventoryByCategoryResult = await pool.query(
                    `SELECT p.category, COALESCE(SUM(i.quantity), 0) AS category_quantity
                     FROM inventory i
                     JOIN products p ON i.product_id = p.id
                     WHERE i.center_id = $1
                     GROUP BY p.category`,
                    [center.center_id]
                );

                const inventoryResult = await pool.query(
                    'SELECT COALESCE(SUM(quantity), 0) AS total_quantity FROM inventory WHERE center_id = $1',
                    [center.center_id]
                );

                const inventoryMap = new Map<string, number>();
                inventoryByCategoryResult.rows.forEach(row => {
                    inventoryMap.set(row.category, parseInt(row.category_quantity, 10));
                });

                let totalSufficiencyScore = 0;
                let contributingCategoriesCount = 0;

                // Calcular la suficiencia para cada categoría relevante
                for (const category in itemRatiosPerPerson) {
                    if (Object.prototype.hasOwnProperty.call(itemRatiosPerPerson, category)) {
                        const requiredPerPerson = itemRatiosPerPerson[category];
                        // Cantidad total de esta categoría necesaria para la capacidad del centro.
                        const neededForCategory = peopleCapacity * requiredPerPerson; 
                        
                        // Cantidad real que el centro tiene de esta categoría.
                        const actualQuantity = inventoryMap.get(category) || 0;

                        if (neededForCategory > 0) { // Evitar división por cero si no se necesita nada de esta categoría
                            // Calcula la suficiencia para esta categoría (ej. 0.5 si tienen la mitad de lo necesario).
                            // Se limita a 1.0 (100%) para que un exceso de un ítem no dispare el porcentaje completo.
                            const categorySufficiency = Math.min(actualQuantity / neededForCategory, 1.0);
                            totalSufficiencyScore += categorySufficiency;
                            
                            // CAMBIO CLAVE: Solo incrementamos el contador si esta categoría tiene inventario real
                            // Esto evita que las categorías sin ítems arrastren el promedio hacia abajo.
                            if (actualQuantity > 0) { 
                                contributingCategoriesCount++;
                            }
                        }
                    }
                }

                let overallFullnessPercentage = 0;
                if (contributingCategoriesCount > 0) { // Evitar división por cero si no hay categorías que contribuyan
                    overallFullnessPercentage = (totalSufficiencyScore / contributingCategoriesCount) * 100;
                } else if (totalSufficiencyScore > 0) { 
                    // Caso borde: Si totalSufficiencyScore > 0 pero contributingCategoriesCount es 0
                    // (ej. neededForCategory era 0 para todas las categorías, pero había algo de actualQuantity)
                    // Consideramos que está 100% lleno en cuanto a las necesidades definidas.
                    overallFullnessPercentage = 100; 
                }

                // *** INICIO DE DEBUG: Imprimir valores por consola para cada centro ***
                console.log(`\n--- Centro: ${center.name} (${center.center_id}) ---`);
                console.log(`Tipo: ${center.type}, Capacidad (personas): ${peopleCapacity}`);
                console.log(`Inventario por Categoría:`, Array.from(inventoryMap.entries()));
                console.log(`Ratios de Necesidad por Persona:`, itemRatiosPerPerson);
                console.log(`Suficiencia Total del Centro (Puntaje): ${totalSufficiencyScore.toFixed(2)}`);
                //console.log(`Categorías consideradas: ${categoriesConsideredCount}`);
                console.log(`Porcentaje de llenado CALCULADO: ${overallFullnessPercentage.toFixed(2)}%`);
                // *** FIN DE DEBUG ***

                return {
                    ...center,
                    fullnessPercentage: parseFloat(overallFullnessPercentage.toFixed(2))
                };
            } catch (innerError) {
                console.error(`Error al procesar el centro ${center.center_id}:`, innerError);
                // Si hay un error interno, devolvemos el centro con 0% de llenado para que no se caiga la app,
                // pero el error se registrará.
                return { ...center, fullnessPercentage: 0 }; 
            }
        }));
        res.json(centersWithFullness); 
    } catch (error) {
        console.error('Error al obtener centros con porcentaje de llenado (general):', error);
        if (!res.headersSent) { 
            res.status(500).json({ message: 'Error interno del servidor al cargar centros.' });
        }
    }
});

// GET /api/centers/:id - Obtener un centro específico por su ID
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  try {
    // Usar la estructura real de la tabla (campo 'id', no 'center_id')
    const result = await pool.query('SELECT *, id as center_id FROM centers WHERE id = $1', [id]);

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
  if (type && !['Centro de Acopio', 'Hospital de Campaña', 'Refugio'].includes(type)) {
    res.status(400).json({ message: 'El tipo de centro debe ser "Centro de Acopio", "Hospital de Campaña" o "Refugio".' });
    return;
  }

  try {
    // Intentar primero con center_id, si falla intentar con id
    let updatedCenter;
    try {
      updatedCenter = await pool.query(
        `UPDATE centers
         SET name = $1, address = $2, type = $3, capacity = $4, is_active = $5, latitude = $6, longitude = $7, updated_at = CURRENT_TIMESTAMP
         WHERE center_id = $8
         RETURNING *`,
        [name, address, type, capacity, is_active, latitude, longitude, id]
      );
    } catch (firstError) {
      console.log('Intentando actualizar con columna "id" en lugar de "center_id"');
      updatedCenter = await pool.query(
        `UPDATE centers
         SET name = $1, address = $2, type = $3, capacity = $4, is_active = $5, latitude = $6, longitude = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *, id as center_id`,
        [name, address, type, capacity, is_active, latitude, longitude, id]
      );
    }

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
    // Intentar primero con center_id, si falla intentar con id
    let deleteOp;
    try {
      deleteOp = await pool.query('DELETE FROM centers WHERE center_id = $1 RETURNING *', [id]);
    } catch (firstError) {
      console.log('Intentando eliminar con columna "id" en lugar de "center_id"');
      deleteOp = await pool.query('DELETE FROM centers WHERE id = $1 RETURNING *', [id]);
    }

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
        // Usar la estructura real de la tabla (campo 'id', no 'center_id')
        const updatedCenter = await pool.query(
            'UPDATE centers SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *, id as center_id',
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

// PATCH /api/centers/:id/operational-status - Actualizar estado operativo del centro
router.patch('/:id/operational-status', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const { operationalStatus, publicNote } = req.body;

    // Validar que el estado operativo sea uno de los valores permitidos
    const validStatuses = ['Abierto', 'Cerrado Temporalmente', 'Capacidad Máxima'];
    if (!operationalStatus || !validStatuses.includes(operationalStatus)) {
        res.status(400).json({ 
            message: 'El campo "operationalStatus" es requerido y debe ser uno de: ' + validStatuses.join(', ') 
        });
        return;
    }

    try {
        // Primero verificar que el centro existe
        let centerExists;
        try {
            centerExists = await pool.query(
                'SELECT center_id FROM centers WHERE center_id = $1',
                [id]
            );
        } catch (firstError) {
            console.log('Intentando verificar existencia con columna "id" en lugar de "center_id"');
            centerExists = await pool.query(
                'SELECT id as center_id FROM centers WHERE id = $1',
                [id]
            );
        }

        if (centerExists.rows.length === 0) {
            res.status(404).json({ message: 'Centro no encontrado.' });
            return;
        }

        // Si no está "Cerrado Temporalmente", limpiar la nota pública
        const noteToSave = operationalStatus === 'Cerrado Temporalmente' ? publicNote : null;

        // Actualizar el estado operativo y nota pública
        let updatedCenter;
        try {
            updatedCenter = await pool.query(
                `UPDATE centers 
                 SET operational_status = $1, public_note = $2, updated_at = CURRENT_TIMESTAMP 
                 WHERE center_id = $3 
                 RETURNING center_id, name, address, type, capacity, is_active, operational_status, public_note, latitude, longitude, updated_at`,
                [operationalStatus, noteToSave, id]
            );
        } catch (firstError) {
            console.log('Intentando actualizar estado operativo con columna "id" en lugar de "center_id"');
            updatedCenter = await pool.query(
                `UPDATE centers 
                 SET operational_status = $1, public_note = $2, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3 
                 RETURNING id as center_id, name, address, type, capacity, is_active, operational_status, public_note, latitude, longitude, updated_at`,
                [operationalStatus, noteToSave, id]
            );
        }

        res.status(200).json({
            message: 'Estado operativo actualizado exitosamente',
            center: updatedCenter.rows[0]
        });
    } catch (error) {
        console.error(`Error al actualizar estado operativo del centro ${id}:`, error);
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
    // Usar la estructura real de las tablas
    const query = `
      SELECT i.product_id as item_id, i.quantity, p.name, p.category 
      FROM inventory AS i 
      JOIN products AS p ON i.product_id = p.id 
      WHERE i.center_id = $1 
      ORDER BY p.name`;
    
    const result = await pool.query(query, [centerId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error al obtener inventario para el centro ${centerId}:`, error);
    res.status(500).json({ 
      message: 'Error al obtener el inventario del centro',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
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