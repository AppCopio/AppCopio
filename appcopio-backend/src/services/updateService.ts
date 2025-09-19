// src/services/updateService.ts
import pool from "../config/db";
import { Db } from "../types/db";

// Tipos para la creación y actualización de solicitudes
export interface UpdateRequestCreate {
    center_id: string;
    description: string;
    urgency: 'baja' | 'media' | 'alta';
    requested_by: number;
}

export interface UpdateRequestUpdate {
    status?: 'pending' | 'approved' | 'rejected' | 'canceled';
    assigned_to?: number;
    resolution_comment?: string;
    resolved_by?: number;
}

const baseSelectQuery = `
    SELECT 
        ur.request_id, ur.center_id, ur.description, ur.status, ur.urgency,
        ur.registered_at, ur.resolution_comment, c.name AS center_name,
        requester.nombre AS requested_by_name, assignee.nombre AS assigned_to_name
    FROM UpdateRequests ur
    JOIN Centers c ON ur.center_id = c.center_id
    LEFT JOIN Users requester ON ur.requested_by = requester.user_id
    LEFT JOIN Users assignee ON ur.assigned_to = assignee.user_id
`;

/**
 * Obtiene una lista paginada de solicitudes de actualización.
 */
export async function getUpdateRequests(db: Db, filters: { status: string; page: number; limit: number; centerId?: string }) {
    const { status, page, limit, centerId } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = `WHERE ur.status = $1`;
    const queryParams: any[] = [status];

    if (centerId) {
        whereClause += ` AND ur.center_id = $${queryParams.length + 1}`;
        queryParams.push(centerId);
    }
    
    const dataQuery = `${baseSelectQuery} ${whereClause} ORDER BY ur.registered_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM UpdateRequests ur ${whereClause}`;
    const countParams = centerId ? [status, centerId] : [status];

    const [dataResult, countResult] = await Promise.all([
        db.query(dataQuery, queryParams),
        db.query(countQuery, countParams)
    ]);

    return {
        requests: dataResult.rows,
        total: Number(countResult.rows[0].count)
    };
}

/**
 * Crea una nueva solicitud de actualización.
 */
export async function createUpdateRequest(db: Db, data: UpdateRequestCreate) {
    const { center_id, description, urgency, requested_by } = data;
    const result = await db.query(
        `INSERT INTO UpdateRequests (center_id, description, urgency, requested_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [center_id, description, urgency, requested_by]
    );
    return result.rows[0];
}

/**
 * Actualiza una solicitud de actualización por su ID.
 */
export async function updateRequestById(db: Db, id: number, data: UpdateRequestUpdate) {
    const { status, assigned_to, resolution_comment, resolved_by } = data;
    const fields: any[] = [];
    const queryParts: string[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
        queryParts.push(`status = $${paramIndex++}`);
        fields.push(status);
    }
    if (assigned_to !== undefined) {
        queryParts.push(`assigned_to = $${paramIndex++}`);
        fields.push(assigned_to);
    }
    if (resolution_comment !== undefined) {
        queryParts.push(`resolution_comment = $${paramIndex++}`);
        fields.push(resolution_comment);
    }
    if (status && ['approved', 'rejected', 'canceled'].includes(status)) {
        queryParts.push(`resolved_at = NOW()`, `resolved_by = $${paramIndex++}`);
        fields.push(resolved_by);
    }

    if (queryParts.length === 0) {
        return null; // O lanzar un error si se prefiere
    }

    const query = `UPDATE UpdateRequests SET ${queryParts.join(', ')} WHERE request_id = $${paramIndex} RETURNING *`;
    fields.push(id);

    const result = await db.query(query, fields);
    return result.rowCount > 0 ? result.rows[0] : null;
}

/**
 * Elimina una solicitud de actualización por su ID.
 */
export async function deleteUpdateRequestById(db: Db, id: number): Promise<number> {
    const result = await db.query('DELETE FROM UpdateRequests WHERE request_id = $1', [id]);
    return result.rowCount;
}