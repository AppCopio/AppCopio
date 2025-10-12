# HdU09 - Visualizar inventario y necesidades

## Descripción
Como encargado de albergue necesito poder visualizar los insumos básicos recibidos y necesitados de un centro para tomar decisiones acerca de la distribución de insumos.

## Implementación Completada

### ✅ Criterios cumplidos:

1. **Visualización de categorías con cantidades actuales y necesidades calculadas**
   - Se muestra cada categoría de insumos relevante (Alimentos, Ropa de Cama, Higiene Personal, etc.)
   - Cantidad actual de insumos recibidos por categoría
   - Cantidad aproximada de insumos necesarios calculada en base a la capacidad del centro

2. **Funcionalidad offline**
   - Si se pierde la conexión, el sistema muestra la última información sincronizada
   - Indicador visual de estado offline
   - Datos persistidos en localStorage

### 📁 Archivos creados/modificados:

#### Nuevos archivos:
- `src/config/inventoryRatios.ts` - Configuración de ratios por categoría e insumo
- `src/components/inventory/ResourcesAndNeeds.tsx` - Componente principal de análisis
- `src/components/inventory/ResourcesAndNeeds.css` - Estilos del componente

#### Archivos modificados:
- `src/pages/InventoryPage/InventoryPage.tsx` - Integración del nuevo componente
- `src/pages/InventoryPage/InventoryPage.css` - Estilos adicionales

### 🧮 Cálculo de ratios:

Los ratios están definidos por:
- **Categoría de insumo** (Alimentos, Higiene, Vestimenta, etc.)
- **Cantidad por persona** según período (diario/semanal/mensual)
- **Prioridad** (alta/media/baja) con indicadores visuales
- **Cálculo automático** basado en capacidad del centro

### 📊 Características principales:

1. **Dashboard visual** con porcentajes de cobertura
2. **Indicadores de estado** (Bien abastecido, Moderado, Bajo, Crítico)
3. **Desglose detallado** por insumo individual
4. **Botón toggle** para mostrar/ocultar análisis
5. **Persistencia offline** con localStorage
6. **Detección automática** de estado de conexión

### 🎨 Interfaz de usuario:

- **Cards por categoría** con indicador de porcentaje de cobertura
- **Barras de progreso** visuales
- **Colores semaforizados** según estado de abastecimiento
- **Indicadores de prioridad** por insumo
- **Mensaje offline** con timestamp de última sincronización

### 🔧 Configuración de ratios:

Los ratios se pueden ajustar editando `src/config/inventoryRatios.ts`:

```typescript
"Alimentos y Bebidas": [
  { name: "Agua potable", quantityPerPerson: 3, period: "daily", unit: "litros", priority: "high" },
  // ... más insumos
]
```

### 🌐 Soporte offline:

- **Detección automática** del estado de conexión
- **Persistencia en localStorage** de inventario y capacidad
- **Carga automática** de datos guardados cuando no hay conexión
- **Indicador visual** de estado offline con timestamp
- **Resincronización automática** al recuperar conexión

### 📱 Responsive:

- **Grid adaptativo** para diferentes tamaños de pantalla
- **Layout optimizado** para móviles y tablets
- **Botones accesibles** con tooltips informativos

## Puntos de historia: 5
**Justificación**: La implementación incluye cálculos complejos de ratios, persistencia offline, interfaz visual completa y integración con sistemas existentes.