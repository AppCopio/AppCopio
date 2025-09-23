// src/routes/fibeRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import type { Db } from "../types/db";
import type { FormData } from "../types/fibe";
import { FibePersonData, Person, Gender } from "../types/person";

import { createPersonDB } from "../services/personService";
import { createFamilyGroupInDB } from "../services/familyService";
import { createFamilyMemberDB, hasActiveMembershipByRutInActivationDB, findActiveHeadFamilyInActivationByRut } from "../services/familyMemberService";

const router = Router();

// =================================================================
// 1. SECCIÓN DE UTILIDADES (Helpers & DB Functions)
// =================================================================

async function assertActivationIsOpen(db: Db, activation_id: number): Promise<void> {
    const { rowCount } = await db.query(
        `SELECT 1 FROM CentersActivations WHERE activation_id = $1 AND ended_at IS NULL`,
        [activation_id]
    );
    if (rowCount === 0) {
        throw { status: 400, message: "La activación del centro no es válida o ha sido cerrada." };
    }
}

/**
 * NUEVO: Helper para transformar los datos del formulario FIBE a un objeto
 * limpio y seguro para ser insertado en la base de datos.
 * Esto soluciona los errores de tipos incompatibles.
 * @param data Los datos de la persona desde el formulario.
 * @returns Un objeto que cumple con el tipo PersonCreate.

function toPersonCreate(data: FibePersonData): FibePersonData {
    return {
        rut: data.rut,
        nombre: data.nombre,
        primer_apellido: data.primer_apellido,
        segundo_apellido: data.segundo_apellido || null,
        // Si genero es "", lo convertimos a null.
        genero: data.genero === "" ? null : data.genero as Gender, 
        // Si edad es "", lo convertimos a null.
        edad: data.edad === "" ? null : data.edad as number,
    };
}
 */
// =================================================================
// 2. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

const processFibeRegistration: RequestHandler = async (req, res) => {
    const { activation_id, data } = req.body as { activation_id: number; data: FormData };
    const { hogar, personas } = data || {};

    if (!activation_id || !Array.isArray(personas) || personas.length < 1) {
        res.status(400).json({ error: "Se requieren 'activation_id' y al menos una persona en el array 'personas'." });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        await assertActivationIsOpen(client, activation_id);

        const jefeDeHogarData: FibePersonData = personas[0];

        const existingFamilyHead = await findActiveHeadFamilyInActivationByRut(client, activation_id, jefeDeHogarData.rut);
        if (existingFamilyHead) {
            throw { status: 409, message: "Esta persona ya es jefe de otro hogar en esta activación.", detail: { rut: jefeDeHogarData.rut, family_id: existingFamilyHead.family_id } };
        }

        const existingMembership = await hasActiveMembershipByRutInActivationDB(client, activation_id, jefeDeHogarData.rut);
        if (existingMembership) {
            throw { status: 409, message: "El jefe de hogar ya es miembro de otra familia en esta activación.", detail: { rut: jefeDeHogarData.rut, family_id: existingMembership.family_id } };
        }
        
        const jefePersonId = await createPersonDB(client, jefeDeHogarData);
        
        const familyId = await createFamilyGroupInDB(client, {
            activation_id,
            jefe_hogar_person_id: jefePersonId,
            data: hogar,
        });

        const jefeMemberId = await createFamilyMemberDB(client, {
            family_id: familyId,
            person_id: jefePersonId,
            parentesco: jefeDeHogarData.parentesco,
        });

        const createdMembers = [];
        for (let i = 1; i < personas.length; i++) {
            const memberData: FibePersonData = personas[i];
            
            const memberMembership = await hasActiveMembershipByRutInActivationDB(client, activation_id, memberData.rut);
            if (memberMembership) {
                throw { status: 409, message: `La persona con RUT ${memberData.rut} ya pertenece a otra familia.`, detail: { index: i, rut: memberData.rut, family_id: memberMembership.family_id } };
            }
            
            const personId = await createPersonDB(client, memberData);
            
            const memberId = await createFamilyMemberDB(client, {
                family_id: familyId,
                person_id: personId,
                parentesco: memberData.parentesco,
            });
            createdMembers.push({ index: i, person_id: personId, member_id: memberId });
        }

        await client.query("COMMIT");
        res.status(201).json({
            message: "Registro FIBE procesado exitosamente.",
            family_id: familyId,
            jefe_person_id: jefePersonId,
            jefe_member_id: jefeMemberId,
            members: createdMembers
        });

    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error("Error en processFibeRegistration:", error);
        
        if (error.status) {
            res.status(error.status).json({ error: error.message, detail: error.detail });
        } else if (error.code === '23505') {
            res.status(409).json({ error: "Error de duplicidad. Posiblemente un RUT ya existe.", detail: error.detail });
        } else {
            res.status(500).json({ error: "Error interno del servidor durante el registro FIBE." });
        }
    } finally {
        client.release();
    }
};

// =================================================================
// 3. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.post("/register", processFibeRegistration);

export default router;