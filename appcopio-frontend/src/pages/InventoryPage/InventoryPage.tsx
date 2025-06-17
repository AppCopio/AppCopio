// src/pages/InventoryPage/InventoryPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // <-- IMPORTAMOS EL HOOK DE AUTENTICACIÓN
import './InventoryPage.css';
import { Link } from 'react-router-dom';

// --- INTERFACES ---
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

// --- CONSTANTES ---
const API_BASE_URL = 'http://localhost:4000/api';

// --- COMPONENTE PRINCIPAL ---
const InventoryPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  
  // Obtenemos el usuario del contexto global para saber su rol
  const { user } = useAuth();
  
  // --- ESTADOS DEL COMPONENTE ---
  const [inventory, setInventory] = useState<GroupedInventory>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el modal de AÑADIR
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  
  // Estados para el modal de EDICIÓN
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Estado compartido para envío de formularios
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FUNCIONES DE OBTENCIÓN DE DATOS ---
  const fetchInventory = async () => {
    if (!centerId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/centers/${centerId}/inventory`);
      if (!response.ok) throw new Error('Error en la respuesta de la red al obtener inventario');
      
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
    }
  };

  const fetchCategories = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/products/categories`);
        if (!response.ok) throw new Error('Error al obtener las categorías');
        const data: string[] = await response.json();
        setCategories(data);
        if (data.length > 0 && !newItemCategory) {
            setNewItemCategory(data[0]);
        }
    } catch (err) {
        console.error("Error al obtener categorías:", err);
    }
  };
  
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchInventory(), fetchCategories()]).finally(() => setIsLoading(false));
  }, [centerId]);

  // --- MANEJADORES DE EVENTOS (HANDLERS) ---
  const handleAddItemSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!centerId) return;
  setIsSubmitting(true);
  try {
    // 1. Añadir item al inventario
    const response = await fetch(`${API_BASE_URL}/centers/${centerId}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName: newItemName,
        category: newItemCategory,
        quantity: newItemQuantity
      }),
    });

    if (!response.ok) throw new Error('Error del servidor al añadir el item');

    // 2. Registrar en historial
    console.log('🔥 Enviando log al backend:', {
      center_id: user?.centerId,
      product_name: newItemName,
      quantity: newItemQuantity,
      action_type: 'add'
    });
    await fetch(`${API_BASE_URL}/inventory/log`, {

      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        center_id: user?.centerId,
        product_name: newItemName,
        quantity: newItemQuantity,
        action_type: 'add'
      })
    });

    // 3. Resetear y recargar
    setIsAddModalOpen(false);
    setNewItemName('');
    setNewItemQuantity(1);
    await fetchInventory();

  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error desconocido al añadir el item');
  } finally {
    setIsSubmitting(false);
  }
};

  
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingItem) return;
    const { name, value } = e.target;
    setEditingItem({
      ...editingItem,
      [name]: name === 'quantity' ? Number(value) : value,
    });
  };

  const handleSaveChanges = async () => {
  if (!editingItem || !centerId) return;
  setIsSubmitting(true);
  try {
    // 1. Actualizar cantidad en inventario
    const updateQuantityPromise = fetch(`${API_BASE_URL}/centers/${centerId}/inventory/${editingItem.item_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: editingItem.quantity }),
    });

    // 2. Actualizar datos del producto (nombre, categoría)
    const updateProductPromise = fetch(`${API_BASE_URL}/products/${editingItem.item_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingItem.name,
        category: editingItem.category
      }),
    });

    const responses = await Promise.all([updateQuantityPromise, updateProductPromise]);

    for (const response of responses) {
      if (!response.ok) throw new Error('Falló una de las actualizaciones. Revisa la consola.');
    }

    // 3. Registrar en historial
    await fetch(`${API_BASE_URL}/inventory/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        center_id: user?.centerId,
        product_name: editingItem.name,
        quantity: editingItem.quantity,
        action_type: 'edit'
      })
    });

    // 4. Cerrar modal y recargar
    handleCloseEditModal();
    await fetchInventory();

  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error desconocido al guardar los cambios');
  } finally {
    setIsSubmitting(false);
  }
};

  const handleDeleteItem = async () => {
  if (!editingItem || !centerId) return;
  if (!window.confirm(`¿Estás seguro de que quieres eliminar "${editingItem.name}" del inventario de este centro?`)) return;
  setIsSubmitting(true);
  try {
    // 1. Eliminar item del inventario
    const response = await fetch(`${API_BASE_URL}/centers/${centerId}/inventory/${editingItem.item_id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('No se pudo eliminar el item desde el servidor.');

    // 2. Registrar en historial
    await fetch(`${API_BASE_URL}/inventory/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        center_id: user?.centerId,
        product_name: editingItem.name,
        quantity: editingItem.quantity,
        action_type: 'delete'
      })
    });

    // 3. Cerrar modal y recargar
    handleCloseEditModal();
    await fetchInventory();

  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error desconocido al eliminar');
  } finally {
    setIsSubmitting(false);
  }
};

  // --- RENDERIZADO DEL COMPONENTE ---
  if (isLoading) return <div className="inventory-container">Cargando inventario...</div>;
  if (error) return <div className="inventory-container error-message">Error: {error}</div>;

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h3>Inventario del Centro {centerId}</h3>

        {/* Botones visibles solo para el rol Encargado */}
        {user?.role === 'Encargado' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="add-item-btn" onClick={() => setIsAddModalOpen(true)}>
              + Añadir Nuevo Item
            </button>
            <Link to="/historial-inventario" className="action-btn">
              Ver Historial
            </Link>
          </div>
        )}
</div>

      {/* Modal para Añadir Item */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddItemSubmit}>
              <h3>Añadir Item al Inventario</h3>
              <div className="form-group">
                <label htmlFor="itemName">Nombre del Item:</label>
                <input id="itemName" type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ej: Frazadas 1.5 plazas" required />
              </div>
              <div className="form-group">
                <label htmlFor="category">Categoría:</label>
                <select id="category" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} required>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="quantity">Cantidad:</label>
                <div className="quantity-input">
                  <button type="button" onClick={() => setNewItemQuantity(q => Math.max(1, q - 1))}>-</button>
                  <input id="quantity" type="number" value={newItemQuantity} onChange={e => setNewItemQuantity(Number(e.target.value))} min="1" required />
                  <button type="button" onClick={() => setNewItemQuantity(q => q + 1)}>+</button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Añadiendo...' : 'Añadir Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Item */}
      {isEditModalOpen && editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Item del Inventario</h3>
            <div className="form-group">
              <label htmlFor="editItemName">Nombre del Item:</label>
              <input id="editItemName" name="name" type="text" value={editingItem.name} onChange={handleEditFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="editItemCategory">Categoría:</label>
              <select id="editItemCategory" name="category" value={editingItem.category} onChange={handleEditFormChange}>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="editItemQuantity">Cantidad:</label>
              <input id="editItemQuantity" name="quantity" type="number" value={editingItem.quantity} onChange={handleEditFormChange} min="0" />
            </div>
            <div className="modal-actions edit-actions">
              <button onClick={handleDeleteItem} className="btn-danger" disabled={isSubmitting}>Eliminar</button>
              <div>
                <button onClick={handleCloseEditModal} className="btn-secondary" disabled={isSubmitting}>Cancelar</button>
                <button onClick={handleSaveChanges} className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Renderizado de la Tabla de Inventario (H14) */}
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
                  {user?.role === 'Encargado' && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.item_id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    {user?.role === 'Encargado' && (
                      <td>
                        <button className="action-btn" onClick={() => handleOpenEditModal(item)}>Editar</button>
                      </td>
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