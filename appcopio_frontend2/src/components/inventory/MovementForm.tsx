// src/components/inventory/MovementForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import type { Category, InventoryItem } from '@/types/inventory';
import type { ResourceBox, BoxItemTemplate } from '@/types/movements';
import { listCategories, createCategory } from '@/services/categories.service';
import { listCenterInventory, createInventoryItem } from '@/services/inventory.service';
import { 
  getResourceBoxes, 
  createEntryMovement, 
  createBulkExitMovement,
  validateStock 
} from '@/services/movements.service';
import { familyService, type FamilyGroup } from '@/services/family.service';
import './MovementForm.css';

interface MovementFormProps {
  centerId: string;
  type: 'entry' | 'exit';
  onClose: () => void;
  onSuccess: () => void;
}

interface MovementItem {
  id: string;
  item_id?: number;
  item_name: string;
  category_id: number;
  category_name?: string;
  quantity: number;
  unit: string;
  unit_cost?: number;
  available_stock?: number;
  is_new_item: boolean;
  notes?: string;
}

export default function MovementForm({ centerId, type, onClose, onSuccess }: MovementFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<ResourceBox[]>([]);
  const [currentInventory, setCurrentInventory] = useState<InventoryItem[]>([]);
  const [families, setFamilies] = useState<FamilyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [items, setItems] = useState<MovementItem[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateMultiplier, setTemplateMultiplier] = useState(1);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [itemFormMode, setItemFormMode] = useState<'existing' | 'new'>('existing');
  
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemCost, setItemCost] = useState<number | undefined>();

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<number>(0);
  const [newItemUnit, setNewItemUnit] = useState('');

  const [stockErrors, setStockErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadData();
  }, []);

  // Asegurar que para salidas siempre esté en modo 'existing'
  useEffect(() => {
    if (type === 'exit') {
      setItemFormMode('existing');
    }
  }, [type]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cats, boxes, inventory] = await Promise.all([
        listCategories(),
        getResourceBoxes(),
        listCenterInventory(centerId),
      ]);

      setCategories(cats);
      setTemplates(boxes);
      setCurrentInventory(inventory);

      if (cats.length > 0) {
        setNewItemCategory(cats[0].category_id);
      }
      if (inventory.length > 0) {
        setSelectedItemId(inventory[0].item_id);
      }

      if (type === 'exit') {
        const familyList = await familyService.list();
        const familiesWithHeadNames = await Promise.all(
          familyList.map(async (family) => {
            const headOfHouseholdName = await familyService.getPersonName(family.jefe_hogar_person_id);
            return { ...family, headOfHouseholdName };
          })
        );
        setFamilies(familiesWithHeadNames);
        if (familiesWithHeadNames.length > 0) {
          setSelectedFamilyId(familiesWithHeadNames[0].family_id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadTemplate = () => {
    if (!selectedTemplateId) {
      alert('Selecciona una plantilla primero');
      return;
    }

    if (templateMultiplier < 1) {
      alert('El multiplicador debe ser al menos 1');
      return;
    }

    const template = templates.find((t) => t.box_id === selectedTemplateId);
    if (!template) {
      alert('Plantilla no encontrada');
      return;
    }

    const templateItems: MovementItem[] = template.items.map((item) => {
      const categoryObj = categories.find((c) => c.category_id === item.category_id);
      const inventoryItem = currentInventory.find((inv) => inv.item_id === item.item_id);

      return {
        id: crypto.randomUUID(),
        item_id: item.item_id,
        item_name: item.item_name,
        category_id: item.category_id,
        category_name: categoryObj?.name || 'Sin categoría',
        quantity: item.quantity * templateMultiplier,
        unit: item.unit,
        available_stock: inventoryItem?.quantity,
        is_new_item: !item.item_id,
        notes: item.notes,
      };
    });

    setItems(templateItems);
    setTemplateLoaded(true);
    alert(`Plantilla "${template.name}" cargada con multiplicador x${templateMultiplier}`);
  };

  // Preview of selected template before applying
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => t.box_id === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  const previewItems = useMemo(() => {
    if (!selectedTemplate) return [] as Array<{ name: string; category: string; qty: number; unit: string }>;
    const mult = Math.max(1, Number(templateMultiplier || 1));
    return selectedTemplate.items.map((it) => {
      const categoryName = categories.find((c) => c.category_id === it.category_id)?.name || 'Sin categoría';
      return { name: it.item_name, category: categoryName, qty: (it.quantity || 0) * mult, unit: it.unit };
    });
  }, [selectedTemplate, templateMultiplier, categories]);

  const handleResetTemplate = () => {
    if (window.confirm('¿Deseas descartar la plantilla cargada y empezar de cero?')) {
      setItems([]);
      setTemplateLoaded(false);
      setSelectedTemplateId(null);
      setTemplateMultiplier(1);
    }
  };

  const handleAddItem = async () => {
    if (itemFormMode === 'existing') {
      if (!selectedItemId || itemQuantity <= 0) {
        alert('Debe seleccionar un item y la cantidad debe ser mayor a 0');
        return;
      }

      const selectedItem = currentInventory.find((i) => i.item_id === selectedItemId);
      if (!selectedItem) {
        alert('Item no encontrado');
        return;
      }

      const categoryObj = categories.find((c) => c.name === selectedItem.category);

      const newItem: MovementItem = {
        id: crypto.randomUUID(),
        item_id: selectedItem.item_id,
        item_name: selectedItem.name,
        category_id: categoryObj?.category_id || 0,
        category_name: selectedItem.category,
        quantity: itemQuantity,
        unit: selectedItem.unit || '',
        unit_cost: type === 'entry' ? itemCost : undefined,
        available_stock: type === 'exit' ? selectedItem.quantity : undefined,
        is_new_item: false,
      };

      setItems((prev) => [...prev, newItem]);
    } else {
      if (!newItemName.trim() || !newItemUnit.trim() || itemQuantity <= 0) {
        alert('Todos los campos son requeridos y la cantidad debe ser mayor a 0');
        return;
      }

      try {
        const categoryObj = categories.find((c) => c.category_id === newItemCategory);
        const createdItem = await createInventoryItem(centerId, {
          itemName: newItemName.trim(),
          categoryId: newItemCategory,
          quantity: 0,
          unit: newItemUnit.trim(),
        });

        const newItem: MovementItem = {
          id: crypto.randomUUID(),
          item_id: createdItem.item_id,
          item_name: newItemName.trim(),
          category_id: newItemCategory,
          category_name: categoryObj?.name || 'Sin categoría',
          quantity: itemQuantity,
          unit: newItemUnit.trim(),
          unit_cost: type === 'entry' ? itemCost : undefined,
          available_stock: 0,
          is_new_item: true,
        };

        setItems((prev) => [...prev, newItem]);
        
        setCurrentInventory((prev) => [...prev, {
          item_id: createdItem.item_id,
          name: newItemName.trim(),
          category: categoryObj?.name || 'Sin categoría',
          quantity: 0,
          unit: newItemUnit.trim(),
          updated_at: new Date().toISOString(),
          updated_by_user: 'Sistema',
        }]);

        alert(`Item "${newItemName}" creado exitosamente en Products`);
      } catch (error) {
        console.error('Error creating new item:', error);
        alert('Error al crear el item en Products');
        return;
      }
    }

    resetAddItemForm();
  };

  const resetAddItemForm = () => {
    setShowAddItemForm(false);
    setItemQuantity(1);
    setItemCost(undefined);
    setNewItemName('');
    setNewItemUnit('');
    // Para salidas, siempre mantener modo existente
    setItemFormMode(type === 'exit' ? 'existing' : 'existing');
  };

  const handleUpdateItemQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (type === 'exit' && items.length > 0) {
      const errors: {[key: string]: string} = {};
      
      items.forEach((item) => {
        if (item.available_stock !== undefined && item.quantity > item.available_stock) {
          errors[item.id] = `Stock insuficiente (disponible: ${item.available_stock})`;
        }
      });

      setStockErrors(errors);
    }
  }, [items, type]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('El motivo es requerido');
      return;
    }

    if (items.length === 0) {
      alert('Debe agregar al menos un item');
      return;
    }

    if (type === 'exit' && !selectedFamilyId) {
      alert('Debe seleccionar una familia para la salida');
      return;
    }

    if (type === 'exit' && Object.keys(stockErrors).length > 0) {
      alert('Hay items con stock insuficiente. Por favor corrige las cantidades.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (type === 'entry') {
        await createEntryMovement(centerId, {
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          items: items.map((item) => ({
            item_id: item.item_id,
            item_name: item.item_name,
            category_id: item.category_id,
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: item.unit_cost,
          })),
        });

        alert('Entrada registrada exitosamente');
      } else {
        const exits = items.map((item) => ({
          itemId: item.item_id!,
          quantity: item.quantity,
          familyId: selectedFamilyId,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        }));

        await createBulkExitMovement(centerId, { exits });

        alert('Salida registrada exitosamente');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error submitting movement:', error);
      alert(error.response?.data?.error || error.message || 'Error al registrar el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="entry-form-overlay">
        <div className="entry-form-modal">
          <div className="entry-form-container">
            <div className="entry-form-header">
              <h3>{type === 'entry' ? '📥 Registrar Entrada' : '📤 Registrar Salida'}</h3>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="entry-form">
              <p>Cargando datos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="entry-form-overlay">
      <div className="entry-form-modal">
        <div className="entry-form-container">
          <div className="entry-form-header">
            <h3>{type === 'entry' ? '📥 Registrar Entrada' : '📤 Registrar Salida'}</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="entry-form">
            {/* Plantilla */}
            {templates.length > 0 && (
              <div className="form-section">
                <h4>Usar Plantilla (Opcional)</h4>
                
                <div className="form-group">
                  <label>Seleccionar Plantilla</label>
                  <select
                    value={selectedTemplateId || ''}
                    onChange={(e) => setSelectedTemplateId(Number(e.target.value) || null)}
                    disabled={templateLoaded}
                  >
                    <option value="">-- Sin plantilla --</option>
                    {templates.map((template) => (
                      <option key={template.box_id} value={template.box_id}>
                        {template.name} ({template.items.length} items)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplateId && !templateLoaded && (
                  <>
                    <div className="form-group">
                      <label>Multiplicador (ej: x4 cajas)</label>
                      <input
                        type="number"
                        min="1"
                        value={templateMultiplier}
                        onChange={(e) => setTemplateMultiplier(Number(e.target.value))}
                      />
                    </div>

                    {selectedTemplate && (
                      <div className="template-preview">
                        <h5>Vista previa: {selectedTemplate.name}</h5>
                        <div className="template-preview-list">
                          {previewItems.map((pi, idx) => (
                            <div key={idx} className="template-preview-item">
                              <span className="name">{pi.name}</span>
                              <span className="meta">{pi.category}</span>
                              <span className="meta">{pi.qty} {pi.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="items-actions">
                      <button className="template-btn" onClick={handleLoadTemplate}>
                        Cargar Plantilla
                      </button>
                    </div>
                  </>
                )}

                {templateLoaded && (
                  <div className="items-actions">
                    <button className="btn-secondary" onClick={handleResetTemplate}>
                      Descartar Plantilla
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Información General */}
            <div className="form-section">
              <h4>Información General</h4>

              {type === 'exit' && (
                <div className="form-group">
                  <label>Familia *</label>
                  <select
                    value={selectedFamilyId || ''}
                    onChange={(e) => setSelectedFamilyId(Number(e.target.value))}
                    disabled={isSubmitting}
                  >
                    {families.map((family) => (
                      <option key={family.family_id} value={family.family_id}>
                        {family.headOfHouseholdName || `Familia ${family.family_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Motivo *</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={type === 'entry' ? 'Ej: Donación, Compra' : 'Ej: Entrega mensual'}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Información adicional (opcional)"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Items */}
            <div className="form-section">
              <div className="items-header">
                <h4>Items</h4>
                <button
                  className="add-item-btn"
                  onClick={() => {
                    setShowAddItemForm(true);
                    // Para salidas, forzar modo 'existing'
                    if (type === 'exit') {
                      setItemFormMode('existing');
                    }
                  }}
                  disabled={isSubmitting}
                >
                  + Añadir Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="empty-items">
                  No hay items agregados. {templates.length > 0 ? 'Usa una plantilla o haz' : 'Haz'} clic en "Añadir Item" para comenzar.
                </div>
              ) : (
                <div className="items-list">
                  {items.map((item) => {
                    const hasError = stockErrors[item.id];
                    return (
                      <div key={item.id} className={`item-row ${hasError ? 'error-row' : ''}`}>
                        <div className="item-info">
                          <span className="item-name">{item.item_name}</span>
                          <span className="item-category">{item.category_name}</span>
                          <div className="qty-control" title="Modificar cantidad">
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => handleUpdateItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                              disabled={isSubmitting || item.quantity <= 1}
                              aria-label="Disminuir"
                            >
                              −
                            </button>
                            <input
                              className="qty-input"
                              type="number"
                              min={1}
                              step={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const v = Math.max(1, Math.floor(Number(e.target.value) || 0));
                                handleUpdateItemQuantity(item.id, v);
                              }}
                              disabled={isSubmitting}
                            />
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                              disabled={
                                isSubmitting || (type === 'exit' && typeof item.available_stock === 'number' && item.quantity >= item.available_stock)
                              }
                              aria-label="Aumentar"
                            >
                              +
                            </button>
                            <span className="qty-unit">{item.unit}</span>
                          </div>
                          {item.is_new_item && (
                            <span className="new-item-badge">Nuevo</span>
                          )}
                          {type === 'exit' && item.available_stock !== undefined && (
                            <span className={item.quantity <= item.available_stock ? 'text-success' : 'text-danger'}>
                              Stock: {item.available_stock}
                            </span>
                          )}
                          {hasError && (
                            <span className="text-danger">{hasError}</span>
                          )}
                        </div>
                        <button
                          className="remove-item-btn"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isSubmitting}
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                className="btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting || items.length === 0}
              >
                {isSubmitting ? 'Guardando...' : type === 'entry' ? 'Registrar Entrada' : 'Registrar Salida'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para agregar item */}
      {showAddItemForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Agregar Item</h4>

            {type === 'entry' && (
              <div className="form-group">
                <label>Tipo de Item:</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="existing"
                      checked={itemFormMode === 'existing'}
                      onChange={() => setItemFormMode('existing')}
                    />
                    Item Existente
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="new"
                      checked={itemFormMode === 'new'}
                      onChange={() => setItemFormMode('new')}
                    />
                    Crear Nuevo Item
                  </label>
                </div>
              </div>
            )}

            {(itemFormMode === 'existing' || type === 'exit') ? (
              <div className="form-group">
                <label>Seleccionar Item *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(Number(e.target.value))}
                >
                  {currentInventory.map((item) => (
                    <option key={item.item_id} value={item.item_id}>
                      {item.name} ({item.category}) - Stock: {item.quantity} {item.unit}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Nombre del Item *</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Ej: Arroz"
                  />
                </div>

                <div className="form-group">
                  <label>Categoría *</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(Number(e.target.value))}
                  >
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Unidad *</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="Ej: kg, litros, unidades"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Cantidad *</label>
              <input
                type="number"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(Number(e.target.value))}
                min="1"
              />
            </div>

            {type === 'entry' && (
              <div className="form-group">
                <label>Costo Unitario (opcional)</label>
                <input
                  type="number"
                  value={itemCost || ''}
                  onChange={(e) => setItemCost(Number(e.target.value) || undefined)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={resetAddItemForm}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddItem}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
