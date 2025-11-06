// src/components/inventory/BoxTemplateManager.tsx
import React, { useState, useEffect } from 'react';
import type { Category, InventoryItem } from '@/types/inventory';
import type { ResourceBox, BoxItemTemplate } from '@/types/movements';
import { listCategories, createCategory } from '@/services/categories.service';
import { listCenterInventory, createInventoryItem } from '@/services/inventory.service';
import {
  getResourceBoxes,
  createResourceBox,
  updateResourceBox,
  deleteResourceBox,
} from '@/services/movements.service';
import './BoxTemplateManager.css';

interface BoxTemplateManagerProps {
  centerId: string;
  onClose: () => void;
}

interface BoxForm {
  name: string;
  description: string;
  items: BoxItemTemplate[];
}

export default function BoxTemplateManager({ centerId, onClose }: BoxTemplateManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<ResourceBox[]>([]);
  const [currentInventory, setCurrentInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modo: 'list' | 'create' | 'edit'
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<ResourceBox | null>(null);

  // Estado del formulario
  const [boxForm, setBoxForm] = useState<BoxForm>({
    name: '',
    description: '',
    items: [],
  });

  // Estado para agregar item a la caja
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [itemFormMode, setItemFormMode] = useState<'existing' | 'new'>('existing');
  
  // Para item existente
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');

  // Para item nuevo
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<number>(0);
  const [newItemUnit, setNewItemUnit] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nueva plantilla
  const startCreateTemplate = () => {
    setBoxForm({
      name: '',
      description: '',
      items: [],
    });
    setMode('create');
  };

  // Editar plantilla existente
  const startEditTemplate = (template: ResourceBox) => {
    setEditingTemplate(template);
    setBoxForm({
      name: template.name,
      description: template.description || '',
      items: [...template.items],
    });
    setMode('edit');
  };

  // Eliminar plantilla
  const handleDeleteTemplate = async (boxId: number, templateName: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la plantilla "${templateName}"?`)) {
      return;
    }

    try {
      await deleteResourceBox(boxId);
      setTemplates((prev) => prev.filter((t) => t.box_id !== boxId));
      alert('Plantilla eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al eliminar la plantilla');
    }
  };

  // Guardar plantilla (crear o actualizar)
  const handleSaveTemplate = async () => {
    if (!boxForm.name.trim()) {
      alert('El nombre de la plantilla es requerido');
      return;
    }

    if (boxForm.items.length === 0) {
      alert('Debe agregar al menos un item a la plantilla');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const newTemplate = await createResourceBox(boxForm);
        setTemplates((prev) => [...prev, newTemplate]);
        alert('Plantilla creada exitosamente');
      } else if (mode === 'edit' && editingTemplate?.box_id) {
        const updated = await updateResourceBox(editingTemplate.box_id, boxForm);
        setTemplates((prev) =>
          prev.map((t) => (t.box_id === editingTemplate.box_id ? updated : t))
        );
        alert('Plantilla actualizada exitosamente');
      }

      setMode('list');
      setEditingTemplate(null);
      setBoxForm({ name: '', description: '', items: [] });
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar la plantilla');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar edición/creación
  const handleCancelEdit = () => {
    setMode('list');
    setEditingTemplate(null);
    setBoxForm({ name: '', description: '', items: [] });
  };

  // Agregar item a la plantilla
  const handleAddItemToTemplate = () => {
    if (itemFormMode === 'existing') {
      // Item existente
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

      const newItem: BoxItemTemplate = {
        item_id: selectedItem.item_id,
        item_name: selectedItem.name,
        category_id: categoryObj?.category_id || 0,
        quantity: itemQuantity,
        unit: selectedItem.unit || '',
        notes: itemNotes,
      };

      setBoxForm((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
    } else {
      // Item nuevo
      if (!newItemName.trim() || !newItemUnit.trim() || itemQuantity <= 0) {
        alert('Todos los campos son requeridos y la cantidad debe ser mayor a 0');
        return;
      }

      const newItem: BoxItemTemplate = {
        item_name: newItemName.trim(),
        category_id: newItemCategory,
        quantity: itemQuantity,
        unit: newItemUnit.trim(),
        notes: itemNotes,
      };

      setBoxForm((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
    }

    // Resetear formulario
    setShowAddItemForm(false);
    setItemQuantity(1);
    setItemNotes('');
    setNewItemName('');
    setNewItemUnit('');
  };

  // Eliminar item de la plantilla
  const handleRemoveItemFromTemplate = (index: number) => {
    setBoxForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="entry-form-overlay">
        <div className="entry-form-modal">
          <div className="entry-form-container">
            <div className="entry-form-header">
              <h3>Gestionar Plantillas de Cajas</h3>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="entry-form">
              <p>Cargando plantillas...</p>
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
            <h3>
              {mode === 'list' && '📦 Gestionar Plantillas de Cajas'}
              {mode === 'create' && '➕ Crear Nueva Plantilla'}
              {mode === 'edit' && '✏️ Editar Plantilla'}
            </h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="entry-form">
            {mode === 'list' && (
              <>
                <div className="items-header">
                  <h4>Plantillas Disponibles</h4>
                  <button className="add-item-btn" onClick={startCreateTemplate}>
                    + Nueva Plantilla
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div className="alert-warning">
                    No hay plantillas creadas. Haz clic en "Nueva Plantilla" para comenzar.
                  </div>
                ) : (
                  <div className="templates-grid">
                    {templates.map((template) => (
                      <div key={template.box_id} className="template-card">
                        <h5>{template.name}</h5>
                        {template.description && (
                          <p className="template-description">{template.description}</p>
                        )}
                        <div className="template-items-count">
                          {template.items.length} items
                        </div>
                        
                        {/* Mostrar los ítems de la plantilla */}
                        {template.items.length > 0 && (
                          <div className="template-items-list">
                            <h6>Ítems incluidos:</h6>
                            <ul className="items-list">
                              {template.items.map((item, index) => (
                                <li key={index} className="item-entry">
                                  <span className="item-name">{item.item_name}</span>
                                  <span className="item-quantity">
                                    {item.quantity} {item.unit}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="template-actions">
                          <button
                            className="btn-edit"
                            onClick={() => startEditTemplate(template)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() =>
                              handleDeleteTemplate(template.box_id!, template.name)
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {(mode === 'create' || mode === 'edit') && (
              <>
                <div className="form-section">
                  <h4>Información de la Plantilla</h4>
                  
                  <div className="form-group">
                    <label htmlFor="templateName">Nombre de la Plantilla *</label>
                    <input
                      id="templateName"
                      type="text"
                      value={boxForm.name}
                      onChange={(e) => setBoxForm({ ...boxForm, name: e.target.value })}
                      placeholder="Ej: Caja de Alimentos Básica"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="templateDescription">Descripción</label>
                    <textarea
                      id="templateDescription"
                      value={boxForm.description}
                      onChange={(e) => setBoxForm({ ...boxForm, description: e.target.value })}
                      placeholder="Descripción opcional de la plantilla"
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-section">
                  <div className="items-header">
                    <h4>Items de la Plantilla</h4>
                    <button
                      className="add-item-btn"
                      onClick={() => setShowAddItemForm(true)}
                      disabled={isSubmitting}
                    >
                      + Añadir Item
                    </button>
                  </div>

                  {boxForm.items.length === 0 ? (
                    <div className="empty-items">
                      No hay items agregados. Haz clic en "Añadir Item" para comenzar.
                    </div>
                  ) : (
                    <div className="items-list">
                      {boxForm.items.map((item, idx) => {
                        const categoryName = categories.find(
                          (cat) => cat.category_id === item.category_id
                        )?.name || 'Sin categoría';
                        
                        return (
                          <div key={idx} className="item-row">
                            <div className="item-info">
                              <span className="item-name">{item.item_name}</span>
                              <span className="item-category">{categoryName}</span>
                              <span className="item-quantity">
                                {item.quantity} {item.unit}
                              </span>
                              {!item.item_id && (
                                <span className="new-item-badge">Nuevo</span>
                              )}
                            </div>
                            <button
                              className="remove-item-btn"
                              onClick={() => handleRemoveItemFromTemplate(idx)}
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
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSaveTemplate}
                    disabled={isSubmitting || boxForm.items.length === 0}
                  >
                    {isSubmitting
                      ? 'Guardando...'
                      : mode === 'create'
                      ? 'Crear Plantilla'
                      : 'Guardar Cambios'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal para agregar item */}
      {showAddItemForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Agregar Item a la Plantilla</h4>

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

            {itemFormMode === 'existing' ? (
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

            <div className="form-group">
              <label>Notas</label>
              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Notas adicionales (opcional)"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowAddItemForm(false);
                  setItemQuantity(1);
                  setItemNotes('');
                  setNewItemName('');
                  setNewItemUnit('');
                }}
              >
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddItemToTemplate}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
