export type HouseholdData = {
  fibeFolio: string;
  observations: string;
  selectedNeeds: string[]; // máx 3
};

export type FamilyMemberCreate = {
  family_id: number;
  person_id: number;
  parentesco: string; // ej: 'Jefe de hogar', 'Hijo', etc.
};