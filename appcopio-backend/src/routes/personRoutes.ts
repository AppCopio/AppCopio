import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { PoolClient } from 'pg'; // Para servicios

export type PersonInsert = {
  rut: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string | null;
  nacionalidad?: 'CH' | 'EXT' | null;
  genero?: 'F' | 'M' | 'Otro' | null;
  edad?: number | null;
  estudia?: boolean | null;
  trabaja?: boolean | null;
  perdida_trabajo?: boolean | null;
  rubro?: string | null;
  discapacidad?: boolean | null;
  dependencia?: boolean | null;
};

const router = Router();

// Helpers de normalización/validación
const allowedNacionalidad = new Set(['CH', 'EXT']);
const normalizeNacionalidad = (v?: unknown): 'CH' | 'EXT' | null => {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toUpperCase();
  if (allowedNacionalidad.has(s as any)) return s as 'CH' | 'EXT';
  throw new Error('VALIDATION_NACIONALIDAD');
};

const normalizeGenero = (v?: unknown): 'F' | 'M' | 'Otro' | null => {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toUpperCase();
  if (s === 'F' || s === 'M') return s as 'F' | 'M';
  if (s === 'OTRO') return 'Otro';
  throw new Error('VALIDATION_GENERO');
};

const ensureBooleanOrNull = (v: unknown): boolean | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v;
  throw new Error('VALIDATION_BOOLEAN');
};

const ensureEdadOrNull = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 130) return v;
  throw new Error('VALIDATION_EDAD');
};

// INSERT: Añadir persona
const addPersonHandler: RequestHandler = async (req, res): Promise<void> => {
  try {
    const {
      rut,
      nombre,
      primer_apellido,
      segundo_apellido,
      nacionalidad,
      genero,
      edad,
      estudia,
      trabaja,
      perdida_trabajo,
      rubro,
      discapacidad,
      dependencia,
    } = req.body ?? {};

    // Requeridos
    if (!rut || typeof rut !== 'string' || rut.trim() === '') {
      res.status(400).json({ msg: 'El RUT es requerido.' });
      return;
    }
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      res.status(400).json({ msg: 'El nombre es requerido.' });
      return;
    }
    if (!primer_apellido || typeof primer_apellido !== 'string' || primer_apellido.trim() === '') {
      res.status(400).json({ msg: 'El primer apellido es requerido.' });
      return;
    }

    // Normalizaciones / validaciones
    const rutVal = rut.trim();
    const nombreVal = nombre.trim();
    const primerApellidoVal = primer_apellido.trim();
    const segundoApellidoVal = typeof segundo_apellido === 'string' ? segundo_apellido.trim() : null;

    let nacionalidadVal: 'CH' | 'EXT' | null = null;
    try {
      nacionalidadVal = normalizeNacionalidad(nacionalidad);
    } catch {
      res.status(400).json({ msg: "La nacionalidad debe ser 'CH' o 'EXT'." });
      return;
    }

    let generoVal: 'F' | 'M' | 'Otro' | null = null;
    try {
      generoVal = normalizeGenero(genero);
    } catch {
      res.status(400).json({ msg: "El género debe ser 'F', 'M' u 'Otro'." });
      return;
    }

    let edadVal: number | null = null;
    try {
      edadVal = ensureEdadOrNull(edad);
    } catch {
      res.status(400).json({ msg: 'La edad debe ser un entero entre 0 y 130.' });
      return;
    }

    let estudiaVal: boolean | null;
    let trabajaVal: boolean | null;
    let perdidaTrabajoVal: boolean | null;
    let discapacidadVal: boolean | null;
    let dependenciaVal: boolean | null;
    try {
      estudiaVal = ensureBooleanOrNull(estudia);
      trabajaVal = ensureBooleanOrNull(trabaja);
      perdidaTrabajoVal = ensureBooleanOrNull(perdida_trabajo);
      discapacidadVal = ensureBooleanOrNull(discapacidad);
      dependenciaVal = ensureBooleanOrNull(dependencia);
    } catch {
      res.status(400).json({ msg: 'Los campos booleanos deben ser true/false.' });
      return;
    }

    const rubroVal = typeof rubro === 'string' ? rubro.trim() : null;

    // Insert
    const insertSql = `
      INSERT INTO Persons (
        rut, nombre, primer_apellido, segundo_apellido,
        nacionalidad, genero, edad,
        estudia, trabaja, perdida_trabajo, rubro,
        discapacidad, dependencia
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,$10,$11,
        $12,$13
      )
      RETURNING person_id;
    `;

    const params = [
      rutVal,
      nombreVal,
      primerApellidoVal,
      segundoApellidoVal,
      nacionalidadVal,
      generoVal,
      edadVal,
      estudiaVal,
      trabajaVal,
      perdidaTrabajoVal,
      rubroVal,
      discapacidadVal,
      dependenciaVal,
    ];

    const result = await pool.query(insertSql, params);
    const { person_id } = result.rows[0];
    res.status(201).json({ person_id });
    return;
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ msg: 'El RUT ya existe.' });
      return;
    }
    if (err?.code === '23502') {
      res.status(400).json({ msg: 'Faltan campos obligatorios.' });
      return;
    }
    if (err?.code === '23514') {
      res.status(400).json({ msg: 'Valor inválido para un campo con restricción.' });
      return;
    }
    console.error('Error al añadir persona:', err);
    res.status(500).send('Error del servidor');
    return;
  }
};

/**
 * Inserta una persona dentro de una transacción y retorna su person_id.
 * No hace validaciones!!! Agregar después si es necesario */
export async function insertPersonTx(client: PoolClient, p: PersonInsert): Promise<number> {
  const sql = `
    INSERT INTO Persons (
      rut, nombre, primer_apellido, segundo_apellido,
      nacionalidad, genero, edad,
      estudia, trabaja, perdida_trabajo, rubro,
      discapacidad, dependencia
    ) VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,
      $8,$9,$10,$11,
      $12,$13
    )
    RETURNING person_id;
  `;
  const params = [
    p.rut,
    p.nombre,
    p.primer_apellido,
    p.segundo_apellido ?? null,
    p.nacionalidad ?? null,
    p.genero ?? null,
    p.edad ?? null,
    p.estudia ?? null,
    p.trabaja ?? null,
    p.perdida_trabajo ?? null,
    p.rubro ?? null,
    p.discapacidad ?? null,
    p.dependencia ?? null,
  ];
  const { rows } = await client.query(sql, params);
  return rows[0].person_id as number;
}


// Registro de la ruta
router.post('/', addPersonHandler);

export default router;