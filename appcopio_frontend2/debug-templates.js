// Script temporal para limpiar localStorage y verificar plantillas
console.log('=== VERIFICANDO PLANTILLAS ===');

// Obtener plantillas actuales
const boxes = JSON.parse(localStorage.getItem('resourceBoxes') || '[]');
console.log('Plantillas encontradas:', boxes.length);

// Mostrar cada plantilla y su tipo
boxes.forEach((box, index) => {
  console.log(`Plantilla ${index + 1}:`, {
    id: box.box_id,
    name: box.name,
    type: box.type || 'sin tipo',
    items: box.items?.length || 0
  });
});

// Corregir plantillas sin tipo (asignarles 'entry' por defecto)
const correctedBoxes = boxes.map(box => ({
  ...box,
  type: box.type || 'entry'
}));

// Guardar plantillas corregidas
localStorage.setItem('resourceBoxes', JSON.stringify(correctedBoxes));

console.log('=== PLANTILLAS CORREGIDAS ===');
console.log('Todas las plantillas ahora tienen un tipo asignado');

// Opcional: Limpiar todas las plantillas (descomenta la siguiente línea si quieres empezar desde cero)
// localStorage.removeItem('resourceBoxes');