// Utilidades para transformar estados operativos entre backend y frontend

export type OperationalStatusBackend = 'abierto' | 'cerrado temporalmente' | 'capacidad maxima';
export type OperationalStatusFrontend = 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima';

export const transformToFrontend = (backendStatus: string): OperationalStatusFrontend => {
  switch (backendStatus) {
    case 'abierto':
      return 'Abierto';
    case 'cerrado temporalmente':
      return 'Cerrado Temporalmente';
    case 'capacidad maxima':
      return 'Capacidad Máxima';
    default:
      return 'Abierto'; // fallback
  }
};

export const transformToBackend = (frontendStatus: OperationalStatusFrontend): OperationalStatusBackend => {
  switch (frontendStatus) {
    case 'Abierto':
      return 'abierto';
    case 'Cerrado Temporalmente':
      return 'cerrado temporalmente';
    case 'Capacidad Máxima':
      return 'capacidad maxima';
    default:
      return 'abierto'; // fallback
  }
};
