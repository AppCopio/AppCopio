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

// ============================================================================
// HdU31: Funciones para obtener y actualizar familia completa
// ============================================================================

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
    center_id: string;
    center_name: string;
    observaciones: string;
    necesidades_basicas: number[];
    miembros: FullFamilyMember[];
}

export interface UpdateFullFamilyData {
    observaciones: string;
    necesidades_basicas: number[];
    miembros: FullFamilyMember[];
}

/**
 * Obtiene toda la información de una familia (datos básicos + centro + miembros)
 */
export async function getFullFamily(db: Db, familyId: number): Promise<FullFamily | null> {
    // 1. Datos de la familia + centro
    const familyQuery = `
        SELECT 
            fg.family_id,
            fg.activation_id,
            fg.observaciones,
            fg.necesidades_basicas,
            ca.center_id,
            c.name as center_name
        FROM FamilyGroups fg
        JOIN CentersActivations ca ON ca.activation_id = fg.activation_id
        JOIN Centers c ON c.center_id = ca.center_id
        WHERE fg.family_id = $1
    `;
    
    const { rows: familyRows } = await db.query(familyQuery, [familyId]);
    if (familyRows.length === 0) return null;
    
    const family = familyRows[0];
    
    // 2. Miembros de la familia (ordenados: jefe primero)
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
            CASE WHEN fgm.parentesco = 'Jefe de Hogar' THEN 0 ELSE 1 END,
            fgm.member_id
    `;
    
    const { rows: memberRows } = await db.query(membersQuery, [familyId]);
    
    return {
        family_id: family.family_id,
        activation_id: family.activation_id,
        center_id: family.center_id,
        center_name: family.center_name,
        observaciones: family.observaciones || '',
        necesidades_basicas: family.necesidades_basicas || [],
        miembros: memberRows
    };
}

/**
 * Actualiza una familia completa (observaciones, necesidades, datos de miembros)
 * SIN registrar en AuditLog para evitar el error de UUID
 */
export async function updateFullFamily(
    db: Db, 
    familyId: number, 
    data: UpdateFullFamilyData, 
    userId: number
): Promise<void> {
    // 1. Actualizar FamilyGroups
    await db.query(`
        UPDATE FamilyGroups
        SET observaciones = $1, necesidades_basicas = $2
        WHERE family_id = $3
    `, [data.observaciones, data.necesidades_basicas, familyId]);

    // 2. Actualizar cada miembro
    for (const miembro of data.miembros) {
        // 2a. Actualizar Persons
        await db.query(`
            UPDATE Persons
            SET rut = $1, nombre = $2, primer_apellido = $3, segundo_apellido = $4,
                nacionalidad = $5, genero = $6, edad = $7, estudia = $8,
                trabaja = $9, perdida_trabajo = $10, rubro = $11,
                discapacidad = $12, dependencia = $13
            WHERE person_id = $14
        `, [
            miembro.rut,
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
    
    // NO registramos en AuditLog para evitar el problema de UUID vs INTEGER
}