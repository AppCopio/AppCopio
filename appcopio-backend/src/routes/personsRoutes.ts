// src/routes/personsRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { Person, FibePersonData } from '../types/person';
import { getPersons, getPersonById, createPersonDB, updatePersonById } from '../services/personService';

const router = Router();

// =================================================================
// 1. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

/**
 * @controller GET /api/persons
 * @description Obtiene una lista de personas.
 */
const listPersons: RequestHandler = async (req, res) => {
    try {
        const persons = await getPersons(pool);
        res.json(persons);
    } catch (error) {
        console.error("Error en listPersons:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

/**
 * @controller GET /api/persons/:id
 * @description Obtiene una persona por su ID.
 */
const getPerson: RequestHandler = async (req, res) => {
    const personId = parseInt(req.params.id, 10);
    if (isNaN(personId)) {
        res.status(400).json({ error: "El ID debe ser un número válido." });
        return;
    }

    try {
        const person = await getPersonById(pool, personId);
        if (!person) {
            res.status(404).json({ error: 'Persona no encontrada.' });
        } else {
            res.json(person);
        }
    } catch (error) {
        console.error(`Error en getPerson (id: ${personId}):`, error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

/**
 * @controller POST /api/persons
 * @description Crea una nueva persona.
 */
const createPerson: RequestHandler = async (req, res) => {
    const personData: FibePersonData = req.body;

    if (!personData.rut || !personData.nombre || !personData.primer_apellido) {
        res.status(400).json({ error: "Los campos 'rut', 'nombre' y 'primer_apellido' son requeridos." });
        return;
    }

    try {
        const personId = await createPersonDB(pool, personData);
        res.status(201).json({ person_id: personId });
    } catch (e: any) {
        if (e?.code === '23505') { // unique_violation (RUT duplicado)
            res.status(409).json({ error: 'El RUT ya existe.' });
        } else {
            console.error("Error en createPerson:", e);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
};

/**
 * @controller PUT /api/persons/:id
 * @description Actualiza una persona existente.
 */
const updatePerson: RequestHandler = async (req, res) => {
    const personId = parseInt(req.params.id, 10);
    if (isNaN(personId)) {
        res.status(400).json({ error: "El ID debe ser un número válido." });
        return;
    }

    const personData: Person = req.body;
    if (!personData.rut || !personData.nombre || !personData.primer_apellido) {
        res.status(400).json({ error: "Los campos 'rut', 'nombre' y 'primer_apellido' son requeridos." });
        return;
    }

    try {
        const updatedPerson = await updatePersonById(pool, personId, personData);
        if (!updatedPerson) {
            res.status(404).json({ error: "Persona no encontrada." });
        } else {
            res.json(updatedPerson);
        }
    } catch (e: any) {
        if (e?.code === '23505') {
            res.status(409).json({ error: 'El RUT ya existe y pertenece a otra persona.' });
        } else {
            console.error(`Error en updatePerson (id: ${personId}):`, e);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
};

// =================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get('/', listPersons);
router.post('/', createPerson);
router.get('/:id', getPerson);
router.put('/:id', updatePerson);

export default router;