// src/components/inventory/ResourceBoxManager.tsx
import React, { useState, useEffect } from 'react';
import type { Category } from '@/types/inventory';
import type { ResourceBox, BoxItemTemplate } from '@/types/movements';
import { listCategories } from '@/services/categories.service';
import { getResourceBoxes, createResourceBox, createBoxEntry } from '@/services/movements.service';
import './ResourceBoxManager.css';

interface ResourceBoxManagerProps {
  centerId: string;
  isOffline?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BoxForm {
  name: string;
  description: string;
  items: BoxItemTemplate[];
}

export default function ResourceBoxManager({ centerId, isOffline = false, onClose, onSuccess }: ResourceBoxManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [resourceBoxes, setResourceBoxes] = useState<ResourceBox[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUseBox, setShowUseBox] = useState(false);
  const [selectedBox, setSelectedBox] = useState<ResourceBox | null>(null);
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
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<number>(0);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cats, boxes] = await Promise.all([
        listCategories(),
        getResourceBoxes()
      ]);
      
      setCategories(cats);
      setResourceBoxes(boxes);
      
      if (cats.length > 0) {
        setNewItemCategory(cats[0].category_id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToBox = () => {
    if (!newItemName.trim() || newItemQuantity <= 0 || !newItemUnit.trim()) {
      alert('Todos los campos son requeridos y la cantidad debe ser mayor a 0');
      return;
    }

    const newItem: BoxItemTemplate = {
      item_name: newItemName.trim(),
      category_id: newItemCategory,
      quantity: newItemQuantity,
      unit: newItemUnit.trim(),
      notes: newItemNotes.trim() || undefined
    };

    setBoxForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset form
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('');
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
      if (isOffline) {
        // Simular uso offline - aquí podrías implementar lógica de almacenamiento local
        alert('Función offline no implementada para cajas');
      } else {
        await createBoxEntry(centerId, {
          box_id: selectedBox.box_id!,
          reason: reason.trim(),
          notes: notes.trim() || undefined
        });
        
        alert('Entrada desde caja registrada exitosamente');
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error using resource box:', error);
      alert(`Error: ${error?.response?.data?.error || error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="box-manager-container">
        <div className="loading">Cargando cajas de recursos...</div>
      </div>
    );
  }

  return (
    <div className="box-manager-container">
      <div className="box-manager-header">
        <h3>Gestión de Cajas de Recursos</h3>
        {isOffline && <span className="offline-indicator">📡 Sin conexión</span>}
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="box-manager-content">
        <div className="action-buttons">
          <button 
            className="btn-primary" 
            onClick={() => setShowCreateForm(true)}
          >
            + Crear Nueva Caja
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => setShowUseBox(true)}
            disabled={resourceBoxes.length === 0}
          >
            📦 Usar Caja Existente
          </button>
        </div>

        <div className="boxes-grid">
          {resourceBoxes.length === 0 ? (
            <div className="empty-boxes">
              No hay cajas de recursos creadas. Cree una nueva caja para comenzar.
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
                    setShowUseBox(true);
                  }}
                >
                  Usar Esta Caja
                </button>
              </div>
            ))
          )}
        </div>
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
              <label>Nombre del item *</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nombre del item"
              />
            </div>

            <div className="form-group">
              <label>Categoría *</label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(Number(e.target.value))}
              >
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
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
              <label>Unidad *</label>
              <input
                type="text"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                placeholder="Ej: kg, lts, un"
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
                  setNewItemName('');
                  setNewItemQuantity(1);
                  setNewItemUnit('');
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
      {showUseBox && selectedBox && (
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
                  setShowUseBox(false);
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
    </div>
  );
}