// src/routes/volunteerRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { requireUser } from "../auth/requireUser";
import { requireAuth } from '../auth/middleware';

// CAMBIO: Importamos las funciones desde el servicio
import {
  createVolunteerContact,
  listVolunteerContacts,
  getVolunteerContactById,
  updateVolunteerStatus,
} from '../services/volunteerContactService';

import type {
  VolunteerContactData,
  VolunteerStatusUpdateData,
  VolunteerStatus,
} from '../types/volunteer';

const router = Router();

// =================================================================
// 1. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

/**
 * @controller POST /api/volunteers/contact
 * @description Crea un nuevo contacto de voluntario (formulario público)
 * @access Público (no requiere autenticación)
 */
const submitVolunteerContact: RequestHandler = async (req, res) => {
  const { activation_id, center_id, contactData } = req.body;

  // Validación de campos requeridos
  if (!activation_id || !center_id) {
    res.status(400).json({ 
      error: 'Se requieren los campos: activation_id y center_id.' 
    });
    return;
  }

  if (!contactData || !contactData.nombre || !contactData.email || !contactData.celular) {
    res.status(400).json({ 
      error: 'Se requieren los campos del contacto: nombre, email y celular.' 
    });
    return;
  }

  // Validación básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contactData.email)) {
    res.status(400).json({ 
      error: 'El formato del correo electrónico no es válido.' 
    });
    return;
  }

  // Validación básica de celular (opcional, ajusta según tus necesidades)
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  if (!phoneRegex.test(contactData.celular)) {
    res.status(400).json({ 
      error: 'El formato del número de celular no es válido.' 
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la activación existe y está abierta
    const activationCheck = await client.query(
      `SELECT activation_id, center_id 
       FROM CentersActivations 
       WHERE activation_id = $1 AND center_id = $2 AND ended_at IS NULL`,
      [activation_id, center_id]
    );

    if (activationCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ 
        error: 'La activación del centro no es válida o ha sido cerrada.' 
      });
      return;
    }

    const response = await createVolunteerContact(client, {
      activation_id,
      center_id,
      contactData: contactData as VolunteerContactData,
    });

    await client.query('COMMIT');
    res.status(201).json(response);

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error en submitVolunteerContact:', error);
    
    if (error.message?.includes('configuración')) {
      res.status(500).json({ 
        error: 'Error de configuración del sistema. Contacte al administrador.',
        detail: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Error interno del servidor al registrar el contacto de voluntario.' 
      });
    }
  } finally {
    client.release();
  }
};

/**
 * @controller GET /api/volunteers/by-activation/:activationId
 * @description Obtiene todos los contactos de voluntarios de una activación
 * @access Requiere autenticación
 */
const listVolunteersByActivation: RequestHandler = async (req, res) => {
  const activationId = parseInt(req.params.activationId, 10);

  if (isNaN(activationId)) {
    res.status(400).json({ error: 'El ID de la activación debe ser un número válido.' });
    return;
  }

  try {
    const volunteers = await listVolunteerContacts(pool, activationId);
    res.json({ 
      volunteers, 
      total: volunteers.length,
      activation_id: activationId 
    });
  } catch (error) {
    console.error(`Error en listVolunteersByActivation (activationId: ${activationId}):`, error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los contactos de voluntarios.' 
    });
  }
};

/**
 * @controller GET /api/volunteers/:volunteerId
 * @description Obtiene un contacto de voluntario específico por su ID
 * @access Requiere autenticación
 */
const getVolunteer: RequestHandler = async (req, res) => {
  const { volunteerId } = req.params;

  if (!volunteerId) {
    res.status(400).json({ error: 'Se requiere el ID del voluntario.' });
    return;
  }

  try {
    const volunteer = await getVolunteerContactById(pool, volunteerId);

    if (!volunteer) {
      res.status(404).json({ error: 'Contacto de voluntario no encontrado.' });
      return;
    }

    res.json(volunteer);
  } catch (error) {
    console.error(`Error en getVolunteer (volunteerId: ${volunteerId}):`, error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener el contacto de voluntario.' 
    });
  }
};

/**
 * @controller PATCH /api/volunteers/:volunteerId/status
 * @description Actualiza el estado y/o notas de un contacto de voluntario
 * @access Requiere autenticación
 */
const updateVolunteer: RequestHandler = async (req, res) => {
  const { volunteerId } = req.params;
  const { status, notes } = req.body;
  const userId = requireUser(req).user_id;

  if (!volunteerId) {
    res.status(400).json({ error: 'Se requiere el ID del voluntario.' });
    return;
  }

  // Validar que al menos un campo esté presente
  if (status === undefined && notes === undefined) {
    res.status(400).json({ 
      error: 'Se debe proporcionar al menos un campo para actualizar (status o notes).' 
    });
    return;
  }

  // Validar valores de status si está presente
  const validStatuses: VolunteerStatus[] = ['pendiente', 'contactado', 'aceptado', 'rechazado'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ 
      error: `El estado debe ser uno de: ${validStatuses.join(', ')}.` 
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateData: VolunteerStatusUpdateData = {
      status: status as VolunteerStatus, // TypeScript necesita el cast explícito
    };
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updatedVolunteer = await updateVolunteerStatus(
      client,
      volunteerId,
      updateData,
      userId
    );

    await client.query('COMMIT');
    res.json(updatedVolunteer);

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`Error en updateVolunteer (volunteerId: ${volunteerId}):`, error);

    if (error.message?.includes('no encontrado') || error.message?.includes('eliminado')) {
      res.status(404).json({ error: error.message });
    } else if (error.message?.includes('Conflicto de versión')) {
      res.status(409).json({ error: error.message });
    } else if (error.message?.includes('opción válida')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ 
        error: 'Error interno del servidor al actualizar el contacto de voluntario.' 
      });
    }
  } finally {
    client.release();
  }
};

// =================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

// Ruta pública para el formulario de contacto
router.post('/contact', submitVolunteerContact);

// Rutas protegidas (requieren autenticación)
router.get('/by-activation/:activationId', requireAuth, listVolunteersByActivation);
router.get('/:volunteerId', requireAuth, getVolunteer);
router.patch('/:volunteerId/status', requireAuth, updateVolunteer);

export default router;
