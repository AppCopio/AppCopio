// src/utils/shiftUtils.ts

/**
 * Formatea el estado de un turno para mostrarlo de manera amigable
 * @param status - Estado del turno en formato de base de datos
 * @returns Estado formateado para mostrar al usuario
 */
export const formatShiftStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'programado': 'Programado',
    'en_curso': 'En Curso',
    'completado': 'Completado',
    'cancelado': 'Cancelado'
  };
  return statusMap[status] || status;
};

/**
 * Obtiene el color de fondo según el estado del turno
 */
export const getShiftStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'programado': '#dbeafe',
    'en_curso': '#dcfce7',
    'completado': '#f3f4f6',
    'cancelado': '#fee2e2'
  };
  return colorMap[status] || '#f3f4f6';
};

/**
 * Obtiene el color de texto según el estado del turno
 */
export const getShiftStatusTextColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'programado': '#1e40af',
    'en_curso': '#166534',
    'completado': '#4b5563',
    'cancelado': '#991b1b'
  };
  return colorMap[status] || '#4b5563';
};
