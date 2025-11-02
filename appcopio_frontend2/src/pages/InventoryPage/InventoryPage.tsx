import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/offline/OfflineContext";
import {
  listCenterInventory,
  createInventoryItem,
  updateInventoryItemQuantity,
  deleteInventoryItem,
} from "@/services/inventory.service";
import { listCategories, createCategory, deleteCategory } from "@/services/categories.service";
import { getCenterCapacity, updateCenterFullness } from "@/services/centers.service";
import { getUser } from "@/services/users.service";
import { validateItemDeletion } from "@/services/movements.service";
import ResourcesAndNeeds from "@/components/inventory/ResourcesAndNeeds";
import EntryForm from "@/components/inventory/EntryForm";
import ExitForm from "@/components/inventory/ExitForm";
import ResourceBoxManager from "@/components/inventory/ResourceBoxManager";
import ExitBoxesSection from "@/components/inventory/ExitBoxesSection";
import type {
  InventoryItem,
  GroupedInventory,
  Category,
  InventoryCreateDTO,
} from "@/types/inventory";
import "./InventoryPage.css";

const groupByCategory = (items: InventoryItem[]): GroupedInventory =>
  (items ?? []).reduce((acc, item) => {
    const key = item.category || "Sin Categoría";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as GroupedInventory);

export default function InventoryPage() {
  const { centerId } = useParams<{ centerId: string }>();
  const { user } = useAuth();
  const { isOnline, lastSync } = useOffline();

  // Estado
  const [inventory, setInventory] = useState<GroupedInventory>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modales / edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // HdU11: Modales para movimientos
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [isExitFormOpen, setIsExitFormOpen] = useState(false);
  const [isResourceBoxManagerOpen, setIsResourceBoxManagerOpen] = useState(false);

  // Filtros y forms
  const [categoriaFiltrada, setCategoriaFiltrada] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("descendente");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState("");

  const [centerCapacity, setCenterCapacity] = useState<number>(0);
  const [showNeedsSection, setShowNeedsSection] = useState<boolean>(true);
  const [showBoxesSection, setShowBoxesSection] = useState<boolean>(true);

  // Permisos
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
  setAssignedCenters(((u?.assignedCenters ?? []) as (string | number)[]).map(String));
      } catch {
        setAssignedCenters([]);
      }
    })();
    return () => ctrl.abort();
  }, [user?.user_id]);

  const isAdminOrSupport = user?.role_id === 1 || !!user?.es_apoyo_admin;
  const isAssignedToCenter = centerId ? assignedCenters.includes(String(centerId)) : false;
  const canManage = isAdminOrSupport || isAssignedToCenter;

  // Carga inicial
  useEffect(() => {
    if (!centerId) {
      setIsLoading(false);
      setError("Centro no encontrado");
      return;
    }
    const controller = new AbortController();
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [inv, cats, capacityData] = await Promise.all([
          listCenterInventory(centerId),
          listCategories(),
          getCenterCapacity(centerId),
        ]);
        const groupedInv = groupByCategory(inv);
        const capacity = capacityData?.current_capacity || 0;
        
        setInventory(groupedInv);
        setCategories(cats);
        setCenterCapacity(capacity);
        
      } catch (e: any) {
        if (!controller.signal.aborted) {
          setError(e?.message ?? "No se pudieron cargar los datos.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [centerId]);

  // Helpers
  const fetchInventory = async (showLoading = true) => {
    if (!centerId) return;
    const controller = new AbortController();
    try {
      if (showLoading) setIsLoading(true);
      const inv = await listCenterInventory(centerId);
      const groupedInv = groupByCategory(inv);
      setInventory(groupedInv);
      setError(null);
    } catch (e: any) {
      if (!controller.signal.aborted) {
        setError(e?.message ?? "No se pudo refrescar el inventario.");
      }
    } finally {
      if (!controller.signal.aborted && showLoading) setIsLoading(false);
    }
  };

  // Callback para actualizar el fullnessPercentage del centro
  const handleFullnessCalculated = useCallback(async (fullnessPercentage: number) => {
    if (!centerId || !isOnline) return;
    
    try {
      await updateCenterFullness(centerId, fullnessPercentage);
      console.log(`Centro ${centerId} actualizado con fullness: ${fullnessPercentage}%`);
    } catch (error) {
      console.error("Error al actualizar fullness del centro:", error);
      // No mostramos error al usuario ya que es una actualización en segundo plano
    }
  }, [centerId, isOnline]);

  // Ordenar por fecha
  const handleSortByDate = (order: string) => {
    const sorted = { ...inventory };
    for (const category in sorted) {
      sorted[category] = sorted[category].slice().sort((a, b) => {
        const da = new Date(a.updated_at).getTime();
        const db = new Date(b.updated_at).getTime();
        if (Number.isNaN(da) || Number.isNaN(db)) return 0;
        return order === "ascendente" ? da - db : db - da;
      });
    }
    setInventory(sorted);
  };

  // Modals
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

  // Crear item
  // Guardar cambios (sin optimistic UI)
  const handleSaveChanges = async () => {
    if (!editingItem || !centerId) return;
    const itemId = editingItem.item_id;
    setIsSubmitting(true);
    try {
      await updateInventoryItemQuantity(centerId, itemId, { quantity: editingItem.quantity });
      await fetchInventory(false);
      handleCloseEditModal();
    } catch (err) {
      alert("No se pudieron guardar los cambios.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar item con validaciones HdU11
  const handleDeleteItem = async () => {
    if (!editingItem || !centerId) return;

    setIsSubmitting(true);
    try {
      // HdU11: Validar si el item puede ser eliminado
      const validation = await validateItemDeletion(centerId, editingItem.item_id);
      
      if (!validation.can_delete) {
        alert(
          `No se puede eliminar "${validation.item_name}" porque tiene stock actual de ${validation.current_stock}.\n\n` +
          "Para eliminar este item, primero debes registrar una salida para reducir el stock a 0."
        );
        return;
      }

      // Confirmar eliminación si no hay stock
      if (!window.confirm(
        `¿Seguro que quieres eliminar "${validation.item_name}"?\n\n` +
        "Esta acción no se puede deshacer."
      )) {
        return;
      }

      const itemId = editingItem.item_id;
      await deleteInventoryItem(centerId, itemId);
      await fetchInventory(false);
      handleCloseEditModal();
      
      alert(`Item "${validation.item_name}" eliminado exitosamente.`);
    } catch (err: any) {
      console.error('Error deleting item:', err);
      alert(
        err.response?.data?.error || 
        err.message || 
        "No se pudo eliminar el item. Intenta de nuevo más tarde."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Categorías
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return alert("El nombre de la categoría no puede estar vacío.");
    
    setIsSubmitting(true);
    try {
      const created = await createCategory(name);
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      alert(`Categoría "${name}" añadida con éxito.`);
    } catch (err: any) {
      const status = err?.response?.status;
      
      if (status === 409) {
        alert("La categoría ya existe.");
      } else {
        alert(`Error: ${err?.response?.data?.message || err?.message || "Error del servidor."}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return alert("Selecciona una categoría para eliminar.");
    if (!window.confirm("¿Seguro que deseas eliminar esta categoría?")) return;
    setIsSubmitting(true);
    try {
      await deleteCategory(categoryToDelete);
      setCategories((prev) => prev.filter((c) => String(c.category_id) !== categoryToDelete));
      setCategoryToDelete("");
      alert("Categoría eliminada con éxito.");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) alert("No se puede eliminar: la categoría tiene productos asociados.");
      else alert(`Error: ${err?.response?.data?.message || err?.message || "Error del servidor."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render
  if (isLoading) return <div className="inventory-container">Cargando inventario...</div>;
  if (error && Object.keys(inventory).length === 0)
    return <div className="inventory-container error-message">Error: {error}</div>;

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h3>Inventario del Centro {centerId}</h3>
        <div className="toggle-buttons-container">
          <button 
            className={`toggle-needs-btn ${showNeedsSection ? 'active' : ''}`}
            onClick={() => setShowNeedsSection(!showNeedsSection)}
            title="Mostrar/Ocultar análisis de necesidades"
          >
            {showNeedsSection ? '📊 Ocultar Necesidades' : '📊 Mostrar Necesidades'}
          </button>
          <button 
            className={`toggle-needs-btn ${showBoxesSection ? 'active' : ''}`}
            onClick={() => setShowBoxesSection(!showBoxesSection)}
            title="Mostrar/Ocultar cajas de salida"
          >
            {showBoxesSection ? '📦 Ocultar Cajas' : '📦 Mostrar Cajas'}
          </button>
          {canManage && (
            <>
              {/* HdU11: Botones para movimientos de inventario */}
              <button className="movement-btn entry-btn" onClick={() => setIsEntryFormOpen(true)}>
                📥 Registrar Entrada
              </button>
              <button className="movement-btn exit-btn" onClick={() => setIsExitFormOpen(true)}>
                📤 Registrar Salida
              </button>
              <button className="movement-btn box-btn" onClick={() => setIsResourceBoxManagerOpen(true)}>
                📦 Gestionar Cajas
              </button>
              
              {isAdminOrSupport && (
                <button className="action-btn" onClick={() => setIsCategoryModalOpen(true)}>Gestionar Categorías</button>
              )}
              <Link to={`/center/${centerId}/inventory/history`} className="action-btn history-btn">Ver Historial</Link>
              <Link to={`/center/${centerId}/movements/history`} className="action-btn history-btn">Ver Movimientos</Link>
            </>
          )}
        </div>
      </div>

      {/* HdU09: Sección de Recursos Disponibles y Necesidades */}
      {showNeedsSection && centerCapacity > 0 && (
        <ResourcesAndNeeds
          inventory={inventory}
          centerCapacity={centerCapacity}
          isOffline={!isOnline}
          lastSyncTime={lastSync ? new Date(lastSync).toLocaleString() : ''}
          onFullnessCalculated={handleFullnessCalculated}
        />
      )}

      {/* Sección de Cajas de Salida */}
      {showBoxesSection && centerId && (
        <ExitBoxesSection centerId={centerId} />
      )}

      {/* Filtros horizontales */}
      <div className="filters-horizontal-container">
        <div className="filter-container">
          <label htmlFor="categoriaFiltrada" style={{ marginRight: "10px" }}>
            <strong>Filtrar por Categoría:</strong>
          </label>
          <select
            id="categoriaFiltrada"
            value={categoriaFiltrada}
            onChange={(e) => setCategoriaFiltrada(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <button onClick={() => setCategoriaFiltrada("")} className="btn-clear-filter">
            Limpiar Filtro
          </button>
        </div>

        <div className="filter-container">
          <label htmlFor="ordenarPorFecha" style={{ marginRight: "10px" }}>
            <strong>Ordenar por Fecha de Actualización:</strong>
          </label>
          <select
            id="ordenarPorFecha"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              handleSortByDate(e.target.value);
            }}
          >
            <option value="descendente">Más Reciente Primero</option>
            <option value="ascendente">Más Antiguo Primero</option>
          </select>
        </div>
      </div>

      {/* Modal editar item */}
      {isEditModalOpen && editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Item: {editingItem.name}</h3>
            <div className="form-group">
              <label htmlFor="editItemQuantity">Cantidad:</label>
              <input
                id="editItemQuantity"
                name="quantity"
                type="number"
                value={editingItem.quantity}
                onChange={handleEditFormChange}
                min="0"
              />
            </div>
            <div className="modal-actions edit-actions">
              <button onClick={handleDeleteItem} className="btn-danger" disabled={isSubmitting}>
                Eliminar
              </button>
              <div>
                <button onClick={handleCloseEditModal} className="btn-secondary" disabled={isSubmitting}>
                  Cancelar
                </button>
                <button onClick={handleSaveChanges} className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal categorías */}
      {isCategoryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Gestionar Categorías</h3>
            <form onSubmit={handleAddCategory} className="category-form">
              <div className="form-group">
                <label htmlFor="newCategoryName">Añadir Categoría:</label>
                <div className="input-with-button">
                  <input
                    id="newCategoryName"
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej: Artículos de Aseo"
                    disabled={isSubmitting}
                  />
                  <button type="submit" className="btn-primary" disabled={isSubmitting || newCategoryName.trim() === ""}>
                    {isSubmitting ? "..." : "Añadir"}
                  </button>
                </div>
              </div>
            </form>

            <hr className="divider" />

            <div className="form-group">
              <label htmlFor="categoryToDelete">Eliminar Categoría:</label>
              <div className="input-with-button">
                <select
                  id="categoryToDelete"
                  value={categoryToDelete}
                  onChange={(e) => setCategoryToDelete(e.target.value)}
                  disabled={isSubmitting || categories.length === 0}
                >
                  <option value="">-- Selecciona una categoría --</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button onClick={handleDeleteCategory} className="btn-danger" disabled={isSubmitting || categoryToDelete === ""}>
                  {isSubmitting ? "..." : "Eliminar"}
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsCategoryModalOpen(false)} disabled={isSubmitting}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render inventario (con filtro) */}
      {(() => {
        if (!categoriaFiltrada && Object.keys(inventory).length === 0) {
          return <p>Este centro no tiene items en inventario.</p>;
        }

        const visibles = categoriaFiltrada ? [categoriaFiltrada] : Object.keys(inventory);

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

        return visibles.map((category) => {
          const items = inventory[category] ?? [];
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
                        <td>
                          {item.quantity} {item.unit || ""}
                        </td>
                        <td>
                          {item.updated_by_user || "Sistema"}
                          <br />
                          <small>{new Date(item.updated_at).toLocaleString()}</small>
                        </td>
                        {canManage && (
                          <td>
                            <div className="item-actions">
                              <button className="action-btn" onClick={() => handleOpenEditModal(item)}>
                                Editar
                              </button>
                              {item.quantity > 0 && (
                                <span className="delete-warning" title="No se puede eliminar: tiene stock">
                                  🔒 Stock: {item.quantity}
                                </span>
                              )}
                              {item.quantity === 0 && (
                                <span className="can-delete" title="Se puede eliminar: sin stock">
                                  ✅ Sin stock
                                </span>
                              )}
                            </div>
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

      {/* HdU11: Modales para movimientos de inventario */}
      {isEntryFormOpen && centerId ? (
        <EntryForm
          centerId={centerId}
          currentInventory={Object.values(inventory).flat()}
          onClose={() => setIsEntryFormOpen(false)}
          onSuccess={() => {
            fetchInventory(false);
            setIsEntryFormOpen(false);
          }}
        />
      ) : null}

      {isExitFormOpen && centerId && (
        <ExitForm
          centerId={centerId}
          currentInventory={Object.values(inventory).flat()}
          onClose={() => setIsExitFormOpen(false)}
          onSuccess={() => {
            fetchInventory(false);
            setIsExitFormOpen(false);
          }}
        />
      )}

      {isResourceBoxManagerOpen && centerId ? (
        <ResourceBoxManager
          centerId={centerId}
          onClose={() => setIsResourceBoxManagerOpen(false)}
          onSuccess={() => {
            fetchInventory(false);
            setIsResourceBoxManagerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
