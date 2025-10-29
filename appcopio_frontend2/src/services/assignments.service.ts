import { api } from "@/lib/api";

export interface ActivationAssignment {
  assignment_id: number;
  activation_id: number;
  user_id: number;
  user_name?: string;
  start_date: string;
  started_by_name?: string;
  end_date?: string;
  ended_by_name?: string;
}

/**
 * Obtiene los encargados activos de una activación específica
 */
export async function listActivationAssignments(
  activationId: number,
  signal?: AbortSignal
): Promise<ActivationAssignment[]> {
  try {
    const { data } = await api.get<ActivationAssignment[]>(
      `/assignments/activations/${activationId}`,
      { signal }
    );
    return data || [];
  } catch (error) {
    console.error(`Error fetching assignments for activation ${activationId}:`, error);
    return [];
  }
}

/**
 * Crea una nueva asignación de encargado
 */
export async function createActivationAssignment(
  activationId: number,
  userId: number
): Promise<ActivationAssignment | null> {
  try {
    const { data } = await api.post<ActivationAssignment>(
      '/assignments/activations',
      {
        activation_id: activationId,
        user_id: userId
      }
    );
    return data;
  } catch (error) {
    console.error('Error creating activation assignment:', error);
    throw error;
  }
}

/**
 * Termina (remueve) una asignación de encargado
 */
export async function endActivationAssignment(
  activationId: number,
  userId: number
): Promise<void> {
  try {
    await api.put('/assignments/activations/end', {
      activation_id: activationId,
      user_id: userId
    });
  } catch (error) {
    console.error('Error ending activation assignment:', error);
    throw error;
  }
}