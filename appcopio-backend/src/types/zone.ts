export interface MunicipalZone {
  id: number;
  name: string;
  type: 'OMZ' | 'OMZ_OFFICE';
  geojson: object;
  icon?: string;
  color?: string;
  fill?: string;
  stroke?: string;
  metadata?: object;
}
