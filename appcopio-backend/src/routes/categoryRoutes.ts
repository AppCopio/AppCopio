// src/routes/categoryRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
// CAMBIO: Importamos desde el nuevo servicio
import { getAllCategories, addCategory, deleteCategoryById, categoryHasProducts } from '../services/categoryService';

const router = Router();

// =================================================================
// 1. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

const listCategories: RequestHandler = async (req, res) => {
    try {
        // CAMBIO: El controlador ahora llama al servicio
        const categories = await getAllCategories(pool);
        res.json(categories);
    } catch (err) {
        console.error('Error en listCategories:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

const createCategory: RequestHandler = async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
        return;
    }
    try {
        // CAMBIO: El controlador ahora llama al servicio
        const newCategory = await addCategory(pool, name);
        res.status(201).json(newCategory);
    } catch (err: any) {
        if (err.code === '23505') { // UNIQUE VIOLATION
            res.status(409).json({ error: 'La categoría ya existe.' });
        } else {
            console.error('Error en createCategory:', err);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    }
};

const deleteCategory: RequestHandler = async (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) {
        res.status(400).json({ error: 'El ID de la categoría debe ser un número válido.' });
        return;
    }
    try {
        // CAMBIO: Lógica de negocio en el controlador, acceso a datos en el servicio
        const hasProducts = await categoryHasProducts(pool, categoryId);
        if (hasProducts) {
            res.status(409).json({ error: 'No se puede eliminar: la categoría tiene productos asociados.' });
            return;
        }

        const deletedCount = await deleteCategoryById(pool, categoryId);
        if (deletedCount === 0) {
            res.status(404).json({ error: 'La categoría no fue encontrada.' });
        } else {
            res.status(204).send();
        }
    } catch (err) {
        console.error(`Error en deleteCategory (id: ${categoryId}):`, err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// =================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get('/', listCategories);
router.post('/', createCategory);
router.delete('/:id', deleteCategory);

export default router;