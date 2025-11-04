// src/routes/serviceRequestRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { requireUser } from "../auth/requireUser";
import { requireAuth } from "../auth/middleware";
import { 
  createServiceRequest, listServiceRequests, getServiceRequestById, updateServiceRequest, deleteServiceRequest,
  listPublicServiceRequests, getPublicServiceRequestById, countServiceRequestsByCategory, 
} from "../services/serviceRequestService";
import type { 
    ServiceCategory, ServiceRequestCreateData, ServiceRequestUpdateData, ServiceRequestFilters, 
    ServiceRequestPublicFilters, ServiceRequestStatus, 
} from "../types/serviceRequest";

const router = Router();

/**
 * @controller GET /api/service-requests/public/list
 * @description Lista avisos de servicios para vista pública (solo activos).
 * @access Público
 */
const listPublicRequests: RequestHandler = async (req, res) => {
  const { activation_id, center_id, categoria, urgencia } = req.query;

  const filters: ServiceRequestPublicFilters = {
    only_active: true, // Por defecto, solo activos
  };

  if (activation_id)
    filters.activation_id = parseInt(activation_id as string, 10);
  if (center_id) filters.center_id = center_id as string;
  if (categoria) filters.categoria = categoria as ServiceCategory;
  if (urgencia) filters.urgencia = urgencia as any;
  if (activation_id && isNaN(filters.activation_id!)) {
    return res
      .status(400)
      .json({ error: "El filtro activation_id debe ser un número." });
  }

  try {
    const results = await listPublicServiceRequests(pool, filters);
    res.json({
      requests: results,
      total: results.length,
      filters,
    });
  } catch (error: any) {
    console.error("Error en listPublicRequests:", error);
    res.status(500).json({
      error: "Error interno del servidor al listar los avisos de servicio.",
    });
  }
};

/**
 * @controller GET /api/service-requests/public/stats
 * @description Conteo de avisos activos por categoría.
 * @access Público
 */
const getCategoryCounts: RequestHandler = async (req, res) => {
  const { activation_id } = req.query;
  const activationId = activation_id
    ? parseInt(activation_id as string, 10)
    : undefined;

  if (activation_id && isNaN(activationId!)) {
    return res
      .status(400)
      .json({ error: "El filtro activation_id debe ser un número." });
  }

  try {
    const counts = await countServiceRequestsByCategory(pool, activationId);
    res.json({
      counts,
      activation_id: activationId,
    });
  } catch (error: any) {
    console.error("Error en getCategoryCounts:", error);
    res.status(500).json({
      error: "Error interno del servidor al obtener las estadísticas.",
    });
  }
};

/**
 * @controller GET /api/service-requests/public/:requestId
 * @description Obtiene un aviso (vista pública).
 * @access Público
 */
const getPublicRequest: RequestHandler = async (req, res) => {
  const { requestId } = req.params;

  if (!requestId) {
    return res
      .status(400)
      .json({ error: "Se requiere el ID del aviso (requestId)." });
  }

  try {
    const request = await getPublicServiceRequestById(pool, requestId);

    if (!request) {
      return res.status(404).json({ error: "Aviso de servicio no encontrado." });
    }
    
    if (request.status === "completado" || request.status === "cancelado") {
       return res.status(404).json({ error: "Aviso de servicio no encontrado." });
    }

    res.json(request);
  } catch (error: any) {
    console.error(`Error en getPublicRequest (requestId: ${requestId}):`, error);
    res.status(500).json({
      error: "Error interno del servidor al obtener el aviso de servicio.",
    });
  }
};

/**
 * @controller POST /api/service-requests
 * @description Crea un nuevo aviso de servicio.
 * @access Requiere autenticación
 */
const createRequest: RequestHandler = async (req, res) => {
  const { activation_id, center_id, requestData } = req.body as {
    activation_id: number;
    center_id: string;
    requestData: ServiceRequestCreateData;
  };
  const userId = requireUser(req).user_id;

  if (!activation_id || !center_id || !requestData) {
    return res.status(400).json({
      error: "Se requieren: activation_id, center_id y requestData.",
    });
  }
  if (
    !requestData.titulo ||
    !requestData.descripcion ||
    !requestData.categoria ||
    !requestData.duracion_estimada ||
    !requestData.urgencia
  ) {
    return res.status(400).json({
      error:
        "requestData debe incluir: titulo, descripcion, categoria, urgencia y duracion_estimada.",
    });
  }

  try {

    const response = await createServiceRequest(pool, {
      activation_id,
      center_id,
      created_by: userId,
      requestData,
    });

    res.status(201).json(response);
  } catch (error: any) {
    console.error("Error en createRequest:", error);
    if (
      error.message?.includes("no encontrado") ||
      error.message?.includes("no válida")
    ) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({
        error: "Error interno del servidor al crear el aviso de servicio.",
      });
    }
  }
};

/**
 * @controller GET /api/service-requests
 * @description Lista avisos de servicios (vista interna/admin).
 * @access Requiere autenticación
 */
const listInternalRequests: RequestHandler = async (req, res) => {
  const { activation_id, center_id, status, categoria, urgencia } = req.query;

  const filters: ServiceRequestFilters = {};

  if (activation_id)
    filters.activation_id = parseInt(activation_id as string, 10);
  if (center_id) filters.center_id = center_id as string;
  if (status) filters.status = status as ServiceRequestStatus;
  if (categoria) filters.categoria = categoria as ServiceCategory;
  if (urgencia) filters.urgencia = urgencia as any;

  if (activation_id && isNaN(filters.activation_id!)) {
    return res
      .status(400)
      .json({ error: "El filtro activation_id debe ser un número." });
  }

  try {
    const results = await listServiceRequests(pool, filters);
    res.json({
      requests: results,
      total: results.length,
      filters,
    });
  } catch (error: any) {
    console.error("Error en listInternalRequests:", error);
    res.status(500).json({
      error: "Error interno del servidor al listar los avisos de servicio.",
    });
  }
};

/**
 * @controller GET /api/service-requests/:requestId
 * @description Obtiene un aviso (vista interna/admin).
 * @access Requiere autenticación
 */
const getInternalRequest: RequestHandler = async (req, res) => {
  const { requestId } = req.params;

  if (!requestId) {
    return res
      .status(400)
      .json({ error: "Se requiere el ID del aviso (requestId)." });
  }

  try {
    const request = await getServiceRequestById(pool, requestId);

    if (!request) {
      return res.status(404).json({ error: "Aviso de servicio no encontrado." });
    }

    res.json(request);
  } catch (error: any) {
    console.error(`Error en getInternalRequest (requestId: ${requestId}):`, error);
    res.status(500).json({
      error: "Error interno del servidor al obtener el aviso de servicio.",
    });
  }
};

/**
 * @controller PATCH /api/service-requests/:requestId
 * @description Actualiza un aviso de servicio.
 * @access Requiere autenticación
 */
const updateRequest: RequestHandler = async (req, res) => {
  const { requestId } = req.params;
  const updateData = req.body as ServiceRequestUpdateData;
  const userId = requireUser(req).user_id;

  if (!requestId) {
    return res
      .status(400)
      .json({ error: "Se requiere el ID del aviso (requestId)." });
  }
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      error: "Se debe proporcionar al menos un campo para actualizar.",
    });
  }

  try {
    const updatedRequest = await updateServiceRequest(
      pool,
      requestId,
      updateData,
      userId
    );

    res.json(updatedRequest);
  } catch (error: any) {
    console.error(`Error en updateRequest (requestId: ${requestId}):`, error);
    if (error.message?.includes("no encontrado")) {
      res.status(404).json({ error: error.message });
    } else if (error.message?.includes("Conflicto de versión")) {
      res.status(409).json({ error: error.message });
    } else if (error.message?.includes("no válida")) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({
        error: "Error interno del servidor al actualizar el aviso de servicio.",
      });
    }
  }
};

/**
 * @controller DELETE /api/service-requests/:requestId
 * @description Elimina (soft delete) un aviso de servicio.
 * @access Requiere autenticación
 */
const deleteRequest: RequestHandler = async (req, res) => {
  const { requestId } = req.params;

  if (!requestId) {
    return res
      .status(400)
      .json({ error: "Se requiere el ID del aviso (requestId)." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await deleteServiceRequest(client, requestId);

    await client.query("COMMIT");
    res.status(204).send(); // 204 No Content
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error(`Error en deleteRequest (requestId: ${requestId}):`, error);

    if (error.message?.includes("no encontrado")) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({
        error: "Error interno del servidor al eliminar el aviso de servicio.",
      });
    }
  } finally {
    client.release();
  }
};

router.get("/public/list", listPublicRequests);
router.get("/public/stats", getCategoryCounts);
router.get("/public/:requestId", getPublicRequest);
// ----------------------------------------------------------------
router.post("/", requireAuth, createRequest);
router.get("/", requireAuth, listInternalRequests);
router.get("/:requestId", requireAuth, getInternalRequest);
router.patch("/:requestId", requireAuth, updateRequest);
router.delete("/:requestId", requireAuth, deleteRequest);

export default router;