// src/services/familyService.ts
import type { HouseholdData } from "../types/family";
import { NEEDS_OPTIONS } from "../types/fibe";
import type { Db } from "../types/db";
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../auth/middleware';
import pool from '../config/db';
/**
 * Transforma un array de strings de necesidades en un vector de 1s y 0s.
 */
function needsVectorFromSelected(selectedNeeds: string[] | undefined | null): number[] {
    const vec = new Array(NEEDS_OPTIONS.length).fill(0);
    if (!selectedNeeds || selectedNeeds.length === 0) return vec;
    const selectedSet = new Set(selectedNeeds.map((s) => s.toLowerCase().trim()));
    NEEDS_OPTIONS.forEach((name, idx) => {
        if (selectedSet.has(name.toLowerCase())) vec[idx] = 1;
    });
    return vec;
}

/**
 * Crea un registro en FamilyGroups.
 * @param db Pool de conexión a la base de datos.
 * @param args Argumentos para la creación del grupo familiar.
 * @returns El ID del nuevo grupo familiar.
 */
export async function createFamilyGroupInDB(db: Db, args: {
    activation_id: number;
    jefe_hogar_person_id: number | null;
    data: HouseholdData;
}): Promise<number> {
    const necesidades = needsVectorFromSelected(args.data?.selectedNeeds);
    const sql = `
        INSERT INTO FamilyGroups (activation_id, jefe_hogar_person_id, observaciones, necesidades_basicas)
        VALUES ($1, $2, $3, $4::int[])
        RETURNING family_id`;
    const params = [args.activation_id, args.jefe_hogar_person_id ?? null, args.data?.observations ?? null, necesidades];
    const { rows } = await db.query(sql, params);
    return rows[0].family_id as number;
}

/**
 * Obtiene los grupos familiares activos de un centro, con el formato exacto que espera el frontend.
 * @param db Pool de conexión a la base de datos.
 * @param centerId El ID del centro (como string).
 * @returns Una promesa con un arreglo de objetos ResidentGroup.
 */

export async function getCenterGroups(db: Db, centerId: string) {
    const query = `
        SELECT
            p.rut,
            p.nombre,
            p.primer_apellido,
            p.segundo_apellido,
            fg.family_id,
            (SELECT COUNT(*) FROM FamilyGroupMembers fgm WHERE fgm.family_id = fg.family_id) as integrantes_grupo
        FROM 
            FamilyGroups fg
        JOIN 
            Persons p ON p.person_id = fg.jefe_hogar_person_id 
        JOIN 
            CentersActivations ca ON ca.activation_id = fg.activation_id AND ca.ended_at IS NULL
        WHERE 
            ca.center_id = $1 AND fg.status = 'activo';
    `;
    
    const { rows } = await db.query(query, [centerId]);

    
    const residentGroups = rows.map(row => {
 
        const nombreCompleto = [
            row.nombre,
            row.primer_apellido,
            row.segundo_apellido
        ].filter(Boolean).join(' '); // Filtra nulos/vacíos y une con espacios.

        return {
            rut: row.rut,
            nombre_completo: nombreCompleto,
            integrantes_grupo: parseInt(row.integrantes_grupo, 10) || 0,
            family_id: row.family_id
        };
    });

    return residentGroups;
}