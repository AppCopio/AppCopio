import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { addRequestToOutbox } from '../../utils/offlineDb';
import { fetchWithAbort } from '../../services/api';
import './InventoryPage.css';

// --- INTERFACES ---
interface InventoryItem {
  item_id: number;
  quantity: number;
  name: string;
  category: string; 
  description?: string | null;
}

interface Category {
  category_id: number;
  name: string;
}

interface GroupedInventory {
  [category: string]: InventoryItem[];
}

// --- CONSTANTES ---
const SYNC_TAG = 'sync-inventory-updates';

// --- COMPONENTE PRINCIPAL ---
const InventoryPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  // --- ESTADOS ---
  const [inventory, setInventory] = useState<GroupedInventory>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState('');

  // --- FUNCIONES ---

  const registerForSync = () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(swRegistration => {
        swRegistration.sync.register(SYNC_TAG);
      }).catch(err => console.error('Error al registrar la sincronización:', err));
    }
  };
  
  const fetchInventory = async (showLoadingSpinner = true) => {
    if (!centerId) return;
    if (showLoadingSpinner) setIsLoading(true);
    
    try {
      const data = await fetchWithAbort<InventoryItem[]>(
        `${apiUrl}/centers/${centerId}/inventory`,
        new AbortController().signal
      );
      const groupedData = data.reduce((acc, item) => {
        const category = item.category || 'Sin Categoría';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {} as GroupedInventory);
      setInventory(groupedData);
      setError(null);
    } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
            setError(err.message);
        }
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  };

  // --- EFECTOS ---
  useEffect(() => {
    if (!centerId) {
        setIsLoading(false);
        return;
    }
    const controller = new AbortController();
    const loadInitialData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [inventoryData, categoriesData] = await Promise.all([
                fetchWithAbort<InventoryItem[]>(`${apiUrl}/centers/${centerId}/inventory`, controller.signal),
                fetchWithAbort<Category[]>(`${apiUrl}/categories`, controller.signal)
            ]);
            const groupedData = inventoryData.reduce((acc, item) => {
                const category = item.category || 'Sin Categoría';
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
            }, {} as GroupedInventory);
            setInventory(groupedData);
            setCategories(categoriesData);
            if (categoriesData.length > 0 && newItemCategory === '') {
                setNewItemCategory(String(categoriesData[0].category_id));
            }
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setError("No se pudieron cargar los datos de la página.");
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    };
    loadInitialData();
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        fetchInventory(false); 
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      controller.abort();
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [centerId, apiUrl]);

  // --- MANEJADORES DE EVENTOS ---

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId || !newItemCategory) return alert("Por favor, selecciona una categoría.");
    setIsSubmitting(true);
    const request = {
        url: `${apiUrl}/centers/${centerId}/inventory`,
        method: 'POST',
        body: { 
            itemName: newItemName, 
            categoryId: parseInt(newItemCategory, 10),
            quantity: newItemQuantity 
        },
    };
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.msg || 'Error del servidor al añadir el item');
      }
    } catch (err) {
      if (!navigator.onLine) {
        addRequestToOutbox(request);
        registerForSync();
        alert('Estás sin conexión. El nuevo item se añadirá cuando vuelvas a tener internet.');
      } else {
        alert(`No se pudo añadir el item: ${(err as Error).message}`);
      }
    } finally {
      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemQuantity(1);
      await fetchInventory(false);
      setIsSubmitting(false);
    }
  };
  
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() === '') return alert('El nombre de la categoría no puede estar vacío.');
    setIsSubmitting(true);
    const request = { url: `${apiUrl}/categories`, method: 'POST', body: { name: newCategoryName.trim() } };
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      if (response.status === 409) throw new Error('La categoría ya existe.');
      if (!response.ok) throw new Error('Error del servidor.');
      const newCategory: Category = await response.json();
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
      // CORRECCIÓN 1: Se añade la alerta de éxito
      alert(`Categoría "${newCategoryName.trim()}" añadida con éxito.`);
    } catch (err) {
      if (!navigator.onLine) {
        addRequestToOutbox(request);
        registerForSync();
        // CORRECCIÓN 2: Se añade la actualización optimista para el modo offline
        setCategories(prev => [...prev, { category_id: Date.now(), name: newCategoryName.trim() }].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCategoryName('');
        alert('Sin conexión. La categoría se añadirá al recuperar la conexión.');
      } else {
        alert(`Error: ${(err as Error).message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete === '') return alert('Selecciona una categoría para eliminar.');
    if (!window.confirm(`¿Seguro que deseas eliminar esta categoría?`)) return;
    setIsSubmitting(true);
    const request = { url: `${apiUrl}/categories/${categoryToDelete}`, method: 'DELETE', body: null };
    try {
      const response = await fetch(request.url, { method: request.method });
      if (response.status === 400) throw new Error('No se puede eliminar: la categoría tiene productos asociados.');
      if (!response.ok) throw new Error('Error del servidor.');
      setCategories(prev => prev.filter(cat => String(cat.category_id) !== categoryToDelete));
      setCategoryToDelete('');
       // CORRECCIÓN 1: Se añade la alerta de éxito
      alert('Categoría eliminada con éxito.');
    } catch (err) {
      if (!navigator.onLine) {
        addRequestToOutbox(request);
        registerForSync();
         // CORRECCIÓN 2: Se añade la actualización optimista para el modo offline
        setCategories(prev => prev.filter(cat => String(cat.category_id) !== categoryToDelete));
        setCategoryToDelete('');
        alert('Sin conexión. La categoría se eliminará al recuperar la conexión.');
      } else {
        alert(`Error: ${(err as Error).message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
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
    const itemToSave = { ...editingItem };
    const itemId = itemToSave.item_id;
    setIsSubmitting(true);
    setInventory(prev => {
        const newInventory = { ...prev };
        const categoryKey = itemToSave.category || 'Sin Categoría';
        if (newInventory[categoryKey]) {
          newInventory[categoryKey] = newInventory[categoryKey].map(i => 
              i.item_id === itemId ? itemToSave : i
          );
        }
        return newInventory;
    });
    try {
      const request = {
        url: `${apiUrl}/centers/${centerId}/inventory/${itemId}`,
        method: 'PUT',
        body: { quantity: itemToSave.quantity }
      };
      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body)
      });
      if (!response.ok) throw new Error('Falló la actualización.');
    } catch (err) {
      if (!navigator.onLine) {
        addRequestToOutbox({
          url: `${apiUrl}/centers/${centerId}/inventory/${itemId}`,
          method: 'PUT',
          body: { quantity: itemToSave.quantity }
        });
        registerForSync();
        alert('Sin conexión. El cambio se guardará cuando recuperes la conexión.');
      } else {
        alert('No se pudieron guardar los cambios. Revisa tu conexión.');
        fetchInventory(false);
      }
    } finally {
        handleCloseEditModal(); 
        setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem || !centerId) return;
    if (!window.confirm(`¿Seguro que quieres eliminar "${editingItem.name}"?`)) return;
    const itemToDelete = { ...editingItem };
    const itemId = itemToDelete.item_id;
    const originalInventory = inventory;
    setIsSubmitting(true);
    setInventory(prev => {
        const newInventory = { ...prev };
        const categoryKey = itemToDelete.category || 'Sin Categoría';
        if (newInventory[categoryKey]) {
            newInventory[categoryKey] = newInventory[categoryKey].filter(i => i.item_id !== itemId);
            if(newInventory[categoryKey].length === 0) {
                delete newInventory[categoryKey];
            }
        }
        return newInventory;
    });
    try {
      const request = {
        url: `${apiUrl}/centers/${centerId}/inventory/${itemId}`,
        method: 'DELETE',
        body: null
      };
      const response = await fetch(request.url, { method: request.method });
      if (!response.ok) throw new Error('No se pudo eliminar el item del servidor.');
    } catch (err) {
      if (!navigator.onLine) {
        addRequestToOutbox({ url: `${apiUrl}/centers/${centerId}/inventory/${itemId}`, method: 'DELETE', body: null });
        registerForSync();
        alert('Sin conexión. El item se eliminará cuando recuperes la conexión.');
      } else {
        alert('No se pudo eliminar el item. Revisa tu conexión.');
        setInventory(originalInventory);
      }
    } finally {
      handleCloseEditModal();
      setIsSubmitting(false);
    }
  };

  // --- RENDERIZADO ---
  if (isLoading) return <div className="inventory-container">Cargando inventario...</div>;
  if (error) return <div className="inventory-container error-message">Error: {error}</div>;

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h3>Inventario del Centro {centerId}</h3>
        {(user?.role === 'Encargado' || user?.role === 'Emergencias') && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="add-item-btn" onClick={() => setIsAddModalOpen(true)}>+ Añadir Item</button>
            <button className="action-btn" onClick={() => setIsCategoryModalOpen(true)}>Gestionar Categorías</button>
            <Link to={`/center/${centerId}/history`} className="action-btn">Ver Historial</Link>
          </div>
        )}
      </div>

      {/* Modal para Añadir Item */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddItemSubmit}>
              <h3>Añadir Item al Inventario</h3>
              <div className="form-group"><label htmlFor="itemName">Nombre:</label><input id="itemName" type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} required /></div>
              <div className="form-group"><label htmlFor="category">Categoría:</label>
                <select id="category" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} required>
                  {categories.map(cat => (<option key={cat.category_id} value={cat.category_id}>{cat.name}</option>))}
                </select>
              </div>
              <div className="form-group"><label htmlFor="quantity">Cantidad:</label><input id="quantity" type="number" value={newItemQuantity} onChange={e => setNewItemQuantity(Number(e.target.value))} min="1" required /></div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Añadiendo...' : 'Añadir'}</button>
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
            <div className="form-group"><label htmlFor="editItemName">Nombre:</label><input id="editItemName" name="name" type="text" value={editingItem.name} onChange={handleEditFormChange} /></div>
            <div className="form-group"><label htmlFor="editItemCategory">Categoría:</label><input type="text" value={editingItem.category} disabled /></div>
            <div className="form-group"><label htmlFor="editItemQuantity">Cantidad:</label><input id="editItemQuantity" name="quantity" type="number" value={editingItem.quantity} onChange={handleEditFormChange} min="0" /></div>
            <div className="modal-actions edit-actions">
              <button onClick={handleDeleteItem} className="btn-danger" disabled={isSubmitting}>Eliminar</button>
              <div>
                <button onClick={handleCloseEditModal} className="btn-secondary" disabled={isSubmitting}>Cancelar</button>
                <button onClick={handleSaveChanges} className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Gestionar Categorías */}
      {isCategoryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Gestionar Categorías</h3>
            <form onSubmit={handleAddCategory} className="category-form">
              <div className="form-group"><label htmlFor="newCategoryName">Añadir Categoría:</label>
                <div className="input-with-button">
                  <input id="newCategoryName" type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ej: Artículos de Aseo" disabled={isSubmitting} />
                  <button type="submit" className="btn-primary" disabled={isSubmitting || newCategoryName.trim() === ''}>{isSubmitting ? '...' : 'Añadir'}</button>
                </div>
              </div>
            </form>
            <hr className="divider" />
            <div className="form-group"><label htmlFor="categoryToDelete">Eliminar Categoría:</label>
              <div className="input-with-button">
                <select id="categoryToDelete" value={categoryToDelete} onChange={e => setCategoryToDelete(e.target.value)} disabled={isSubmitting || categories.length === 0}>
                  <option value="">-- Selecciona una categoría --</option>
                  {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
                </select>
                <button onClick={handleDeleteCategory} className="btn-danger" disabled={isSubmitting || categoryToDelete === ''}>{isSubmitting ? '...' : 'Eliminar'}</button>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsCategoryModalOpen(false)} disabled={isSubmitting}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Renderizado de la Tabla de Inventario */}
      {Object.keys(inventory).length === 0 ? (<p>Este centro no tiene items en inventario.</p>) : (Object.entries(inventory).map(([category, items]) => (
        <div key={category} className="category-section">
          <h4>{category}</h4>
          <table className="inventory-table">
            <thead><tr><th>Item</th><th>Cantidad</th>{(user?.role === 'Encargado' || user?.role === 'Emergencias') && <th>Acciones</th>}</tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.item_id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  {(user?.role === 'Encargado' || user?.role === 'Emergencias') && (
                    <td><button className="action-btn" onClick={() => handleOpenEditModal(item)}>Editar</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )))}
    </div>
  );
};

export default InventoryPage;