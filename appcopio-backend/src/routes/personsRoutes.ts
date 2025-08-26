import { Router, RequestHandler } from 'express';
import pool from '../config/db';

const router = Router();

export type Gender = "F" | "M" | "Otro";
export type Nationality = "CH" | "EXT";
export type Person = {
  rut: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  nacionalidad: Nationality | "";
  genero: Gender | "";
  edad: number | "";
  estudia: boolean;
  trabaja: boolean;
  perdida_trabajo: boolean;
  rubro: string;
  discapacidad: boolean;
  dependencia: boolean;
  parentesco: string; // 1ra persona fijo "Jefe de hogar"
};

// ---------- GET /persons  (list) ----------
export const listPersonsHandler: RequestHandler = async (_req, res) => {
  // Listado simple (ajusta columnas si quieres)
  const { rows } = await pool.query(`
    SELECT
      person_id, rut, nombre, primer_apellido, segundo_apellido,
      nacionalidad, genero, edad, estudia, trabaja,
      perdida_trabajo, rubro, discapacidad, dependencia,
      created_at, updated_at
    FROM Persons
    ORDER BY person_id DESC
    LIMIT 100
  `);
  res.json(rows);
};

// ---------- GET /persons/:id  (show) ----------
export const getPersonHandler: RequestHandler<{ id: string }> = async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    `
    SELECT
      person_id, rut, nombre, primer_apellido, segundo_apellido,
      nacionalidad, genero, edad, estudia, trabaja,
      perdida_trabajo, rubro, discapacidad, dependencia,
      created_at, updated_at
    FROM Persons
    WHERE person_id = $1
    `,
    [id]
  );
  if (rows.length === 0){
    res.status(404).json({ message: 'Person not found' });
    return
  } 
  res.json(rows[0]);
  return;
};



// ---------- POST /persons  (create -> retorna ID) ----------
export const createPersonHandler: RequestHandler<any, { person_id: number }, Person> = async (req, res, next) => {
  try {
    const person_id = await createPerson(req.body);
    res.status(201).json({ person_id });
  } catch (e: any) {
    // Único ejemplo: rut duplicado
    if (e?.code === '23505'){
      res.status(409).json({ message: 'RUT already exists' });
      return;
    } 
    next(e);
  }
};


// Crea la persona y retorna el ID generado
export async function createPerson(p: Person): Promise<number> {
  const sql = `
    INSERT INTO Persons (
      rut, nombre, primer_apellido, segundo_apellido,
      nacionalidad, genero, edad, estudia, trabaja,
      perdida_trabajo, rubro, discapacidad, dependencia
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING person_id
  `;
  const params = [
    p.rut,
    p.nombre,
    p.primer_apellido,
    p.segundo_apellido,
    p.nacionalidad,
    p.genero,
    p.edad as number,      // asumimos normalizado, validaciones después
    p.estudia,
    p.trabaja,
    p.perdida_trabajo,
    p.rubro,
    p.discapacidad,
    p.dependencia,
  ];
  const { rows } = await pool.query<{ person_id: number }>(sql, params);
  return rows[0].person_id;
}


// ---------- PUT /persons/:id  (replace) ----------
export const replacePersonHandler: RequestHandler<{ id: string }, { person_id: number }, Person> = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = req.body;

    const sql = `
      UPDATE Persons SET
        rut = $1,
        nombre = $2,
        primer_apellido = $3,
        segundo_apellido = $4,
        nacionalidad = $5,
        genero = $6,
        edad = $7,
        estudia = $8,
        trabaja = $9,
        perdida_trabajo = $10,
        rubro = $11,
        discapacidad = $12,
        dependencia = $13,
        updated_at = NOW()
      WHERE person_id = $14
      RETURNING person_id
    `;
    const params = [
      p.rut,
      p.nombre,
      p.primer_apellido,
      p.segundo_apellido,
      p.nacionalidad,
      p.genero,
      p.edad as number, // asumimos normalizado
      p.estudia,
      p.trabaja,
      p.perdida_trabajo,
      p.rubro,
      p.discapacidad,
      p.dependencia,
      id,
    ];

    const { rows } = await pool.query<{ person_id: number }>(sql, params);
    if (rows.length === 0){
      res.status(404).json({ message: 'Person not found' });
      return
    } 
    res.json({ person_id: rows[0].person_id });
    return;
  } catch (e: any) {
    if (e?.code === '23505'){
      res.status(409).json({ message: 'RUT already exists' });
      return;
    } 
    next(e);
  }
};


// ---------- Enrutar ----------
router.get('/', listPersonsHandler);
router.get('/:id', getPersonHandler);
router.post('/', createPersonHandler);
router.put('/:id', replacePersonHandler);

export default router;