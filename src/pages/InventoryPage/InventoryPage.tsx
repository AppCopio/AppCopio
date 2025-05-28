// src/pages/InventoryPage/InventoryPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
// import './InventoryPage.css'; // Si necesitas estilos específicos

const InventoryPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  
  // Simulación de inventario (luego vendrá de la BD/API)
  const [inventory, setInventory] = useState([
    { id: 'i1', name: 'Agua Embotellada (1L)', quantity: 150 },
    { id: 'i2', name: 'Frazadas', quantity: 80 },
    { id: 'i3', name: 'Colchones', quantity: 55 },
    { id: 'i4', name: 'Pañales (Adulto)', quantity: 30 },
  ]);

  return (
    <div>
      <h3>Inventario del Centro {centerId}</h3>
      <p>Aquí puedes ver y actualizar las existencias de tu centro.</p>
      
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>
                <button>+</button>
                <button>-</button>
                <button>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Aquí podrías añadir un formulario para agregar nuevos items */}
    </div>
  );
};

export default InventoryPage;