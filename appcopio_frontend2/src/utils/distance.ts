import type { UserLocation } from '@/hooks/useGeolocation';
import type { Center } from '@/types/center';

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param lat1 Latitud del primer punto
 * @param lon1 Longitud del primer punto
 * @param lat2 Latitud del segundo punto
 * @param lon2 Longitud del segundo punto
 * @returns Distancia en kilómetros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convierte grados a radianes
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calcula la distancia desde la ubicación del usuario hasta un centro
 * @param userLocation Ubicación del usuario
 * @param center Centro de acopio
 * @returns Distancia en kilómetros o null si no se puede calcular
 */
export function getDistanceToCenter(
  userLocation: UserLocation | null,
  center: Center
): number | null {
  if (!userLocation || !center.latitude || !center.longitude) {
    return null;
  }

  const centerLat = typeof center.latitude === 'string' 
    ? parseFloat(center.latitude) 
    : center.latitude;
  const centerLng = typeof center.longitude === 'string' 
    ? parseFloat(center.longitude) 
    : center.longitude;

  if (isNaN(centerLat) || isNaN(centerLng)) {
    return null;
  }

  return calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    centerLat,
    centerLng
  );
}

/**
 * Formatea la distancia para mostrar al usuario
 * @param distance Distancia en kilómetros
 * @returns String formateado (ej: "1.2 km", "850 m")
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
}

/**
 * Encuentra los N centros más cercanos al usuario
 * @param centers Array de centros
 * @param userLocation Ubicación del usuario
 * @param count Número de centros más cercanos a devolver
 * @returns Array de IDs de centros más cercanos
 */
export function getNearestCenters(
  centers: Center[],
  userLocation: UserLocation | null,
  count: number = 3
): string[] {
  if (!userLocation || !centers.length) {
    return [];
  }

  const centersWithDistance = centers
    .map(center => {
      const distance = getDistanceToCenter(userLocation, center);
      return {
        center_id: center.center_id,
        distance,
      };
    })
    .filter(item => item.distance !== null)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  return centersWithDistance
    .slice(0, count)
    .map(item => item.center_id);
}

/**
 * Verifica si un centro debe ser destacado como uno de los más cercanos
 * @param centerId ID del centro
 * @param nearestIds Array de IDs de centros más cercanos
 * @returns true si el centro debe ser destacado
 */
export function isCenterNearby(centerId: string, nearestIds: string[]): boolean {
  return nearestIds.includes(centerId);
}
