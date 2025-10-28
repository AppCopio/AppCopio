// src/services/personService.ts
import pool from "../config/db";
import type { Person, FibePersonData } from "../types/person";
import type { Db } from "../types/db";

const normalizeRut = (v: string) => (v || "").replace(/[^0-9kK]/g, "").toUpperCase();

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