// src/config/inventoryRatios.ts
// Ratios de insumos básicos por persona por día/semana según categoría

export interface ItemRatio {
  name: string;
  quantityPerPerson: number; // cantidad por persona
  period: 'daily' | 'weekly' | 'monthly'; // período del ratio
  unit: string; // unidad de medida
  priority: 'high' | 'medium' | 'low'; // prioridad del insumo
}

export interface CategoryRatios {
  [category: string]: ItemRatio[];
}

// Ratios base definidos para cálculo de necesidades
export const INVENTORY_RATIOS: CategoryRatios = {
  "Alimentos y Bebidas": [
    { name: "Agua potable", quantityPerPerson: 3, period: "daily", unit: "litros", priority: "high" },
    { name: "Comida enlatada", quantityPerPerson: 2, period: "daily", unit: "latas", priority: "high" },
    { name: "Pan", quantityPerPerson: 1, period: "daily", unit: "unidades", priority: "medium" },
    { name: "Leche", quantityPerPerson: 1, period: "daily", unit: "litros", priority: "medium" },
    { name: "Frutas", quantityPerPerson: 2, period: "daily", unit: "unidades", priority: "medium" },
  ],
  
  "Ropa de Cama y Abrigo": [
    { name: "Frazadas", quantityPerPerson: 2, period: "monthly", unit: "unidades", priority: "high" },
    { name: "Almohadas", quantityPerPerson: 1, period: "monthly", unit: "unidades", priority: "high" },
    { name: "Colchones", quantityPerPerson: 1, period: "monthly", unit: "unidades", priority: "high" },
    { name: "Ropa de abrigo", quantityPerPerson: 3, period: "monthly", unit: "prendas", priority: "medium" },
    { name: "Sábanas", quantityPerPerson: 2, period: "monthly", unit: "juegos", priority: "medium" },
  ],
  
  "Higiene Personal": [
    { name: "Jabón", quantityPerPerson: 1, period: "weekly", unit: "unidades", priority: "high" },
    { name: "Champú", quantityPerPerson: 0.5, period: "weekly", unit: "frascos", priority: "medium" },
    { name: "Papel higiénico", quantityPerPerson: 4, period: "weekly", unit: "rollos", priority: "high" },
    { name: "Cepillo de dientes", quantityPerPerson: 1, period: "monthly", unit: "unidades", priority: "medium" },
    { name: "Pasta dental", quantityPerPerson: 0.25, period: "weekly", unit: "tubos", priority: "medium" },
    { name: "Toallas sanitarias", quantityPerPerson: 10, period: "weekly", unit: "unidades", priority: "high" },
  ],
  
  "Medicamentos y Primeros Auxilios": [
    { name: "Vendas", quantityPerPerson: 2, period: "monthly", unit: "rollos", priority: "high" },
    { name: "Alcohol", quantityPerPerson: 0.1, period: "weekly", unit: "litros", priority: "high" },
    { name: "Paracetamol", quantityPerPerson: 5, period: "monthly", unit: "pastillas", priority: "medium" },
    { name: "Gasas", quantityPerPerson: 10, period: "monthly", unit: "unidades", priority: "medium" },
  ],
  
  "Vestimenta": [
    { name: "Ropa interior", quantityPerPerson: 7, period: "monthly", unit: "prendas", priority: "high" },
    { name: "Calcetines", quantityPerPerson: 7, period: "monthly", unit: "pares", priority: "high" },
    { name: "Pantalones", quantityPerPerson: 3, period: "monthly", unit: "unidades", priority: "medium" },
    { name: "Camisetas", quantityPerPerson: 5, period: "monthly", unit: "unidades", priority: "medium" },
    { name: "Zapatos", quantityPerPerson: 1, period: "monthly", unit: "pares", priority: "medium" },
  ],
  
  "Útiles de Limpieza": [
    { name: "Cloro", quantityPerPerson: 0.1, period: "weekly", unit: "litros", priority: "high" },
    { name: "Detergente", quantityPerPerson: 0.2, period: "weekly", unit: "kilos", priority: "medium" },
    { name: "Escobas", quantityPerPerson: 0.1, period: "monthly", unit: "unidades", priority: "low" },
    { name: "Trapeadores", quantityPerPerson: 0.1, period: "monthly", unit: "unidades", priority: "low" },
  ],
};

// Función para calcular las necesidades basadas en capacidad del centro
export function calculateNeeds(
  capacity: number, 
  category: string, 
  daysToCalculate: number = 7
): ItemRatio[] {
  const categoryRatios = INVENTORY_RATIOS[category] || [];
  
  return categoryRatios.map(ratio => {
    let totalQuantity: number;
    
    // Calcular según el período del ratio
    switch (ratio.period) {
      case 'daily':
        totalQuantity = ratio.quantityPerPerson * capacity * daysToCalculate;
        break;
      case 'weekly':
        totalQuantity = ratio.quantityPerPerson * capacity * (daysToCalculate / 7);
        break;
      case 'monthly':
        totalQuantity = ratio.quantityPerPerson * capacity * (daysToCalculate / 30);
        break;
      default:
        totalQuantity = ratio.quantityPerPerson * capacity;
    }
    
    return {
      ...ratio,
      quantityPerPerson: Math.ceil(totalQuantity), // Redondeamos hacia arriba
    };
  });
}

// Función para obtener todas las categorías disponibles
export function getAvailableCategories(): string[] {
  return Object.keys(INVENTORY_RATIOS);
}

// Función para obtener color según prioridad
export function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high': return '#f44336'; // rojo
    case 'medium': return '#ff9800'; // naranja
    case 'low': return '#4caf50'; // verde
    default: return '#757575'; // gris
  }
}