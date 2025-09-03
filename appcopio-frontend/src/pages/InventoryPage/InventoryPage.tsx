import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { addRequestToOutbox } from '../../utils/offlineDb';
import { fetchWithAbort } from '../../services/api';
import './InventoryPage.css';
import { getUser } from '../../services/usersApi';
import api from '../../lib/api';

// --- INTERFACES (MODIFICADAS) ---
// Se actualiza la interfaz para reflejar los nuevos datos que envía el backend
interface InventoryItem {
  item_id: number;
  quantity: number;
  name: string;
  category: string;
  unit: string | null; // Se añade la unidad
  updated_at: string; // Se añade para trazabilidad
  updated_by_user: string | null; // Se añade para trazabilidad
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
const InventoryPage: React.FC = async () => {
  const { centerId } = useParams<{ centerId: string }>();
  const { user } = useAuth(); // Se obtiene el token de autenticación
  const apiUrl = import.meta.env.VITE_API_URL;

  // --- ESTADOS ---
  const [inventory, setInventory] = useState<GroupedInventory>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  //AGREGADO PARA FILTRAR
  const [categoriaFiltrada, setCategoriaFiltrada] = useState<string>(''); 
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState(''); // Estado para la nueva unidad
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState('');

  // --- LÓGICA DE PERMISOS ---
  const [assignedCenters, setAssignedCenters] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.user_id) {
      setAssignedCenters([]);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        const u = await getUser(user.user_id, ctrl.signal);
        setAssignedCenters(u.assignedCenters ?? []);
      } catch (err) {
        console.error(err);
        setAssignedCenters([]);
      }
    })();
    return () => ctrl.abort();
  }, [user?.user_id]);

  // Permisos
  const isAdminOrSupport =
    user?.role_name === "Administrador" || !!user?.es_apoyo_admin;

  const isAssignedToCenter = centerId
    ? assignedCenters.includes(centerId)
    : false;

  const canManage = isAdminOrSupport || isAssignedToCenter;


  // --- FUNCIONES ---
  
  // NOTA: Esta función ya está definida en syncManager.ts, considera importarla desde allí
  // para no duplicar código. Por ahora la mantenemos como estaba en tu archivo original.
  const registerForSyncLocal = () => {
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
      // La URL no cambia, pero el tipo de dato <InventoryItem[]> sí
      const data = await fetchWithAbort<InventoryItem[]>(
        `${apiUrl}/centers/${centerId}/inventory`,
        new AbortController().signal
      );
      const groupedData = (data || []).reduce((acc, item) => {
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

            const groupedData = (inventoryData || []).reduce((acc, item) => {
                const category = item.category || 'Sin Categoría';
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
            }, {} as GroupedInventory);
            setInventory(groupedData);

            const validCategories = categoriesData || [];
            setCategories(validCategories);
            if (validCategories.length > 0 && newItemCategory === '') {
                setNewItemCategory(String(validCategories[0].category_id));
            }
            
            localStorage.setItem(`inventory_cache_${centerId}`, JSON.stringify(inventoryData));
            localStorage.setItem('categories_cache', JSON.stringify(categoriesData));

        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.warn("ADVERTENCIA: No se pudieron cargar los datos de la red. Intentando desde caché local.");
                try {
                    const cachedInventory = localStorage.getItem(`inventory_cache_${centerId}`);
                    const cachedCategories = localStorage.getItem('categories_cache');

                    if (cachedInventory) {
                        const inventoryData: InventoryItem[] = JSON.parse(cachedInventory);
                        const groupedData = (inventoryData || []).reduce((acc, item) => {
                            const category = item.category || 'Sin Categoría';
                            if (!acc[category]) acc[category] = [];
                            acc[category].push(item);
                            return acc;
                        }, {} as GroupedInventory);
                        setInventory(groupedData);
                    }

                    if (cachedCategories) {
                        const categoriesData: Category[] = JSON.parse(cachedCategories);
                        setCategories(categoriesData || []);
                    }
                } catch (cacheError) {
                    setError("No se pudieron cargar los datos y el caché local está dañado.");
                }
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

  const payload = {
    itemName: newItemName,
    categoryId: parseInt(newItemCategory, 10),
    quantity: newItemQuantity,
    unit: newItemUnit,
    user: user, // si el backend toma user del JWT, puedes remover este campo
  };

  try {
    // ONLINE: usa api (axios) – el Authorization lo agrega el interceptor
    await api.post(`/centers/${centerId}/inventory`, payload);
  } catch (err: any) {
    if (!navigator.onLine) {
      // OFFLINE: encola sin Authorization (se inyecta al reproducir)
      addRequestToOutbox({
        url: `${apiUrl}/centers/${centerId}/inventory`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      registerForSyncLocal();
      alert('Estás sin conexión. El nuevo item se añadirá cuando vuelvas a tener internet.');
    } else {
      const msg = err?.response?.data?.msg || err?.message || 'Error del servidor al añadir el item';
      alert(`No se pudo añadir el item: ${msg}`);
    }
  } finally {
    setIsAddModalOpen(false);
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('');
    await fetchInventory(false);
    setIsSubmitting(false);
  }
};


const handleAddCategory = async (e: React.FormEvent) => {
  e.preventDefault();
  if (newCategoryName.trim() === '') return alert('El nombre de la categoría no puede estar vacío.');
  setIsSubmitting(true);

  const payload = { name: newCategoryName.trim() };

  try {
    // ONLINE
    const { data: newCategory } = await api.post(`/categories`, payload);
    setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCategoryName('');
    alert(`Categoría "${payload.name}" añadida con éxito.`);
  } catch (err: any) {
    if (!navigator.onLine) {
      // OFFLINE
      addRequestToOutbox({
        url: `${apiUrl}/categories`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      registerForSyncLocal();
      setCategories(prev => [
        ...prev,
        { category_id: Date.now(), name: payload.name }
      ].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
      alert('Sin conexión. La categoría se añadirá al recuperar la conexión.');
    } else {
      const status = err?.response?.status;
      if (status === 409) {
        alert('La categoría ya existe.');
      } else {
        alert(`Error: ${err?.response?.data?.message || err?.message || 'Error del servidor.'}`);
      }
    }
  } finally {
    setIsSubmitting(false);
  }
};


const handleDeleteCategory = async () => {
  if (categoryToDelete === '') return alert('Selecciona una categoría para eliminar.');
  if (!window.confirm(`¿Seguro que deseas eliminar esta categoría?`)) return;
  setIsSubmitting(true);

  try {
    // ONLINE
    await api.delete(`/categories/${categoryToDelete}`);
    setCategories(prev => prev.filter(cat => String(cat.category_id) !== categoryToDelete));
    setCategoryToDelete('');
    alert('Categoría eliminada con éxito.');
  } catch (err: any) {
    if (!navigator.onLine) {
      // OFFLINE
      addRequestToOutbox({
        url: `${apiUrl}/categories/${categoryToDelete}`,
        method: 'DELETE',
        headers: {}, // sin Authorization
        body: null,
      });
      registerForSyncLocal();
      setCategories(prev => prev.filter(cat => String(cat.category_id) !== categoryToDelete));
      setCategoryToDelete('');
      alert('Sin conexión. La categoría se eliminará al recuperar la conexión.');
    } else {
      const status = err?.response?.status;
      if (status === 400) {
        alert('No se puede eliminar: la categoría tiene productos asociados.');
      } else {
        alert(`Error: ${err?.response?.data?.message || err?.message || 'Error del servidor.'}`);
      }
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
const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!editingItem) return;
  const { name, value } = e.target;
  setEditingItem({ ...editingItem, [name]: Number(value) });
};

const handleSaveChanges = async () => {
  if (!editingItem || !centerId) return;
  const itemToSave = { ...editingItem };
  const itemId = itemToSave.item_id;
  setIsSubmitting(true);

  // Optimistic UI update
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

  const payload = { quantity: itemToSave.quantity };

  try {
    // ONLINE
    await api.put(`/centers/${centerId}/inventory/${itemId}`, payload);
  } catch (err) {
    if (!navigator.onLine) {
      // OFFLINE
      addRequestToOutbox({
        url: `${apiUrl}/centers/${centerId}/inventory/${itemId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      registerForSyncLocal();
      alert('Sin conexión. El cambio se guardará cuando recuperes la conexión.');
    } else {
      alert('No se pudieron guardar los cambios. Revisa tu conexión.');
      fetchInventory(false); // Revertir si falla en línea
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

  // Optimistic UI update
  setInventory(prev => {
    const newInventory = { ...prev };
    const categoryKey = itemToDelete.category || 'Sin Categoría';
    if (newInventory[categoryKey]) {
      newInventory[categoryKey] = newInventory[categoryKey].filter(i => i.item_id !== itemId);
      if (newInventory[categoryKey].length === 0) {
        delete newInventory[categoryKey];
      }
    }
    return newInventory;
  });

  try {
    // ONLINE
    await api.delete(`/centers/${centerId}/inventory/${itemId}`);
  } catch (err) {
    if (!navigator.onLine) {
      // OFFLINE
      addRequestToOutbox({
        url: `${apiUrl}/centers/${centerId}/inventory/${itemId}`,
        method: 'DELETE',
        headers: {}, // sin Authorization
        body: null,
      });
      registerForSyncLocal();
      alert('Sin conexión. El item se eliminará cuando recuperes la conexión.');
    } else {
      alert('No se pudo eliminar el item. Revisa tu conexión.');
      setInventory(originalInventory); // Revertir si falla
    }
  } finally {
    handleCloseEditModal();
    setIsSubmitting(false);
  }
};

  // --- RENDERIZADO ---
  if (isLoading) return <div className="inventory-container">Cargando inventario...</div>;
  if (error && Object.keys(inventory).length === 0) return <div className="inventory-container error-message">Error: {error}</div>;

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h3>Inventario del Centro {centerId}</h3>
        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="add-item-btn" onClick={() => setIsAddModalOpen(true)}>+ Añadir Item</button>
            {isAdminOrSupport && (
                <button className="action-btn" onClick={() => setIsCategoryModalOpen(true)}>Gestionar Categorías</button>
            )}
            <Link to={`/center/${centerId}/inventory/history`} className="action-btn">Ver Historial</Link>
          </div>
        )}
      </div>
      {/* FILTRO CATEGORIAS */}
      <div className="filter-container" style={{ marginBottom: '20px' }}>
        <label htmlFor="categoriaFiltrada" style={{ marginRight: '10px' }}>
          <strong>Filtrar por Categoría:</strong>
        </label>
        <select
          id="categoriaFiltrada"
          value={categoriaFiltrada}
          onChange={e => setCategoriaFiltrada(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat.category_id} value={cat.name}>
              {cat.name}
            </option>
          ))}
      </select>
        <button 
          onClick={() => setCategoriaFiltrada('')}
          className="btn-clear-filter"
        >
          Limpiar Filtro
        </button>
      </div>

      {/* MODAL PARA AÑADIR ITEM (MODIFICADO) */}
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
              {/* Se añade campo para la unidad */}
              <div className="form-group"><label htmlFor="unit">Unidad (kg, lts, un):</label><input id="unit" type="text" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} placeholder="Ej: kg, lts, un" /></div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Añadiendo...' : 'Añadir'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR ITEM (MODIFICADO) */}
      {isEditModalOpen && editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Item: {editingItem.name}</h3>
            {/* Solo se permite editar la cantidad para evitar inconsistencias */}
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

      {/* MODAL PARA GESTIONAR CATEGORÍAS (Sin cambios funcionales, solo de token) */}
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

      {/* RENDERIZADO DE LA TABLA DE INVENTARIO (MODIFICADO)(con categorías vacías al filtrar) */}
      {(() => {
        // 1) Si no hay filtro y no hay inventario -> mensaje general
        if (!categoriaFiltrada && Object.keys(inventory).length === 0) {
          return <p>Este centro no tiene items en inventario.</p>;
        }

        // 2) Determinar qué categorías mostrar
        const categoriasVisibles = categoriaFiltrada
          ? [categoriaFiltrada]                // siempre mostrar la categoría filtrada (aunque esté vacía)
          : Object.keys(inventory);            // si no hay filtro, mostrar solo las que tienen ítems

        // 3) Si hay filtro y esa categoría no existe en inventory -> renderizar igual vacía
        if (categoriaFiltrada && !inventory[categoriaFiltrada]) {
          return (
            <div className="category-section">
              <h4>{categoriaFiltrada}</h4>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Cantidad</th>
                    <th>Última Actualización</th>
                    {canManage && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={canManage ? 4 : 3}>No hay items en esta categoría.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }

        // 4) Render normal (con o sin filtro)
        return categoriasVisibles.map((category) => {
          const items = inventory[category] ?? []; // si no hay, queda []
          return (
            <div key={category} className="category-section">
              <h4>{category}</h4>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Cantidad</th>
                    <th>Última Actualización</th>
                    {canManage && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 4 : 3}>No hay items en esta categoría.</td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.item_id}>
                        <td>{item.name}</td>
                        <td>{item.quantity} {item.unit || ''}</td>
                        <td>
                          {item.updated_by_user || 'Sistema'}
                          <br />
                          <small>{new Date(item.updated_at).toLocaleString()}</small>
                        </td>
                        {canManage && (
                          <td>
                            <button className="action-btn" onClick={() => handleOpenEditModal(item)}>
                              Editar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        });
      })()}
    </div>
  );
};

export default InventoryPage;