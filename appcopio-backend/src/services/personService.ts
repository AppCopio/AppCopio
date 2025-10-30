// src/services/personService.ts
import pool from "../config/db";
import type { Person, FibePersonData } from "../types/person";
import type { Db } from "../types/db";

const normalizeRut = (v: string) => (v || "").replace(/[^0-9kK]/g, "").toUpperCase();

interface PersonDetailsResponse {
    person_details: any | null; // Usar tu tipo 'Person' aquí
    family_memberships: any[]; // Usar tu tipo 'FamilyMembership' aquí
}

/**
 * Obtiene una lista de las últimas 100 personas de la base de datos.
 * @param db Pool de conexión a la base de datos.
 * @returns Un array de objetos Person.
 */
export async function getPersons(db: Db): Promise<Person[]> {
    const { rows } = await db.query(`
        SELECT 
        person_id, rut, nombre, primer_apellido, segundo_apellido, nacionalidad, genero, edad, 
        estudia, trabaja, perdida_trabajo, rubro, discapacidad, dependencia, created_at, updated_at
        FROM Persons
        ORDER BY person_id DESC
        LIMIT 100`);
    return rows;
}

/**
 * Obtiene una persona por su ID.
 * @param db Pool de conexión a la base de datos.
 * @param id El ID de la persona.
 * @returns El objeto Person si se encuentra, de lo contrario null.
 */
export async function getPersonById(db: Db, id: number): Promise<Person | null> {
    const { rows } = await db.query(
        `SELECT 
        person_id, rut, nombre, primer_apellido, segundo_apellido, nacionalidad, genero, edad, 
        estudia, trabaja, perdida_trabajo, rubro, discapacidad, dependencia, created_at, updated_at
        FROM Persons WHERE person_id = $1`,
        [id]
    );
    return rows[0] || null;
}

/**
 * Inserta una nueva persona en la base de datos.

 * @param db Pool de conexión a la base de datos.
 * @param p Datos de la persona a crear, de tipo PersonCreate.
 * @returns El ID de la persona creada.
 */
export async function createPersonDB(db: Db, p: FibePersonData): Promise<number> {
    const sql = `
        INSERT INTO Persons ( rut, nombre, primer_apellido, segundo_apellido, nacionalidad, genero, edad, 
        estudia, trabaja, perdida_trabajo, rubro, discapacidad, dependencia)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING person_id`;

    const params = [
        normalizeRut(p.rut),
        p.nombre,
        p.primer_apellido,
        p.segundo_apellido || "",
        p.nacionalidad,
        p.genero || "",
        p.edad as number,
        p.estudia,
        p.trabaja,
        p.perdida_trabajo,
        p.rubro,
        p.discapacidad,
        p.dependencia,
    ];

    const { rows } = await db.query(sql, params);
    return rows[0].person_id as number;
}

/**
 * REVISAR!
 * Actualiza una persona existente en la base de datos por su ID.
 * @param db Pool de conexión a la base de datos.
 * @param id El ID de la persona a actualizar.
 * @param p Los nuevos datos para la persona.
 * @returns El objeto Person actualizado.
 */
export async function updatePersonById(db: Db, id: number, p: Person): Promise<Person | null> {
    const sql = `
        UPDATE Persons SET
            rut = $1,
            nombre = $2,
            primer_apellido = $3,
            segundo_apellido = $4,
            genero = $5,
            edad = $6,
            updated_at = NOW()
        WHERE person_id = $7
        RETURNING *`;
    
    const params = [
        normalizeRut(p.rut),
        p.nombre,
        p.primer_apellido,
        p.segundo_apellido || null,
        p.genero || null,
        p.edad ?? null,
        id
    ];

    const { rows, rowCount } = await db.query(sql, params);
    return rowCount > 0 ? rows[0] : null;
}

/**
 * Tipos para búsqueda de personas
 */
export interface PersonSearchFilters {
    rut?: string;
    nombre?: string;
    center_id?: string;
}

export interface PersonSearchResult {
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
    // Familia
    family_id: number | null;
    observaciones: string | null;
    necesidades_basicas: number[] | null;
    family_status: string | null;
    parentesco: string | null;
    // Centro
    center_id: string | null;
    center_name: string | null;
    activation_id: number | null;
}

/**
 * Busca personas en la base de datos con filtros opcionales.
 * Retorna información completa incluyendo familia y centro actual.
 * 
 * @param db Pool de conexión a la base de datos.
 * @param filters Filtros de búsqueda (rut, nombre, center_id).
 * @returns Array de personas que coinciden con los criterios.
 */
export async function searchPersons(
    db: Db,
    filters: PersonSearchFilters
): Promise<PersonSearchResult[]> {
    const sql = `
        SELECT DISTINCT
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
            p.dependencia,
            -- Datos de familia
            fg.family_id,
            fg.observaciones,
            fg.necesidades_basicas,
            fg.status as family_status,
            -- Parentesco
            fgm.parentesco,
            -- Datos del centro actual
            c.center_id,
            c.name as center_name,
            ca.activation_id
        FROM Persons p
        LEFT JOIN FamilyGroupMembers fgm ON fgm.person_id = p.person_id
        LEFT JOIN FamilyGroups fg ON fg.family_id = fgm.family_id AND fg.status = 'activo'
        LEFT JOIN CentersActivations ca ON ca.activation_id = fg.activation_id AND ca.ended_at IS NULL
        LEFT JOIN Centers c ON c.center_id = ca.center_id
        WHERE 
            (
                $1::TEXT IS NULL 
                OR REPLACE(REPLACE(REPLACE(p.rut, '.', ''), '-', ''), ' ', '') ILIKE '%' || REPLACE(REPLACE(REPLACE($1, '.', ''), '-', ''), ' ', '') || '%'
            )
            AND (
                $2::TEXT IS NULL 
                OR LOWER(p.nombre || ' ' || p.primer_apellido || ' ' || COALESCE(p.segundo_apellido, '')) LIKE LOWER('%' || $2 || '%')
            )
            AND (
                $3::VARCHAR IS NULL 
                OR ca.center_id = $3
            )
        ORDER BY p.nombre, p.primer_apellido
        LIMIT 100`;

    const params = [
        filters.rut || null,
        filters.nombre || null,
        filters.center_id || null
    ];

    const { rows } = await db.query(sql, params);
    return rows;
}

/**
 * Obtiene el detalle completo de una persona, incluyendo su fecha de ingreso 
 * y todas las asociaciones a grupos familiares.
 * @param db Pool de conexión a la base de datos.
 * @param personId ID de la persona a buscar.
 */
export async function getPersonDetailsWithFamily(db: Db, personId: number): Promise<PersonDetailsResponse> {
    
    // 1. Obtener detalles básicos de la persona (Reutilizando el servicio existente)
    const personDetails = await getPersonById(db, personId); // Asumiendo que getPersonById existe

    if (!personDetails) {
        return { person_details: null, family_memberships: [] };
    }

    // 2. Obtener los grupos familiares a los que pertenece
    const familyMembershipQuery = `
        SELECT 
            fgm.family_id,
            fgm.parentesco,
            fg.status AS family_status,
            fg.activation_id,
            (fg.jefe_hogar_person_id = $1) AS es_jefe_hogar
        FROM FamilyGroupMembers fgm
        JOIN FamilyGroups fg ON fgm.family_id = fg.family_id
        WHERE fgm.person_id = $1;
    `;
    
    const familyMembershipsResult = await db.query(familyMembershipQuery, [personId]);
    
    return {
        person_details: personDetails,
        family_memberships: familyMembershipsResult.rows
    };
}