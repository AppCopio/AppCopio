// src/pages/InventoryPage/InventoryPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { addRequestToOutbox } from '../../utils/offlineDb'; // Importamos nuestro helper de IndexedDB
import './InventoryPage.css';

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
const SYNC_TAG = 'sync-inventory-updates'; // Etiqueta para nuestro evento de sincronización

// --- COMPONENTE PRINCIPAL ---
const InventoryPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const { user } = useAuth();
  
  // --- ESTADOS ---
  const [inventory, setInventory] = useState<GroupedInventory>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FUNCIONES ---

  const registerForSync = () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(swRegistration => {
        swRegistration.sync.register(SYNC_TAG);
        console.log('Sincronización en segundo plano registrada.');
      }).catch(err => console.error('Error al registrar la sincronización:', err));
    }
  };

  const fetchInventory = async (showLoading = true) => {
    if (!centerId) return;
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/centers/${centerId}/inventory`);
      if (!response.ok) throw new Error('Error al obtener el inventario del centro');
      
      const data: InventoryItem[] = await response.json();
      const groupedData = data.reduce((acc, item) => {
        const category = item.category || 'Sin Categoría';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {} as GroupedInventory);
      setInventory(groupedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
      console.error("Error al obtener inventario:", err);
    } finally {
      if (showLoading) setIsLoading(false);
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
    Promise.all([fetchInventory(), fetchCategories()]);
  }, [centerId]);

  useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Nos aseguramos de que el mensaje es el que nos interesa
    if (event.data && event.data.type === 'SYNC_COMPLETED') {
      console.log('Página de Inventario: Recibido mensaje de SYNC_COMPLETED. Refrescando datos...');
      // Llamamos a nuestra función para volver a pedir los datos, sin mostrar el "Cargando..."
      fetchInventory(false); 
    }
  };

  // Añadimos el listener cuando el componente se monta
  navigator.serviceWorker.addEventListener('message', handleMessage);

  // Importante: removemos el listener cuando el componente se desmonta para evitar fugas de memoria
  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}, []);



  
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId) return;
    setIsSubmitting(true);
    
    const request = {
        url: `${API_BASE_URL}/centers/${centerId}/inventory`,
        method: 'POST',
        body: { itemName: newItemName, category: newItemCategory, quantity: newItemQuantity },
    };

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      if (!response.ok) throw new Error('Error del servidor al añadir el item');
    } catch (err) {
      console.error('Fallo al añadir item, guardando para sincronización offline.', err);
      if ('serviceWorker' in navigator && !navigator.onLine) {
        addRequestToOutbox(request);
        registerForSync();
        alert('Estás sin conexión. El nuevo item se añadirá cuando vuelvas a tener internet.');
      } else {
        alert('No se pudo añadir el item. Revisa tu conexión.');
      }
    } finally {
      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemQuantity(1);
      await fetchInventory(false);
      setIsSubmitting(false);
    }
  };
  
  const handleSaveChanges = async () => {
    if (!editingItem || !centerId) return;
    
    const originalItem = Object.values(inventory).flat().find(i => i.item_id === editingItem.item_id);
    setIsSubmitting(true);
    
    // --- UI Optimista ---
    setInventory(prev => {
        const newInventory = { ...prev };
        const categoryKey = originalItem?.category || 'Sin Categoría';
        if (newInventory[categoryKey]) {
          newInventory[categoryKey] = newInventory[categoryKey].map(i => 
              i.item_id === editingItem.item_id ? editingItem : i
          );
        }
        return newInventory;
    });
    handleCloseEditModal();
    
    try {
      const promises: Promise<Response>[] = [];
      if (originalItem?.quantity !== editingItem.quantity) {
        promises.push(fetch(`${API_BASE_URL}/centers/${centerId}/inventory/${editingItem.item_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: editingItem.quantity }),
        }));
      }
      if (originalItem?.name !== editingItem.name || originalItem?.category !== editingItem.category) {
        promises.push(fetch(`${API_BASE_URL}/products/${editingItem.item_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: editingItem.name, category: editingItem.category }),
        }));
      }
      const responses = await Promise.all(promises);
      for (const response of responses) {
        if (!response.ok) throw new Error('Falló una de las actualizaciones.');
      }
    } catch (err) {
      console.error('Fallo al guardar cambios, guardando para sincronización offline.', err);
      // Esto responde a H15: actualizar inventario sin conexión
      if ('serviceWorker' in navigator && !navigator.onLine) {
        if (originalItem?.quantity !== editingItem.quantity) {
          addRequestToOutbox({ url: `${API_BASE_URL}/centers/${centerId}/inventory/${editingItem.item_id}`, method: 'PUT', body: { quantity: editingItem.quantity } });
        }
        if (originalItem?.name !== editingItem.name || originalItem?.category !== editingItem.category) {
          addRequestToOutbox({ url: `${API_BASE_URL}/products/${editingItem.item_id}`, method: 'PUT', body: { name: editingItem.name, category: editingItem.category } });
        }
        registerForSync();
        alert('Estás sin conexión. Tus cambios se guardarán cuando vuelvas a tener internet.');
      } else {
        alert('No se pudieron guardar los cambios. Revisa tu conexión e intenta de nuevo.');
        fetchInventory(); // Revertimos al estado del servidor si hay otro tipo de error
      }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem || !centerId) return;
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${editingItem.name}" del inventario de este centro?`)) return;
    
    const originalInventory = inventory;
    setIsSubmitting(true);
    
    // --- UI Optimista ---
    setInventory(prev => {
        const newInventory = { ...prev };
        const categoryKey = editingItem.category || 'Sin Categoría';
        if (newInventory[categoryKey]) {
            newInventory[categoryKey] = newInventory[categoryKey].filter(i => i.item_id !== editingItem.item_id);
            if(newInventory[categoryKey].length === 0) {
                delete newInventory[categoryKey];
            }
        }
        return newInventory;
    });
    handleCloseEditModal();

    try {
      const response = await fetch(`${API_BASE_URL}/centers/${centerId}/inventory/${editingItem.item_id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('No se pudo eliminar el item desde el servidor.');
    } catch (err) {
      console.error('Fallo al eliminar item, guardando para sincronización offline.', err);
      if ('serviceWorker' in navigator && !navigator.onLine) {
        addRequestToOutbox({ url: `${API_BASE_URL}/centers/${centerId}/inventory/${editingItem.item_id}`, method: 'DELETE', body: null });
        registerForSync();
        alert('Estás sin conexión. El item se eliminará cuando vuelvas a tener internet.');
      } else {
        alert('No se pudo eliminar el item. Revisa tu conexión.');
        setInventory(originalInventory); // Revertimos la UI si hubo un error de red
      }
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

  // --- RENDERIZADO DEL COMPONENTE ---
  if (isLoading) return <div className="inventory-container">Cargando inventario...</div>;
  if (error) return <div className="inventory-container error-message">Error: {error}</div>;

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h3>Inventario del Centro {centerId}</h3>
        {user?.role === 'Encargado' && (
          <button className="add-item-btn" onClick={() => setIsAddModalOpen(true)}>
            + Añadir Nuevo Item
          </button>
        )}
      </div>

      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddItemSubmit}>
              <h3>Añadir Item al Inventario</h3>
              <div className="form-group"><label htmlFor="itemName">Nombre del Item:</label><input id="itemName" type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ej: Frazadas 1.5 plazas" required /></div>
              <div className="form-group"><label htmlFor="category">Categoría:</label><select id="category" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} required>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
              <div className="form-group"><label htmlFor="quantity">Cantidad:</label><div className="quantity-input"><button type="button" onClick={() => setNewItemQuantity(q => Math.max(1, q - 1))}>-</button><input id="quantity" type="number" value={newItemQuantity} onChange={e => setNewItemQuantity(Number(e.target.value))} min="1" required /><button type="button" onClick={() => setNewItemQuantity(q => q + 1)}>+</button></div></div>
              <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancelar</button><button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Añadiendo...' : 'Añadir Item'}</button></div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Item del Inventario</h3>
            <div className="form-group"><label htmlFor="editItemName">Nombre del Item:</label><input id="editItemName" name="name" type="text" value={editingItem.name} onChange={handleEditFormChange} /></div>
            <div className="form-group"><label htmlFor="editItemCategory">Categoría:</label><select id="editItemCategory" name="category" value={editingItem.category} onChange={handleEditFormChange}>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
            <div className="form-group"><label htmlFor="editItemQuantity">Cantidad:</label><input id="editItemQuantity" name="quantity" type="number" value={editingItem.quantity} onChange={handleEditFormChange} min="0" /></div>
            <div className="modal-actions edit-actions"><button onClick={handleDeleteItem} className="btn-danger" disabled={isSubmitting}>Eliminar</button><div><button onClick={handleCloseEditModal} className="btn-secondary" disabled={isSubmitting}>Cancelar</button><button onClick={handleSaveChanges} className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</button></div></div>
          </div>
        </div>
      )}
      
      {Object.keys(inventory).length === 0 ? (<p>Este centro aún no tiene items en su inventario.</p>) : (Object.entries(inventory).map(([category, items]) => (
          <div key={category} className="category-section">
            <h4>{category}</h4>
            <table className="inventory-table">
              <thead><tr><th>Item</th><th>Cantidad</th>{user?.role === 'Encargado' && <th>Acciones</th>}</tr></thead>
              <tbody>{items.map(item => (<tr key={item.item_id}><td>{item.name}</td><td>{item.quantity}</td>{user?.role === 'Encargado' && (<td><button className="action-btn" onClick={() => handleOpenEditModal(item)}>Editar</button></td>)}</tr>))}</tbody>
            </table>
          </div>
        )))}
    </div>
  );
};

export default InventoryPage;