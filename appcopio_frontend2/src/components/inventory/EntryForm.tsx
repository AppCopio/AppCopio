// src/components/inventory/EntryForm.tsx
import React, { useState, useEffect } from 'react';
import type { Category, InventoryItem } from '@/types/inventory';
import type { EntryMovementCreateDTO, EntryItemCreateDTO } from '@/types/movements';
import { createEntryMovement, savePendingOperation } from '@/services/movements.service';
import { listCategories } from '@/services/categories.service';
import './EntryForm.css';

interface EntryFormProps {
  centerId: string;
  currentInventory: InventoryItem[];
  isOffline?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface EntryItem {
  id: string; // ID temporal para el form
  item_id?: number; // ID del item existente (opcional)
  item_name: string;
  category_id: number;
  quantity: number;
  unit: string;
  unit_cost?: number;
  is_new_item: boolean;
}

export default function EntryForm({ centerId, currentInventory, isOffline = false, onClose, onSuccess }: EntryFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<EntryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para el formulario de agregar item
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<number>(0);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemCost, setNewItemCost] = useState<number | undefined>();
  const [isNewItem, setIsNewItem] = useState(true);
  const [selectedExistingItem, setSelectedExistingItem] = useState<number | undefined>();

  // Cargar categorías al montar
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await listCategories();
        setCategories(cats);
        if (cats.length > 0) {
          setNewItemCategory(cats[0].category_id);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  const addItemToList = () => {
    const existingItem = !isNewItem && selectedExistingItem 
      ? currentInventory.find(item => item.item_id === selectedExistingItem)
      : null;

    // Validación diferente para items nuevos vs existentes
    if (isNewItem) {
      // Para items nuevos, todos los campos son requeridos
      if (!newItemName.trim() || newItemQuantity <= 0 || !newItemUnit.trim()) {
        alert('Todos los campos son requeridos y la cantidad debe ser mayor a 0');
        return;
      }
    } else {
      // Para items existentes, solo validar que se haya seleccionado un item y la cantidad
      if (!selectedExistingItem || newItemQuantity <= 0) {
        alert('Debe seleccionar un item existente y la cantidad debe ser mayor a 0');
        return;
      }
      if (!existingItem) {
        alert('El item seleccionado no es válido');
        return;
      }
    }

    // Si es item existente, buscar su category_id basado en el nombre de categoría
    let categoryId = newItemCategory;
    if (existingItem) {
      const existingCategory = categories.find(cat => cat.name === existingItem.category);
      categoryId = existingCategory?.category_id || newItemCategory;
    }

    const newItem: EntryItem = {
      id: crypto.randomUUID(),
      item_id: existingItem?.item_id,
      item_name: existingItem?.name || newItemName.trim(),
      category_id: categoryId,
      quantity: newItemQuantity,
      unit: existingItem?.unit || newItemUnit.trim(),
      unit_cost: newItemCost,
      is_new_item: isNewItem
    };

    setItems(prev => [...prev, newItem]);
    
    // Reset form
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('');
    setNewItemCost(undefined);
    setSelectedExistingItem(undefined);
    setShowAddItem(false);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('El motivo es requerido');
      return;
    }

    if (items.length === 0) {
      alert('Debe agregar al menos un item');
      return;
    }

    setIsSubmitting(true);

    try {
      const entryData: EntryMovementCreateDTO = {
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        items: items.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          category_id: item.category_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost
        }))
      };

      if (isOffline) {
        // Guardar para sincronización posterior
        savePendingOperation({
          type: 'ENTRY',
          center_id: centerId,
          data: entryData
        });
        alert('Entrada guardada offline. Se sincronizará cuando haya conexión.');
      } else {
        // Enviar inmediatamente
        await createEntryMovement(centerId, entryData);
        alert('Entrada registrada exitosamente');
      }

      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Error registering entry:', error);
      alert(`Error: ${error?.response?.data?.error || error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = currentInventory.filter(item => {
    const selectedCategory = categories.find(cat => cat.category_id === newItemCategory);
    return item.category === selectedCategory?.name;
  });

  return (
    <div className="entry-form-overlay">
      <div className="entry-form-modal">
        <div className="entry-form-header">
          <h3>📥 Registrar Entrada de Recursos</h3>
          {isOffline && <span className="offline-indicator">📡 Sin conexión - Se guardará offline</span>}
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-section">
          <h4>Información General</h4>
          <div className="form-group">
            <label htmlFor="reason">Motivo de la entrada *</label>
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Donación de alimentos, Compra de insumos"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="notes">Notas adicionales</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional opcional"
              rows={3}
            />
          </div>
        </div>

        <div className="form-section">
          <div className="items-header">
            <h4>Items a recibir ({items.length})</h4>
            <button
              type="button"
              className="add-item-btn"
              onClick={() => setShowAddItem(true)}
            >
              + Agregar Item
            </button>
          </div>

          {items.length > 0 && (
            <div className="items-list">
              {items.map(item => {
                const categoryName = categories.find(cat => cat.category_id === item.category_id)?.name || 'Sin categoría';
                return (
                  <div key={item.id} className="item-row">
                    <div className="item-info">
                      <span className="item-name">{item.item_name}</span>
                      <span className="item-category">{categoryName}</span>
                      <span className="item-quantity">{item.quantity} {item.unit}</span>
                      {item.unit_cost && <span className="item-cost">${item.unit_cost}</span>}
                      {item.is_new_item && <span className="new-item-badge">Nuevo</span>}
                    </div>
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => removeItem(item.id)}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {items.length === 0 && (
            <div className="empty-items">
              No hay items agregados. Use el botón "Agregar Item" para comenzar.
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? 'Registrando...' : isOffline ? 'Guardar Offline' : 'Registrar Entrada'}
          </button>
        </div>
      </form>

      {/* Modal para agregar item */}
      {showAddItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Agregar Item</h4>
            
            <div className="form-group">
              <label>Tipo de item</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    checked={isNewItem}
                    onChange={() => setIsNewItem(true)}
                  />
                  Crear nuevo item
                </label>
                <label>
                  <input
                    type="radio"
                    checked={!isNewItem}
                    onChange={() => setIsNewItem(false)}
                  />
                  Incrementar item existente
                </label>
              </div>
            </div>

            {isNewItem ? (
              <>
                <div className="form-group">
                  <label htmlFor="itemName">Nombre del item *</label>
                  <input
                    id="itemName"
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Nombre del nuevo item"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Categoría *</label>
                  <select
                    id="category"
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
                  <label htmlFor="unit">Unidad *</label>
                  <input
                    id="unit"
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="Ej: kg, lts, un"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="category">Categoría</label>
                  <select
                    id="category"
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
                  <label htmlFor="existingItem">Item existente *</label>
                  <select
                    id="existingItem"
                    value={selectedExistingItem || ''}
                    onChange={(e) => setSelectedExistingItem(Number(e.target.value) || undefined)}
                  >
                    <option value="">Seleccionar item...</option>
                    {filteredInventory.map(item => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.name} (Stock actual: {item.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="quantity">Cantidad *</label>
              <input
                id="quantity"
                type="number"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                min="1"
                step="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cost">Costo unitario (opcional)</label>
              <input
                id="cost"
                type="number"
                value={newItemCost || ''}
                onChange={(e) => setNewItemCost(e.target.value ? Number(e.target.value) : undefined)}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowAddItem(false);
                  setNewItemName('');
                  setNewItemQuantity(1);
                  setNewItemUnit('');
                  setNewItemCost(undefined);
                  setSelectedExistingItem(undefined);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={addItemToList}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}