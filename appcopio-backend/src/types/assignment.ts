export type ActivationAssignment = {
    assignment_id: number;
    activation_id: number;
    user_id: number;
    user_name?: string;
    start_date: Date;
    started_by_name?: string;
    end_date: Date | null;
    ended_by_name?: string;
}

export type ActivationAssignmentDB = {
    assignment_id: number;
    activation_id: number;
    user_id: number;
    start_date: Date;
    started_by: number;
    end_date: Date | null;
    ended_by: number | null;
}

export type CreateActivationAssignmentInput = {
    activation_id: number;
    user_id: number;
    started_by: number;
}

export type EndActivationAssignmentInput = {
    activation_id: number;
    user_id: number;     // El user_id del encargado que queremos des-asignar
    ended_by: number;    // El user_id del admin/coordinador que realiza la acción
}