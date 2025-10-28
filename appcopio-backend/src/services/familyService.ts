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

// =================================================================
// NUEVAS FUNCIONES PARA HdU31 - GESTIÓN DE PERSONAS
// =================================================================

/**
 *  familia completa con todos sus miembros
 */
export interface FullFamilyMember {
    member_id: number;
    parentesco: string;
    person_id: number;
    rut: string;
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string | null;
    nacionalidad: string;
    genero: string;
    edad: number;
    estudia: boolean;
    trabaja: boolean;
    perdida_trabajo: boolean;
    rubro: string | null;
    discapacidad: boolean;
    dependencia: boolean;
}

export interface FullFamily {
    family_id: number;
    activation_id: number;
    jefe_hogar_person_id: number;
    observaciones: string | null;
    necesidades_basicas: number[];
    status: string;
    center_id: string;
    center_name: string;
    miembros: FullFamilyMember[];
}

export interface UpdateFullFamilyData {
    observaciones: string;
    necesidades_basicas: number[];
    miembros: FullFamilyMember[];
}

/**
 * Obtiene una familia completa con todos sus miembros y datos del centro.
 * @param db Pool de conexión a la base de datos.
 * @param familyId ID del grupo familiar.
 * @returns Objeto FullFamily o null si no se encuentra.
 */
export async function getFullFamily(db: Db, familyId: number): Promise<FullFamily | null> {
    // 1. Obtener datos del grupo familiar
    const familyQuery = `
        SELECT 
            fg.family_id,
            fg.activation_id,
            fg.jefe_hogar_person_id,
            fg.observaciones,
            fg.necesidades_basicas,
            fg.status,
            ca.center_id,
            c.name as center_name
        FROM FamilyGroups fg
        JOIN CentersActivations ca ON ca.activation_id = fg.activation_id
        JOIN Centers c ON c.center_id = ca.center_id
        WHERE fg.family_id = $1`;

    const familyResult = await db.query(familyQuery, [familyId]);
    
    if (familyResult.rowCount === 0) {
        return null;
    }

    const familyData = familyResult.rows[0];

    // 2. Obtener todos los miembros con sus datos completos
    const membersQuery = `
        SELECT 
            fgm.member_id,
            fgm.parentesco,
            p.person_id,
            p.rut,
            p.nombre,
            p.primer_apellido,
            p.segundo_apellido,
            p.nacionalidad,
            p.genero,
            p.edad,
            p.estudia,
            p.trabaja,
            p.perdida_trabajo,
            p.rubro,
            p.discapacidad,
            p.dependencia
        FROM FamilyGroupMembers fgm
        JOIN Persons p ON p.person_id = fgm.person_id
        WHERE fgm.family_id = $1
        ORDER BY 
            CASE WHEN p.person_id = $2 THEN 0 ELSE 1 END,
            fgm.member_id`;

    const membersResult = await db.query(membersQuery, [familyId, familyData.jefe_hogar_person_id]);

    return {
        family_id: familyData.family_id,
        activation_id: familyData.activation_id,
        jefe_hogar_person_id: familyData.jefe_hogar_person_id,
        observaciones: familyData.observaciones,
        necesidades_basicas: familyData.necesidades_basicas || [],
        status: familyData.status,
        center_id: familyData.center_id,
        center_name: familyData.center_name,
        miembros: membersResult.rows
    };
}

/**
 * Actualiza una familia completa de forma transaccional.
 * Actualiza FamilyGroups, Persons y FamilyGroupMembers.
 * 
 * @param db PoolClient con transacción activa.
 * @param familyId ID del grupo familiar.
 * @param data Datos a actualizar.
 * @param userId ID del usuario que realiza la actualización (para audit log).
 */
export async function updateFullFamily(
    db: any, // PoolClient
    familyId: number,
    data: UpdateFullFamilyData,
    userId: number
): Promise<void> {
    // 1. Actualizar FamilyGroups
    await db.query(`
        UPDATE FamilyGroups
        SET 
            observaciones = $1,
            necesidades_basicas = $2::int[]
        WHERE family_id = $3
    `, [data.observaciones, data.necesidades_basicas, familyId]);

    // 2. Actualizar cada miembro
    for (const miembro of data.miembros) {
        // 2a. Actualizar Persons
        await db.query(`
            UPDATE Persons
            SET 
                nombre = $1,
                primer_apellido = $2,
                segundo_apellido = $3,
                nacionalidad = $4,
                genero = $5,
                edad = $6,
                estudia = $7,
                trabaja = $8,
                perdida_trabajo = $9,
                rubro = $10,
                discapacidad = $11,
                dependencia = $12,
                updated_at = NOW()
            WHERE person_id = $13
        `, [
            miembro.nombre,
            miembro.primer_apellido,
            miembro.segundo_apellido || null,
            miembro.nacionalidad,
            miembro.genero,
            miembro.edad,
            miembro.estudia,
            miembro.trabaja,
            miembro.perdida_trabajo,
            miembro.rubro || null,
            miembro.discapacidad,
            miembro.dependencia,
            miembro.person_id
        ]);

        // 2b. Actualizar FamilyGroupMembers (parentesco)
        await db.query(`
            UPDATE FamilyGroupMembers
            SET parentesco = $1
            WHERE member_id = $2
        `, [miembro.parentesco, miembro.member_id]);
    }

    // 3. Registrar en AuditLog
    await db.query(`
        INSERT INTO AuditLog (
            entity_type, entity_id, action, actor_user_id, at, after
        ) VALUES (
            'family', $1, 'update', $2, NOW(), $3::jsonb
        )
    `, [familyId.toString(), userId, JSON.stringify(data)]);
}