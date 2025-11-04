// src/components/inventory/ResourceBoxManager.tsx
import React, { useState, useEffect } from 'react';
import type { Category, InventoryItem } from '@/types/inventory';
import type { ResourceBox, BoxItemTemplate } from '@/types/movements';
import { listCategories } from '@/services/categories.service';
import { listCenterInventory } from '@/services/inventory.service';
import { getResourceBoxes, createResourceBox, createBoxEntry, createExitMovement, createBulkExitMovement } from '@/services/movements.service';
import './ResourceBoxManager.css';

interface ResourceBoxManagerProps {
  centerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface BoxForm {
  name: string;
  description: string;
  items: BoxItemTemplate[];
}

export default function ResourceBoxManager({ centerId, onClose, onSuccess }: ResourceBoxManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [resourceBoxes, setResourceBoxes] = useState<ResourceBox[]>([]);
  const [exitBoxes, setExitBoxes] = useState<any[]>([]);
  const [currentInventory, setCurrentInventory] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'inventory' | 'create-exit' | 'exit-boxes'>('templates');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBox, setSelectedBox] = useState<ResourceBox | null>(null);
  const [selectedExitBox, setSelectedExitBox] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para crear nueva caja
  const [boxForm, setBoxForm] = useState<BoxForm>({
    name: '',
    description: '',
    items: []
  });

  // Estado para agregar item a la caja
  const [showAddItemToBox, setShowAddItemToBox] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number>(0); // Ahora seleccionamos de Products
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemNotes, setNewItemNotes] = useState('');

  // Estado para crear cajas de salida con inventario existente
  const [exitBoxForm, setExitBoxForm] = useState({
    name: '',
    description: '',
    items: [] as Array<{
      itemId: number;
      productName: string;
      categoryName: string;
      quantityToUse: number;
      availableQuantity: number;
      unit: string;
    }>
  });
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Cargar categorías desde el backend
      const cats = await listCategories();
      setCategories(cats);
      
      // Cargar cajas desde el backend
      const boxes = await getResourceBoxes();
      setResourceBoxes(boxes);
      
      // Las cajas de salida se manejan ahora directamente como movimientos de salida
      // No necesitamos cargarlas de localStorage
      setExitBoxes([]);
      
      // Cargar inventario actual del centro
      const inventory = await listCenterInventory(centerId);
      setCurrentInventory(inventory);
      
      // Inicializar con el primer item del inventario si existe
      if (inventory.length > 0) {
        setSelectedItemId(inventory[0].item_id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToBox = () => {
    if (!selectedItemId || newItemQuantity <= 0) {
      alert('Debe seleccionar un item y la cantidad debe ser mayor a 0');
      return;
    }

    // Buscar información del item seleccionado
    const selectedProduct = currentInventory.find(inv => inv.item_id === selectedItemId);
    if (!selectedProduct) {
      alert('Item no encontrado');
      return;
    }

    const newItem: BoxItemTemplate = {
      item_id: selectedItemId,
      item_name: selectedProduct.name,
      quantity: newItemQuantity,
      unit: selectedProduct.unit || undefined,
      notes: newItemNotes.trim() || undefined
    };

    setBoxForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset form
    setNewItemQuantity(1);
    setNewItemNotes('');
    setShowAddItemToBox(false);
  };

  const removeItemFromBox = (index: number) => {
    setBoxForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const createNewBox = async () => {
    if (!boxForm.name.trim()) {
      alert('El nombre de la caja es requerido');
      return;
    }

    if (boxForm.items.length === 0) {
      alert('La caja debe tener al menos un item');
      return;
    }

    setIsSubmitting(true);
    try {
      const newBox = await createResourceBox({
        name: boxForm.name.trim(),
        description: boxForm.description.trim() || undefined,
        items: boxForm.items
      });

      setResourceBoxes(prev => [...prev, newBox]);
      setBoxForm({ name: '', description: '', items: [] });
      setShowCreateForm(false);
      alert('Caja de recursos creada exitosamente');
    } catch (error: any) {
      console.error('Error creating resource box:', error);
      alert(`Error: ${error?.response?.data?.error || error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const useBox = async () => {
    if (!selectedBox || !reason.trim()) {
      alert('Seleccione una caja y proporcione un motivo');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBoxEntry(centerId, {
        box_id: selectedBox.box_id!,
        reason: reason.trim(),
        notes: notes.trim() || undefined
      });
      
      alert('Entrada desde caja registrada exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error using resource box:', error);
      alert(`Error: ${error?.response?.data?.error || error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para renderizar la pestaña de plantillas
  const renderTemplatesTab = () => (
    <>
      <div className="action-buttons">
        <button 
          className="btn-primary" 
          onClick={() => setShowCreateForm(true)}
        >
          + Crear Nueva Plantilla
        </button>
      </div>

      <div className="boxes-grid">
        {resourceBoxes.length === 0 ? (
          <div className="empty-boxes">
            No hay plantillas de cajas creadas. Cree una nueva plantilla para comenzar.
          </div>
        ) : (
          resourceBoxes.map(box => (
            <div key={box.box_id} className="box-card">
              <h4>{box.name}</h4>
              {box.description && <p className="box-description">{box.description}</p>}
              <div className="box-items-count">{box.items.length} items</div>
              <div className="box-items-preview">
                {box.items.slice(0, 3).map((item, idx) => (
                  <span key={idx} className="item-preview">
                    {item.quantity} {item.unit} {item.item_name}
                  </span>
                ))}
                {box.items.length > 3 && (
                  <span className="more-items">+{box.items.length - 3} más</span>
                )}
              </div>
              <button 
                className="use-box-btn"
                onClick={() => {
                  setSelectedBox(box);
                }}
              >
                Usar Esta Plantilla
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );

  // Función para renderizar la pestaña de inventario actual
  const renderInventoryTab = () => (
    <>
      <div className="inventory-header">
        <h4>📦 Inventario Actual del Centro</h4>
        <p>Items disponibles para armar cajas de salida</p>
      </div>

      <div className="inventory-grid">
        {currentInventory.length === 0 ? (
          <div className="empty-inventory">
            No hay items en el inventario del centro.
          </div>
        ) : (
          currentInventory.map(item => (
            <div key={item.item_id} className="inventory-card">
              <div className="inventory-item-header">
                <h5>{item.name}</h5>
                <span className="category-badge">{item.category}</span>
              </div>
              <div className="inventory-quantity">
                <span className="quantity">{item.quantity}</span>
                <span className="unit">{item.unit || 'un'}</span>
              </div>
              {item.description && (
                <div className="item-description">
                  {item.description}
                </div>
              )}
              <button 
                className={`select-inventory-btn ${selectedInventoryItems.has(item.item_id) ? 'selected' : ''}`}
                onClick={() => toggleInventorySelection(item.item_id)}
              >
                {selectedInventoryItems.has(item.item_id) ? '✓ Seleccionado' : 'Seleccionar'}
              </button>
            </div>
          ))
        )}
      </div>

      {selectedInventoryItems.size > 0 && (
        <div className="selected-items-actions">
          <p>{selectedInventoryItems.size} items seleccionados</p>
          <button 
            className="btn-primary"
            onClick={() => setActiveTab('create-exit')}
          >
            Crear Caja con Items Seleccionados
          </button>
        </div>
      )}
    </>
  );

  // Función para renderizar la pestaña de crear caja de salida
  const renderCreateExitTab = () => (
    <>
      <div className="exit-box-header">
        <h4>🚚 Crear Caja de Salida</h4>
        <p>Armar caja con items del inventario para entregar a familias</p>
      </div>

      <div className="form-group">
        <label>Nombre de la caja *</label>
        <input
          type="text"
          value={exitBoxForm.name}
          onChange={(e) => setExitBoxForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ej: Caja Alimentaria Familia García"
        />
      </div>

      <div className="form-group">
        <label>Descripción</label>
        <textarea
          value={exitBoxForm.description}
          onChange={(e) => setExitBoxForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descripción de la caja y su propósito"
          rows={3}
        />
      </div>

      {/* Lista de items seleccionados para la caja */}
      <div className="exit-box-items">
        <h5>Items en la caja:</h5>
        {exitBoxForm.items.length === 0 ? (
          <div className="no-items">
            <p>No hay items agregados. Ve a la pestaña "Inventario Actual" para seleccionar items.</p>
            <button 
              className="btn-secondary"
              onClick={() => setActiveTab('inventory')}
            >
              Ir a Inventario
            </button>
          </div>
        ) : (
          <div className="exit-items-list">
            {exitBoxForm.items.map((item, idx) => (
              <div key={idx} className="exit-item">
                <div className="exit-item-info">
                  <span className="item-name">{item.productName}</span>
                  <span className="item-category">{item.categoryName}</span>
                </div>
                <div className="exit-item-quantity">
                  <input
                    type="number"
                    min="1"
                    max={item.availableQuantity}
                    value={item.quantityToUse}
                    onChange={(e) => updateExitItemQuantity(idx, parseInt(e.target.value) || 1)}
                  />
                  <span>/ {item.availableQuantity} {item.unit}</span>
                </div>
                <button 
                  className="remove-item-btn"
                  onClick={() => removeExitItem(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {exitBoxForm.items.length > 0 && (
        <div className="exit-box-actions">
          <button 
            className="btn-primary"
            onClick={createExitBox}
            disabled={!exitBoxForm.name.trim() || isSubmitting}
          >
            {isSubmitting ? 'Creando Caja...' : 'Crear Caja de Salida'}
          </button>
        </div>
      )}
    </>
  );

  // Funciones auxiliares para manejo de inventario
  const toggleInventorySelection = (itemId: number) => {
    const newSelected = new Set(selectedInventoryItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      // Remover del exitBoxForm si estaba agregado
      setExitBoxForm(prev => ({
        ...prev,
        items: prev.items.filter(item => item.itemId !== itemId)
      }));
    } else {
      newSelected.add(itemId);
      // Agregar al exitBoxForm
      const inventoryItem = currentInventory.find(item => item.item_id === itemId);
      if (inventoryItem) {
        setExitBoxForm(prev => ({
          ...prev,
          items: [...prev.items, {
            itemId: inventoryItem.item_id,
            productName: inventoryItem.name,
            categoryName: inventoryItem.category,
            quantityToUse: 1,
            availableQuantity: inventoryItem.quantity,
            unit: inventoryItem.unit || 'un'
          }]
        }));
      }
    }
    setSelectedInventoryItems(newSelected);
  };

  const updateExitItemQuantity = (index: number, quantity: number) => {
    setExitBoxForm(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => 
        idx === index ? { ...item, quantityToUse: Math.min(quantity, item.availableQuantity) } : item
      )
    }));
  };

  const removeExitItem = (index: number) => {
    const item = exitBoxForm.items[index];
    setExitBoxForm(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
    // Remover de la selección
    const newSelected = new Set(selectedInventoryItems);
    newSelected.delete(item.itemId);
    setSelectedInventoryItems(newSelected);
  };

  const createExitBox = async () => {
    if (!exitBoxForm.name.trim()) {
      alert('El nombre de la caja es requerido');
      return;
    }

    if (exitBoxForm.items.length === 0) {
      alert('Debe agregar al menos un item a la caja');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Registrar las salidas en el backend
      const exits = exitBoxForm.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantityToUse,
        familyId: null, // Sin familia asignada aún
        reason: `Caja de salida: ${exitBoxForm.name}`,
        notes: exitBoxForm.description || undefined
      }));

      // Usar el endpoint de salidas múltiples
      await createBulkExitMovement(centerId, { exits });

      alert(`¡Caja de salida "${exitBoxForm.name}" creada exitosamente!\n\nLa caja contiene ${exitBoxForm.items.length} items y está lista para ser entregada a una familia.`);
      
      // Limpiar el formulario
      setExitBoxForm({
        name: '',
        description: '',
        items: []
      });
      setSelectedInventoryItems(new Set());
      
      // Volver a la pestaña de plantillas
      setActiveTab('templates');
      
      onSuccess();
    } catch (error) {
      console.error('Error creating exit box:', error);
      alert('Error al crear la caja de salida');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para renderizar la pestaña de cajas de salida
  const renderExitBoxesTab = () => (
    <>
      <div className="exit-boxes-header">
        <h4>📦 Cajas de Salida Creadas</h4>
        <p>Cajas listas para entregar a familias</p>
      </div>

      <div className="boxes-grid">
        {exitBoxes.length === 0 ? (
          <div className="empty-boxes">
            No hay cajas de salida creadas. Ve a "Crear Caja de Salida" para crear una.
          </div>
        ) : (
          exitBoxes.map(box => (
            <div key={box.box_id} className="box-card exit-box-card">
              <div className="exit-box-badge">🚚 SALIDA</div>
              <h4>{box.name}</h4>
              {box.description && <p className="box-description">{box.description}</p>}
              <div className="box-items-count">{box.items.length} items</div>
              <div className="box-items-preview">
                {box.items.slice(0, 3).map((item: any, idx: number) => (
                  <span key={idx} className="item-preview">
                    {item.quantity} {item.unit} {item.item_name}
                  </span>
                ))}
                {box.items.length > 3 && (
                  <span className="more-items">+{box.items.length - 3} más</span>
                )}
              </div>
              <div className="exit-box-status">
                ✅ Lista para entrega
              </div>
              <div className="exit-box-actions-grid">
                <button 
                  className="deliver-box-btn"
                  onClick={() => deliverExitBox(box)}
                >
                  Entregar a Familia
                </button>
                <button 
                  className="delete-exit-box-btn"
                  onClick={() => deleteExitBox(box.box_id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  // Funciones para manejar cajas de salida (deprecated - ahora se usan movimientos directos)
  const deliverExitBox = (box: any) => {
    // Esta funcionalidad ha sido reemplazada por movimientos de salida directos
    alert('Esta funcionalidad ha sido actualizada. Use la pestaña "Crear Caja de Salida" para registrar salidas.');
  };

  const deleteExitBox = (boxId: number) => {
    // Las cajas de salida ahora se registran directamente como movimientos
    alert('Las cajas de salida ahora se registran como movimientos de inventario.');
  };

  const executeExitBoxDelivery = async () => {
    // Esta funcionalidad ha sido reemplazada por movimientos de salida directos
    alert('Esta funcionalidad ha sido actualizada. Las salidas ahora se registran directamente.');
  };

  if (isLoading) {
    return (
      <div className="box-manager-container">
        <div className="loading">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="box-manager-overlay">
      <div className="box-manager-modal">
        <div className="box-manager-header">
          <h3>📦 Gestión de Cajas de Recursos</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Pestañas de navegación */}
        <div className="tabs-container">
          <button 
            className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            📋 Plantillas de Cajas
          </button>
          <button 
            className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Inventario Actual
          </button>
          <button 
            className={`tab ${activeTab === 'create-exit' ? 'active' : ''}`}
            onClick={() => setActiveTab('create-exit')}
          >
            🚚 Crear Caja de Salida
          </button>
          <button 
            className={`tab ${activeTab === 'exit-boxes' ? 'active' : ''}`}
            onClick={() => setActiveTab('exit-boxes')}
          >
            📦 Cajas de Salida ({exitBoxes.length})
          </button>
        </div>

        <div className="box-manager-content">
          {activeTab === 'templates' && renderTemplatesTab()}
          {activeTab === 'inventory' && renderInventoryTab()}
          {activeTab === 'create-exit' && renderCreateExitTab()}
          {activeTab === 'exit-boxes' && renderExitBoxesTab()}
        </div>

      {/* Modal para crear nueva caja */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <h4>Crear Nueva Caja de Recursos</h4>
            
            <div className="form-group">
              <label>Nombre de la caja *</label>
              <input
                type="text"
                value={boxForm.name}
                onChange={(e) => setBoxForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Kit de Alimentos Básicos"
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={boxForm.description}
                onChange={(e) => setBoxForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional de la caja"
                rows={3}
              />
            </div>

            <div className="box-items-section">
              <div className="items-header">
                <h5>Items de la caja ({boxForm.items.length})</h5>
                <button
                  type="button"
                  className="add-item-btn"
                  onClick={() => setShowAddItemToBox(true)}
                >
                  + Agregar Item
                </button>
              </div>

              {boxForm.items.length > 0 ? (
                <div className="box-items-list">
                  {boxForm.items.map((item, index) => {
                    const categoryName = categories.find(cat => cat.category_id === item.category_id)?.name || 'Sin categoría';
                    return (
                      <div key={index} className="box-item-row">
                        <div className="item-info">
                          <span className="item-name">{item.item_name}</span>
                          <span className="item-category">{categoryName}</span>
                          <span className="item-quantity">{item.quantity} {item.unit}</span>
                        </div>
                        <button
                          type="button"
                          className="remove-item-btn"
                          onClick={() => removeItemFromBox(index)}
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-items">
                  No hay items en la caja. Use el botón "Agregar Item" para comenzar.
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setBoxForm({ name: '', description: '', items: [] });
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={createNewBox}
                disabled={isSubmitting || boxForm.items.length === 0}
              >
                {isSubmitting ? 'Creando...' : 'Crear Caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar item a la caja */}
      {showAddItemToBox && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Agregar Item a la Caja</h4>
            
            <div className="form-group">
              <label>Seleccionar Item del Inventario *</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(Number(e.target.value))}
              >
                <option value={0}>-- Seleccione un item --</option>
                {currentInventory.map(item => (
                  <option key={item.item_id} value={item.item_id}>
                    {item.name} ({item.category}) - Stock: {item.quantity} {item.unit}
                  </option>
                ))}
              </select>
              <small>Seleccione un item existente del inventario</small>
            </div>

            <div className="form-group">
              <label>Cantidad *</label>
              <input
                type="number"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Notas</label>
              <input
                type="text"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Notas adicionales (opcional)"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowAddItemToBox(false);
                  setNewItemQuantity(1);
                  setNewItemNotes('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={addItemToBox}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para usar caja */}
      {selectedBox && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Usar Caja: {selectedBox.name}</h4>
            
            {selectedBox.description && (
              <p className="box-description">{selectedBox.description}</p>
            )}

            <div className="box-preview">
              <h5>Items que se registrarán:</h5>
              <div className="items-preview-list">
                {selectedBox.items.map((item, idx) => {
                  const categoryName = categories.find(cat => cat.category_id === item.category_id)?.name || 'Sin categoría';
                  return (
                    <div key={idx} className="preview-item">
                      <span className="item-name">{item.item_name}</span>
                      <span className="item-category">{categoryName}</span>
                      <span className="item-quantity">{item.quantity} {item.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Motivo de la entrada *</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Donación mensual, Compra programada"
              />
            </div>

            <div className="form-group">
              <label>Notas adicionales</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional opcional"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedBox(null);
                  setReason('');
                  setNotes('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={useBox}
                disabled={isSubmitting || !reason.trim()}
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para entregar caja de salida */}
      {selectedExitBox && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>🚚 Entregar Caja: {selectedExitBox.name}</h4>
            
            {selectedExitBox.description && (
              <p className="box-description">{selectedExitBox.description}</p>
            )}

            <div className="box-preview">
              <h5>Items que se entregarán:</h5>
              <div className="items-preview-list">
                {selectedExitBox.items.map((item: any, idx: number) => (
                  <div key={idx} className="preview-item">
                    <span className="item-name">{item.item_name}</span>
                    <span className="item-category">{item.category}</span>
                    <span className="item-quantity">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Motivo de la entrega *</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Entrega mensual familia García"
              />
            </div>

            <div className="form-group">
              <label>Notas adicionales</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional sobre la entrega"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedExitBox(null);
                  setReason('');
                  setNotes('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={executeExitBoxDelivery}
                disabled={isSubmitting || !reason.trim()}
              >
                {isSubmitting ? 'Entregando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}