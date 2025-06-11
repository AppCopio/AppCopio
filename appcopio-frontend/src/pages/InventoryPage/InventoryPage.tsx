// src/pages/InventoryPage/InventoryPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './InventoryPage.css';

// ... (Las interfaces InventoryItem y GroupedInventory se mantienen igual) ...
interface InventoryItem {
  item_id: number;
  quantity: number;
  name: string;
  category: string;
  description: string | null;
}
interface GroupedInventory {
  [category: string]: InventoryItem[];
}



const InventoryPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const userRole: 'Encargado' | 'Emergencias' = 'Encargado';

  const [inventory, setInventory] = useState<GroupedInventory>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- NUEVOS ESTADOS PARA EL MODAL Y EL FORMULARIO ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]); // Para el selector
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función reutilizable para obtener los datos del inventario
  const fetchInventory = async () => {
    if (!centerId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/centers/${centerId}/inventory`);
      if (!response.ok) throw new Error('Error en la respuesta de la red');
      const data: InventoryItem[] = await response.json();
      const groupedData = data.reduce((acc, item) => {
        const category = item.category || 'Sin Categoría';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {} as GroupedInventory);
      setInventory(groupedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para obtener las categorías existentes
  const fetchCategories = async () => {
      try {
          const response = await fetch('http://localhost:4000/api/products/categories');
          const data: string[] = await response.json();
          setCategories(data);
          if (data.length > 0) {
              setNewItemCategory(data[0]); // Seleccionamos la primera por defecto
          }
      } catch (err) {
          console.error("Error al obtener categorías:", err);
      }
  };
  
  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, [centerId]);

  // --- NUEVA FUNCIÓN PARA MANEJAR EL ENVÍO DEL FORMULARIO ---
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:4000/api/centers/${centerId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: newItemName,
          category: newItemCategory,
          quantity: newItemQuantity,
        }),
      });
      if (!response.ok) throw new Error('Error al añadir el item');
      
      // Si todo sale bien, cerramos el modal y refrescamos la lista de inventario
      setIsModalOpen(false);
      setNewItemName('');
      setNewItemQuantity(1);
      fetchInventory(); // Volvemos a pedir los datos para ver el cambio
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div>Cargando inventario...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h3>Inventario del Centro {centerId}</h3>
        {userRole === 'Encargado' && (
          <button className="add-item-btn" onClick={() => setIsModalOpen(true)}>
            + Añadir Nuevo Item
          </button>
        )}
      </div>

      {/* --- CÓDIGO DEL MODAL (solo se muestra si isModalOpen es true) --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddItemSubmit}>
              <h3>Añadir Item al Inventario</h3>
              <div className="form-group">
                <label htmlFor="itemName">Nombre del Item:</label>
                <input
                  id="itemName"
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="Ej: Frazadas 1.5 plazas"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">Categoría:</label>
                <select 
                  id="category" 
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value)}
                  required
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="quantity">Cantidad:</label>
                <div className="quantity-input">
                  <button type="button" onClick={() => setNewItemQuantity(q => Math.max(1, q - 1))}>-</button>
                  <input
                    id="quantity"
                    type="number"
                    value={newItemQuantity}
                    onChange={e => setNewItemQuantity(Number(e.target.value))}
                    min="1"
                    required
                  />
                  <button type="button" onClick={() => setNewItemQuantity(q => q + 1)}>+</button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Añadiendo...' : 'Añadir Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* La tabla del inventario se mantiene igual */}
      {Object.keys(inventory).length === 0 ? (
        <p>Este centro aún no tiene items en su inventario.</p>
      ) : (
        Object.entries(inventory).map(([category, items]) => (
          <div key={category} className="category-section">
            <h4>{category}</h4>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Cantidad</th>
                  {userRole === 'Encargado' && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.item_id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    {userRole === 'Encargado' && (
                      <td><button className="action-btn">Editar</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default InventoryPage;