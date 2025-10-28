/**
 * assignmentRoutes.test.ts
 *
 * Pruebas unitarias (a nivel de ruta) para la HU:
 * "Asignar/Reasignar encargado de centro".
 *
 * Enfoque:
 * - Usamos supertest para invocar la ruta Express real.
 * - Mockeamos completamente PostgreSQL (pool.connect / pool.query) para NO tocar BD.
 * - Validamos los invariantes de negocio: crear, reasignar, idempotencia, borrar/cerrar, consultas.
 *
 * Nota: Como se mockea el pool, esto se considera “unit test” del handler (no integración con BD).
 */

import express from 'express';
import request from 'supertest';
import assignmentRoutes from '../src/routes/assignmentRoutes';

/* -------------------------------------------------------------------------- */
/*                               MOCK DE LA BD                                */
/* -------------------------------------------------------------------------- */
/**
 * Mock del pool de PostgreSQL que usa tu backend. Proporcionamos:
 *  - pool.connect() -> client simulado con .query y .release
 *  - pool.query()   -> para rutas que llaman pool.query directo (sin transacción)
 */
jest.mock('../src/config/db', () => {
  const connect = jest.fn();
  const query = jest.fn();
  return {
    __esModule: true,
    default: { connect, query },
  };
});

import pool from '../src/config/db';

type MockedClient = {
  query: jest.Mock,
  release: jest.Mock,
};

/** Crea una app Express mínima con SOLO las rutas de assignments montadas */
const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/assignments', assignmentRoutes);
  return app;
};

/** “Cliente” de BD simulado (lo que devuelve pool.connect()) */
const makeClient = (): MockedClient => ({
  query: jest.fn(),
  release: jest.fn(),
});

/** Helper para castear a jest.Mock y que TypeScript no se queje */
const asMock = <T = any>(fn: any) => fn as jest.Mock<T>;

/* -------------------------------------------------------------------------- */
/*                                    TESTS                                   */
/* -------------------------------------------------------------------------- */

describe('Assignments (unit tests de la ruta con DB mockeada)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Caso base: crear asignación cuando NO hay activa para ese centro/rol.
     * Flujo esperado (simplificado):
     *  - BEGIN
     *  - SELECT users.is_active (usuario debe existir y estar activo)
     *  - SELECT 1 FROM centers (centro debe existir)
     *  - SELECT activo por center+rol (no hay activo)
     *  - INSERT nuevo tramo
     *  - UPDATE centers SET <puntero rol> = user_id
     *  - COMMIT → 201 con assignment_id
     */
    test('POST /api/assignments crea una asignación cuando no existe activa (Trabajador Municipal)', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_active: true }] }) // SELECT users.is_active
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })                  // SELECT center existe
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })                    // SELECT activo por center+rol
        .mockResolvedValueOnce({ // INSERT nuevo tramo
            rowCount: 1,
            rows: [{
            assignment_id: 123,
            center_id: 'C001',
            user_id: 2,
            role: 'trabajador municipal',
            valid_from: new Date().toISOString(),
            valid_to: null,
            }],
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE centers (puntero municipal_manager_id)
        .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
        .post('/api/assignments')
        .send({ user_id: 2, center_id: 'C001', role: 'Trabajador Municipal' });

        expect(res.status).toBe(201);
        expect(res.body.assignment_id).toBe(123);
    });

    /**
     * Reasignación: existe un activo con OTRO usuario -> cerramos tramo y creamos uno nuevo.
     * Flujo:
     *  - BEGIN
     *  - SELECT users.is_active / SELECT center
     *  - SELECT activo (otro user)
     *  - UPDATE cierre tramo anterior
     *  - INSERT nuevo tramo
     *  - UPDATE centers puntero
     *  - COMMIT → 201
     */
    test('POST /api/assignments reasigna (cierra anterior y crea nueva) cuando hay activa con OTRO usuario', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_active: true }] }) // SELECT users.is_active
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })                  // SELECT center existe
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ assignment_id: 50, user_id: 10 }] }) // SELECT activo: otro user
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE close tramo anterior
        .mockResolvedValueOnce({ // INSERT nuevo tramo
            rowCount: 1,
            rows: [{
            assignment_id: 51,
            center_id: 'C001',
            user_id: 2,
            role: 'trabajador municipal',
            valid_from: new Date().toISOString(),
            valid_to: null,
            }],
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE centers puntero
        .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
        .post('/api/assignments')
        .send({ user_id: 2, center_id: 'C001', role: 'Trabajador Municipal', changed_by: 1 });

        expect(res.status).toBe(201);
        expect(res.body.assignment_id).toBe(51);
    });

    /**
     * Idempotencia: si el mismo usuario ya está activo, no debemos crear ni cerrar tramos.
     * Flujo:
     *  - BEGIN
     *  - SELECT users.is_active / SELECT center
     *  - SELECT activo devuelve mismo user → COMMIT → 200
     */
    test('POST /api/assignments es idempotente si el mismo usuario ya está asignado', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_active: true }] }) // SELECT users.is_active
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })                  // SELECT center existe
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ assignment_id: 70, user_id: 2 }] }) // SELECT: mismo user
        .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
        .post('/api/assignments')
        .send({ user_id: 2, center_id: 'C001', role: 'Trabajador Municipal' });

        expect(res.status).toBe(200);
        expect(res.body.assignment_id).toBe(70);

        // No debe insertar ni cerrar
        const calls = client.query.mock.calls.map(c => String(c[0]));
        expect(calls.some(s => s.includes('INSERT INTO centerassignments'))).toBe(false);
        expect(calls.some(s => s.includes('UPDATE centerassignments') && s.includes('valid_to'))).toBe(false);
    });

    /**
     * DELETE: cerrar la asignación activa y limpiar el puntero en centers.
     */
    test('DELETE /api/assignments cierra la asignación activa y limpia el puntero en centers', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: 'trabajador municipal' }] }) // UPDATE ... RETURNING role
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE centers SET municipal_manager_id = NULL
        .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
        .delete('/api/assignments')
        .send({ user_id: 2, center_id: 'C001', role: 'Trabajador Municipal', changed_by: 1 });

        expect(res.status).toBe(204);
    });

    /**
     * GET auxiliar: listar asignaciones activas por usuario/rol.
     * Esta ruta usa pool.query directo (sin transacción / sin connect()).
     */
    test('GET /api/assignments/active/by-user-role devuelve las asignaciones activas del usuario/rol', async () => {
        const app = makeApp();

        asMock(pool.query).mockResolvedValueOnce({
        rows: [
            { assignment_id: 80, center_id: 'C001', user_id: 2, role: 'contacto ciudadano', valid_from: '2024-01-01', valid_to: null },
        ],
        rowCount: 1,
        });

        const res = await request(app)
        .get('/api/assignments/active/by-user-role')
        .query({ user_id: 2, role: 'contacto ciudadano' });

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(1);
        expect(res.body.assignments[0].assignment_id).toBe(80);
    });

    /**
     * Validación de rol: si llega un rol no reconocido por la API, debe responder 400
     * antes de tocar la BD (no pool.connect).
     */
    test('POST /api/assignments valida rol inválido (400) sin tocar la BD', async () => {
        const app = makeApp();

        const res = await request(app)
        .post('/api/assignments')
        .send({ user_id: 2, center_id: 'C001', role: 'ROL-QUE-NO-EXISTE' });

        expect(res.status).toBe(400);
        expect(asMock(pool.connect)).not.toHaveBeenCalled();
    });

    /**
     * Robustez: si falla el INSERT (o cualquier query intermedia), debe hacer ROLLBACK.
     * Ahora el flujo incluye validaciones previas (usuario/centro) antes de intentar INSERT.
     */
    test('POST /api/assignments hace ROLLBACK si falla el INSERT', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_active: true }] }) // SELECT users.is_active
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })                  // SELECT center existe
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })                    // SELECT: no hay activo
        .mockRejectedValueOnce(new Error('DB insert failed'));               // INSERT falla

        const res = await request(app)
        .post('/api/assignments')
        .send({ user_id: 2, center_id: 'C001', role: 'Trabajador Municipal' });

        expect([400, 500]).toContain(res.status);

        const calls = client.query.mock.calls.map(c => String(c[0]));
        expect(calls).toContain('ROLLBACK');
    });

    /**
     * Mapeo de puntero correcto para rol "Comunidad":
     * Verificamos que tras el INSERT, se actualice la columna correcta del centro.
     * Además tu ruta, para "contacto ciudadano", cierra otros tramos del usuario
     * y limpia punteros en centers de otros centros.
     */
    test('POST /api/assignments (Comunidad) actualiza el puntero correcto en centers', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_active: true }] }) // SELECT users.is_active
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })                  // SELECT center existe
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })                    // SELECT no hay activo
        .mockResolvedValueOnce({ // INSERT nuevo tramo
            rowCount: 1,
            rows: [{
            assignment_id: 222,
            center_id: 'C001',
            user_id: 9,
            role: 'comunidad',
            valid_from: new Date().toISOString(),
            valid_to: null,
            }],
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE centers SET comunity_charge_id = $user_id
        .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE centerassignments: cerrar otros (puede ser 0)
        .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE centers: limpiar punteros otros (puede ser 0)
        .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
        .post('/api/assignments')
        .send({ user_id: 9, center_id: 'C001', role: 'Comunidad' });

        expect(res.status).toBe(201);

        const calls = client.query.mock.calls.map(([sql]) => String(sql).toLowerCase());
        const updatedCentersSql = calls.find(s => s.startsWith('update centers'));
        const okColumn =
        updatedCentersSql?.includes('comunity_charge_id') ||
        updatedCentersSql?.includes('community_charge_id');

        expect(okColumn).toBe(true);
    });

    /**
     * DELETE sin asignación activa:
     * Si no hay activa que cerrar, tu ruta podría devolver 404 o 204 (idempotente).
     * Para no hacer la prueba frágil, aceptamos cualquiera de las dos.
     */
    test('DELETE /api/assignments cuando NO hay activa devuelve 404 o 204 (idempotente)', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // UPDATE ... RETURNING role (no encontró)
        .mockResolvedValueOnce({}); // COMMIT o ROLLBACK (según tu implementación)

        const res = await request(app)
        .delete('/api/assignments')
        .send({ user_id: 999, center_id: 'C001', role: 'Trabajador Municipal', changed_by: 1 });

        expect([204, 404]).toContain(res.status);
    });

    /* ------------------------------------------------------------------------ */
    /*            PRUEBAS OPCIONALES — Requieren validaciones en ruta           */
    /* ------------------------------------------------------------------------ */

    test('POST /api/assignments rechaza si el usuario está inactivo (requiere validación en ruta)', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // SELECT user (is_active = false)
            rowCount: 1,
            rows: [{ user_id: 2, is_active: false }],
        })
        .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
        .post('/api/assignments')
        .send({ user_id: 2, center_id: 'C001', role: 'Trabajador Municipal' });

        expect(res.status).toBe(400);
    });

    test('POST /api/assignments rechaza si el centro NO existe (requiere validación en ruta)', async () => {
        const app = makeApp();
        const client = makeClient();
        asMock(pool.connect).mockResolvedValueOnce(client);

        client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_active: true }] }) // SELECT users.is_active OK
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // SELECT center inexistente
        .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
        .post('/api/assignments')
        .send({ user_id: 2, center_id: 'C-QUE-NO-EXISTE', role: 'Trabajador Municipal' });

        expect([400, 404]).toContain(res.status);
    });
});
