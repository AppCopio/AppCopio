// src/services/residents.service.ts
import {api} from "@/lib/api";
import {
  ActiveCenter,
  CapacityInfo,
  Person,
  ResidentGroup,
  DepartureReason,
} from "@/types/residents";

export async function getCenterCapacity(centerId: string): Promise<CapacityInfo> {
  const { data } = await api.get(`/centers/${centerId}/capacity`);
  return data;
}

export async function listResidentGroups(centerId: string): Promise<ResidentGroup[]> {
  const { data } = await api.get(`/centers/${centerId}/residents`);
  return data;
}

export async function listPeopleByCenter(
  centerId: string,
  params: {
    nombre?: string;
    rut?: string;
    fechaIngreso?: string;
    fechaSalida?: string;
    edad?: string | number;
    genero?: string;
  }
): Promise<Person[]> {
  const { data } = await api.get(`/centers/${centerId}/people`, { params });
  return data;
}

export async function listActiveCentersForCenter(centerId: string): Promise<ActiveCenter[]> {
  const { data } = await api.get(`/centers/${centerId}/active-centers`);
  return data;
}

export async function registerFamilyDeparture(input: {
  family_id: number;
  departure_reason: DepartureReason;
  destination_activation_id: string | null;
  departure_date: string; // YYYY-MM-DD
}): Promise<void> {
  const { family_id, ...payload } = input;
  await api.patch(`/family/${family_id}/depart`, payload);
}
