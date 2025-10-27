# 📦 Implementación HDU - Gestión de Inventario (Backend)

## ✅ Criterios de Aceptación Implementados

### 1️⃣ Añadir/Incrementar Items
✅ **Implementado** en `addInventoryItem()` (centerService.ts)
- Crea nuevo ítem si no existe
- Incrementa cantidad si ya existe (UPSERT)
- Registra automáticamente en historial

### 2️⃣ Sistema de Cajas
✅ **Implementado** en `createBox()` (inventoryService.ts)
- Permite crear múltiples ítems en una sola operación
- Soporta ítems existentes (por ID) o nuevos (por nombre)
- **Endpoint**: `POST /api/centers/:centerId/inventory/box`

### 3️⃣ Salidas con Destinatario
✅ **Implementado** en `registerInventoryExit()` (inventoryService.ts)
- Descuenta del stock automáticamente
- Registra destinatario (family_id)
- Registra motivo de la salida
- **Endpoints**: 
  - `POST /api/centers/:centerId/inventory/exit` (individual)
  - `POST /api/centers/:centerId/inventory/exit/bulk` (múltiple)

### 4️⃣ Validación de Eliminación
✅ **Implementado** en `deleteInventoryItem()` (centerService.ts)
- Valida que stock sea 0 antes de eliminar
- Mensaje: "No se puede eliminar un recurso que aún tiene stock. Stock actual: X"
- **Endpoint**: `DELETE /api/centers/:centerId/inventory/:itemId`

### 5️⃣ Trazabilidad Completa
✅ **Implementado** en todas las funciones
- Registra automáticamente: fecha, hora, usuario
- Tipo de operación (ADD/SUB/ADJUST)
- Cantidad modificada
- Efecto en stock final
- Destinatario (cuando aplica)

### 6️⃣ Validación de Stock Suficiente
✅ **Implementado** en `registerInventoryExit()`
- Valida stock disponible antes de permitir salida
- Mensaje: "Stock insuficiente. Disponible: X, Solicitado: Y"
- No permite completar operación si no hay stock

---

## 🔌 Nuevos Endpoints

### Salidas de Inventario
```http
POST /api/centers/:centerId/inventory/exit
Content-Type: application/json

{
  "itemId": 5,
  "quantity": 10,
  "familyId": 123,
  "reason": "Entrega semanal de mercadería",
  "notes": "Familia de 4 personas"
}
```

### Salidas Múltiples
```http
POST /api/centers/:centerId/inventory/exit/bulk
Content-Type: application/json

{
  "exits": [
    {
      "itemId": 5,
      "quantity": 10,
      "familyId": 123,
      "reason": "Entrega quincenal"
    },
    {
      "itemId": 8,
      "quantity": 5,
      "familyId": 123,
      "reason": "Entrega quincenal"
    }
  ]
}
```

### Sistema de Cajas
```http
POST /api/centers/:centerId/inventory/box
Content-Type: application/json

{
  "name": "Caja Emergencia #1",
  "description": "Donación Cruz Roja",
  "items": [
    {
      "itemName": "Frazadas",
      "categoryId": 2,
      "unit": "unidades",
      "quantity": 20
    },
    {
      "itemId": 5,
      "quantity": 10
    }
  ]
}
```

### Estadísticas
```http
GET /api/centers/:centerId/inventory/stats?days=30
```

---

## 🗄️ Migración de Base de Datos

**IMPORTANTE**: Ejecutar antes de usar los nuevos endpoints

```bash
# Desde el directorio del proyecto
psql -U postgres -d appcopio_db -f db_init/004_add_family_to_inventory_log.sql
```

**¿Qué hace?**
- Añade columna `family_id` a tabla `InventoryLog`
- Crea índice para mejorar performance
- Es idempotente (seguro ejecutar múltiples veces)

---

## 📁 Archivos Modificados

### `src/services/inventoryService.ts` ⭐ NUEVAS FUNCIONES
- `registerInventoryExit()` - Salida individual
- `registerMultipleExits()` - Salidas múltiples
- `createBox()` - Sistema de cajas
- `getInventoryStats()` - Estadísticas
- `createLogEntry()` - Actualizada con family_id
- `getLogsByCenterId()` - Actualizada con información de familia

### `src/services/centerService.ts` ✏️ MEJORADA
- `deleteInventoryItem()` - Validación de stock > 0

### `src/routes/centerRoutes.ts` 🔌 NUEVAS RUTAS
- `POST /:centerId/inventory/exit` 
- `POST /:centerId/inventory/exit/bulk`
- `POST /:centerId/inventory/box`
- `GET /:centerId/inventory/stats`

### `db_init/004_add_family_to_inventory_log.sql` 🆕 MIGRACIÓN
- Script de migración para añadir family_id

---

## 🚀 Pasos para Implementar

### 1. Ejecutar Migración (OBLIGATORIO)
```bash
cd appcopio-backend
psql -U postgres -d appcopio_db -f db_init/004_add_family_to_inventory_log.sql
```

### 2. Verificar Compilación
```bash
npm run build
```

### 3. Reiniciar Servidor
```bash
npm start
# o
npm run dev
```

---

## 🧪 Ejemplos de Uso

### Crear Caja con Recursos
```javascript
const response = await fetch('/api/centers/C001/inventory/box', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Caja de Emergencia #1',
    description: 'Primera caja de ayuda humanitaria',
    items: [
      { itemName: 'Agua', categoryId: 1, unit: 'litros', quantity: 50 },
      { itemName: 'Frazadas', categoryId: 2, unit: 'unidades', quantity: 20 }
    ]
  })
});
```

### Registrar Salida a Familia
```javascript
const response = await fetch('/api/centers/C001/inventory/exit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    itemId: 5,
    quantity: 10,
    familyId: 123,
    reason: 'Entrega mensual',
    notes: 'Familia de 3 personas'
  })
});
```

---

## ✨ Características Destacadas

- 🔒 **Seguridad**: Autenticación en todos los endpoints
- 🔄 **Transaccionalidad**: COMMIT/ROLLBACK automático
- ✅ **Validaciones**: Stock suficiente, campos requeridos
- 📊 **Trazabilidad**: Historial completo con familia destinataria
- ⚡ **Performance**: Índices optimizados
- 🎯 **Sin cambios disruptivos**: Rutas existentes intactas

---

## ⚠️ Validaciones Implementadas

### ❌ Errores que se previenen:
- Salida con cantidad > stock disponible
- Eliminación de ítem con stock > 0
- Cantidades negativas o cero
- Campos requeridos faltantes
- Referencias a ítems o familias inexistentes

### ✅ Respuestas de error claras:
```json
{
  "error": "Stock insuficiente. Disponible: 15, Solicitado: 20"
}
```

```json
{
  "error": "No se puede eliminar un recurso que aún tiene stock. Stock actual: 25"
}
```

---

## 📊 Estado de Implementación

- ✅ 6/6 criterios de aceptación implementados
- ✅ 4 nuevos endpoints REST
- ✅ 4 nuevas funciones de servicio
- ✅ Sin errores de compilación
- ✅ Rutas existentes sin cambios
- ✅ Migración de BD lista
- ✅ Documentación completa

---

**Estado**: ✅ **LISTO PARA USAR**

**Siguiente paso**: Ejecutar migración de BD y reiniciar servidor
