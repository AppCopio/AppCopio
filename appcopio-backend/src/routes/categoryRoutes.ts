import { Router, RequestHandler } from 'express';
import { QueryResult } from 'pg';
import pool from '../config/db'; // Usando la ruta correcta a tu BD

const router = Router();

// NUEVO: Obtener todas las categorías
const getAllCategoriesHandler: RequestHandler = async (req, res) => {
    try {
        const allCategories = await pool.query("SELECT * FROM Categories ORDER BY name ASC");
        res.json(allCategories.rows);
    } catch (err) {
        console.error('Error al obtener categorías:', err);
        res.status(500).send('Error del servidor');
    }
};

// MODIFICADO: Añadir una categoría
const addCategoryHandler: RequestHandler = async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ msg: 'El nombre de la categoría es requerido.' });
        return;
    }
    try {
        const newCategory = await pool.query(
            "INSERT INTO Categories (name) VALUES ($1) RETURNING *",
            [name.trim()]
        );
        res.status(201).json(newCategory.rows[0]);
    } catch (err: any) {
        if (err.code === '23505') { // Código de error para violación de constraint UNIQUE en PostgreSQL
            res.status(409).json({ msg: 'La categoría ya existe.' });
            return;
        }
        console.error('Error al añadir categoría:', err);
        res.status(500).send('Error del servidor');
    }
};

// MODIFICADO: Eliminar una categoría (ahora por ID)
const deleteCategoryHandler: RequestHandler = async (req, res) => {
    // El frontend ahora debería enviar el ID de la categoría
    const { id } = req.params; 
    try {
        const productsInCategory: QueryResult = await pool.query(
            "SELECT COUNT(*) FROM Products WHERE category_id = $1",
            [id]
        );
        if (productsInCategory?.rows?.[0] && parseInt(productsInCategory.rows[0].count, 10) > 0) {
            res.status(400).json({ msg: 'No se puede eliminar: la categoría tiene productos asociados.' });
            return;
        }
        await pool.query("DELETE FROM Categories WHERE category_id = $1", [id]);
        res.status(204).send();
    } catch (err) {
        console.error('Error al eliminar categoría:', err);
        res.status(500).send('Error del servidor');
    }
};

// Registro de las rutas en el enrutador
router.get('/', getAllCategoriesHandler);
router.post('/', addCategoryHandler);
router.delete('/:id', deleteCategoryHandler); // Ahora espera un ID

export default router;