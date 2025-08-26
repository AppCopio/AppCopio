export interface Center {
  id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  capacity: number;
  isActive: boolean;
}

export const potentialCentersData: Center[] = [
  { id: 'C001', name: 'Gimnasio Municipal Playa Ancha', address: 'Av. Playa Ancha 123', type: 'Albergue', capacity: 150, isActive: false },
  { id: 'C002', name: 'Liceo Bicentenario Valparaíso', address: 'Calle Independencia 456', type: 'Acopio', capacity: 0, isActive: true },
  { id: 'C003', name: 'Sede Vecinal Cerro Cordillera', address: 'Pasaje Esmeralda 789', type: 'Acopio', capacity: 0, isActive: false },
  { id: 'C004', name: 'Estadio Elías Figueroa', address: 'Av. Altamirano 1011', type: 'Albergue', capacity: 500, isActive: true },
  { id: 'C005', name: 'Parroquia La Matriz', address: 'Plaza Echaurren 1213', type: 'Acopio', capacity: 0, isActive: false },
  { id: 'C006', name: 'Escuela República de Alemania', address: 'Subida Ecuador 1415', type: 'Albergue', capacity: 80, isActive: false },
];