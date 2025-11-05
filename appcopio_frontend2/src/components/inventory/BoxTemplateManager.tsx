// src/components/inventory/BoxTemplateManager.tsx
import React, { useState, useEffect } from 'react';
import type { Category, InventoryItem } from '@/types/inventory';
import type { ResourceBox, BoxItemTemplate } from '@/types/movements';
import { listCategories } from '@/services/categories.service';
import { getResourceBoxes, createResourceBox } from '@/services/movements.service';
import './BoxTemplateManager.css';

interface BoxTemplateManagerProps {
  centerId: string;
  onClose: () => void;
  onTemplateSelect?: (template: ResourceBox, type: 'entry' | 'exit') => void;
  mode?: 'manage' | 'select';
  selectMode?: 'entry' | 'exit';
  currentInventory?: InventoryItem[]; // Para seleccionar items existentes en plantillas de salida
}

interface BoxForm {
  name: string;
  description: string;
  items: BoxItemTemplate[];
  type: 'entry' | 'exit';
}

export default function BoxTemplateManager({ 
  centerId, 
  onClose, 
  onTemplateSelect, 
  mode = 'manage',
  selectMode = 'entry',
  currentInventory = []
}: BoxTemplateManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [resourceBoxes, setResourceBoxes] = useState<ResourceBox[]>([]);
  const [activeTab, setActiveTab] = useState<'entry' | 'exit'>(mode === 'select' ? selectMode : 'entry');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showViewTemplate, setShowViewTemplate] = useState(false);
  const [selectedTemplateToView, setSelectedTemplateToView] = useState<ResourceBox | null>(null);

  // Estado para crear nueva plantilla
  const [boxForm, setBoxForm] = useState<BoxForm>({
    name: '',
    description: '',
    items: [],
    type: 'entry'
  });

  // Estado para agregar item a la plantilla
  const [showAddItemToBox, setShowAddItemToBox] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<number>(0);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  
  // Estados para seleccionar entre nuevo item vs item existente
  const [isCreatingNewItem, setIsCreatingNewItem] = useState(true);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<number | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cats = await listCategories();
      console.log('Categorías cargadas en BoxTemplateManager:', cats); // Debug
      setCategories(cats);
      
      const boxes = await getResourceBoxes();
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
    let itemToAdd: BoxItemTemplate;

    if (boxForm.type === 'entry' || isCreatingNewItem) {
      // Validación para items nuevos (siempre para entrada, o cuando se selecciona para salida)
      if (!newItemName.trim() || newItemQuantity <= 0 || !newItemUnit.trim() || !newItemCategory) {
        alert('Complete todos los campos requeridos');
        return;
      }

      itemToAdd = {
        item_name: newItemName.trim(),
        category_id: newItemCategory,
        quantity: newItemQuantity,
        unit: newItemUnit.trim(),
        notes: newItemNotes.trim() || undefined
      };
    } else {
      // Validación para items existentes del inventario (solo para plantillas de salida)
      if (!selectedInventoryItemId || newItemQuantity <= 0) {
        alert('Seleccione un item del inventario y especifique la cantidad');
        return;
      }

      const inventoryItem = currentInventory.find(item => item.item_id === selectedInventoryItemId);
      if (!inventoryItem) {
        alert('Item del inventario no encontrado');
        return;
      }

      const category = categories.find(cat => cat.name === inventoryItem.category);
      
      itemToAdd = {
        item_id: inventoryItem.item_id,
        item_name: inventoryItem.name,
        category_id: category?.category_id || newItemCategory,
        quantity: newItemQuantity,
        unit: inventoryItem.unit || 'unidad',
        notes: newItemNotes.trim() || undefined
      };
    }

    setBoxForm(prev => ({
      ...prev,
      items: [...prev.items, itemToAdd]
    }));

    // Limpiar formulario
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnit('');
    setNewItemNotes('');
    setSelectedInventoryItemId(undefined);
    setIsCreatingNewItem(true);
    setShowAddItemToBox(false);
  };

  const removeItemFromBox = (index: number) => {
    setBoxForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const createTemplate = async () => {
    if (!boxForm.name.trim() || boxForm.items.length === 0) {
      alert('Complete el nombre y agregue al menos un item');
      return;
    }

    try {
      const templateData = {
        name: boxForm.name.trim(),
        description: boxForm.description.trim() || undefined,
        type: boxForm.type,
        items: boxForm.items
      };

      await createResourceBox(templateData);
      alert(`Plantilla de ${boxForm.type === 'entry' ? 'entrada' : 'salida'} creada exitosamente`);
      
      // Limpiar formulario
      setBoxForm({
        name: '',
        description: '',
        items: [],
        type: 'entry'
      });
      setShowCreateForm(false);
      
      // Recargar plantillas
      await loadData();
    } catch (error: any) {
      console.error('Error creating template:', error);
      alert('Error al crear la plantilla: ' + (error?.message || 'Error desconocido'));
    }
  };

  const entryTemplates = resourceBoxes.filter(box => 
    box.type === 'entry'
  );
  
  const exitTemplates = resourceBoxes.filter(box => 
    box.type === 'exit'
  );

  const getTemplatesByTab = () => {
    if (mode === 'manage') {
      // En modo manage, mostrar todas las plantillas (unificado)
      return resourceBoxes;
    } else {
      // En modo select, filtrar por tipo según selectMode
      return selectMode === 'entry' ? entryTemplates : exitTemplates;
    }
  };

  const handleTemplateSelect = (template: ResourceBox) => {
    if (onTemplateSelect) {
      onTemplateSelect(template, activeTab);
    }
  };

  const handleViewTemplate = (template: ResourceBox) => {
    setSelectedTemplateToView(template);
    setShowViewTemplate(true);
  };

  const handleDeleteTemplate = async (template: ResourceBox) => {
    if (!confirm(`¿Está seguro de que desea eliminar la plantilla "${template.name}"?`)) {
      return;
    }

    try {
      // Obtener plantillas actuales
      const currentBoxes = JSON.parse(localStorage.getItem('resourceBoxes') || '[]');
      
      // Filtrar para eliminar la plantilla seleccionada
      const updatedBoxes = currentBoxes.filter((box: ResourceBox) => box.box_id !== template.box_id);
      
      // Guardar en localStorage
      localStorage.setItem('resourceBoxes', JSON.stringify(updatedBoxes));
      
      // Recargar datos
      await loadData();
      
      alert(`Plantilla "${template.name}" eliminada exitosamente`);
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al eliminar la plantilla');
    }
  };

  if (isLoading) {
    return (
      <div className="box-template-container">
        <div className="loading">Cargando plantillas...</div>
      </div>
    );
  }

  return (
    <div className="box-template-overlay">
      <div className="box-template-modal">
        <div className="box-template-header">
          <h3>⚙ {mode === 'manage' ? 'Gestión de' : 'Seleccionar'} Plantillas de Cajas</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {mode === 'manage' && (
          <div className="manage-mode-header">
            <h3>Gestión de Plantillas</h3>
            <p>Visualice, edite y elimine todas sus plantillas de entrada y salida</p>
          </div>
        )}

        <div className="box-template-content">
          {mode === 'select' && (
            <div className="select-mode-header">
              <h4>Seleccionar Plantilla de {selectMode === 'entry' ? 'Entrada' : 'Salida'}</h4>
              <p>Elija una plantilla para usar en el registro de {selectMode === 'entry' ? 'entrada' : 'salida'}:</p>
            </div>
          )}
          
          {mode === 'manage' && (
            <div className="action-buttons">
              <button 
                className="btn-primary" 
                onClick={() => {
                  setBoxForm(prev => ({ ...prev, type: 'entry' }));
                  setShowCreateForm(true);
                }}
              >
                ↙ Crear Plantilla de Entrada
              </button>
              <button 
                className="btn-primary" 
                onClick={() => {
                  setBoxForm(prev => ({ ...prev, type: 'exit' }));
                  setShowCreateForm(true);
                }}
              >
                ↗ Crear Plantilla de Salida
              </button>
            </div>
          )}

          <div className="templates-grid">
            {getTemplatesByTab().length === 0 ? (
              <div className="empty-templates">
                {mode === 'manage' 
                  ? 'No hay plantillas creadas. Cree plantillas de entrada o salida para comenzar.'
                  : `No hay plantillas de ${selectMode === 'entry' ? 'entrada' : 'salida'} creadas.`
                }
              </div>
            ) : (
              getTemplatesByTab().map(template => (
                <div key={template.box_id} className="template-card">
                  <div className={`template-type-badge ${template.type || 'entry'}`}>
                    {(template.type === 'exit') ? '↗ SALIDA' : '↙ ENTRADA'}
                  </div>
                  <h4>{template.name}</h4>
                  {template.description && <p className="template-description">{template.description}</p>}
                  <div className="template-items-count">{template.items.length} items</div>
                  <div className="template-items-preview">
                    {template.items.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="item-preview">
                        {item.quantity} {item.unit} {item.item_name}
                      </span>
                    ))}
                    {template.items.length > 3 && (
                      <span className="more-items">+{template.items.length - 3} más</span>
                    )}
                  </div>
                  {mode === 'manage' ? (
                    <div className="template-actions">
                      <button 
                        className="view-template-btn"
                        onClick={() => handleViewTemplate(template)}
                      >
                        Ver Plantilla
                      </button>
                      <button 
                        className="delete-template-btn"
                        onClick={() => handleDeleteTemplate(template)}
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="use-template-btn"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      Usar Esta Plantilla
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal para crear nueva plantilla */}
        {showCreateForm && (
          <div className="modal-overlay">
            <div className="modal-content large-modal">
              <h4>Crear Nueva Plantilla de {boxForm.type === 'entry' ? 'Entrada' : 'Salida'}</h4>
              
              <div className="form-group">
                <label>Nombre de la plantilla *</label>
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
                  placeholder="Descripción opcional de la plantilla"
                  rows={3}
                />
              </div>

              <div className="box-items-section">
                <div className="items-header">
                  <h5>Items de la plantilla ({boxForm.items.length})</h5>
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
                        <div key={index} className="box-item">
                          <div className="item-info">
                            <span className="item-name">{item.item_name}</span>
                            <span className="item-category">{categoryName}</span>
                            <span className="item-quantity">{item.quantity} {item.unit}</span>
                            {item.notes && <span className="item-notes">{item.notes}</span>}
                          </div>
                          <button
                            type="button"
                            className="remove-item-btn"
                            onClick={() => removeItemFromBox(index)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-items">
                    No hay items agregados. Agregue al menos un item para crear la plantilla.
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setBoxForm({
                      name: '',
                      description: '',
                      items: [],
                      type: 'entry'
                    });
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={createTemplate}
                  disabled={!boxForm.name.trim() || boxForm.items.length === 0}
                >
                  Crear Plantilla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para agregar item a la plantilla */}
        {showAddItemToBox && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h4>Agregar Item a la Plantilla de {boxForm.type === 'entry' ? 'Entrada' : 'Salida'}</h4>
              
              {/* Selector entre item nuevo o existente */}
              {boxForm.type === 'exit' && currentInventory.length > 0 && (
                <div className="form-group">
                  <label>Tipo de item</label>
                  <div className="radio-group">
                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <input
                        type="radio"
                        checked={isCreatingNewItem}
                        onChange={() => setIsCreatingNewItem(true)}
                        style={{ marginRight: '12px' }}
                      />
                      Crear nuevo item
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <input
                        type="radio"
                        checked={!isCreatingNewItem}
                        onChange={() => setIsCreatingNewItem(false)}
                        style={{ marginRight: '12px' }}
                      />
                      Seleccionar del inventario actual
                    </label>
                  </div>
                </div>
              )}

              {/* Información para plantillas de entrada */}
              {boxForm.type === 'entry' && (
                <div className="entry-info-message" style={{
                  background: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '4px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#1565c0'
                }}>
                  <p style={{ margin: 0, color: '#1565c0' }}>
                    <strong>Plantilla de Entrada:</strong> Los items deben ser nuevos productos que ingresarán al inventario.
                  </p>
                </div>
              )}

              {/* Mostrar formulario según la selección */}
              {(boxForm.type === 'entry' || isCreatingNewItem) ? (
                <>
                  <div className="form-group">
                    <label>Nombre del item *</label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Ej: Arroz, Frazadas, etc."
                    />
                  </div>

                  <div className="form-group">
                    <label>Categoría *</label>
                    <select
                      value={newItemCategory || ''}
                      onChange={(e) => setNewItemCategory(parseInt(e.target.value) || 0)}
                    >
                      <option value="">Seleccione una categoría...</option>
                      {categories.map(category => {
                        console.log('Categoría disponible:', category); // Debug
                        return (
                          <option key={category.category_id} value={category.category_id}>
                            {category.name}
                          </option>
                        );
                      })}
                    </select>
                    {categories.length === 0 && <p style={{color: 'red', fontSize: '12px'}}>No hay categorías cargadas</p>}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Cantidad *</label>
                      <input
                        type="number"
                        min="1"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Unidad *</label>
                      <input
                        type="text"
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        placeholder="kg, unidades, litros, etc."
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Seleccionar item del inventario *</label>
                    <select
                      value={selectedInventoryItemId || ''}
                      onChange={(e) => setSelectedInventoryItemId(e.target.value ? parseInt(e.target.value) : undefined)}
                    >
                      <option value="">-- Seleccionar item --</option>
                      {currentInventory.filter(item => item.quantity > 0).map(item => (
                        <option key={item.item_id} value={item.item_id}>
                          {item.name} - {item.quantity} {item.unit} ({item.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Cantidad *</label>
                    <input
                      type="number"
                      min="1"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Notas</label>
                <textarea
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder="Información adicional opcional"
                  rows={2}
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
                    setSelectedInventoryItemId(undefined);
                    setIsCreatingNewItem(true);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={addItemToBox}
                  disabled={
                    boxForm.type === 'entry'
                      ? (!newItemName.trim() || newItemQuantity <= 0 || !newItemUnit.trim() || !newItemCategory)
                      : isCreatingNewItem 
                        ? (!newItemName.trim() || newItemQuantity <= 0 || !newItemUnit.trim() || !newItemCategory)
                        : (!selectedInventoryItemId || newItemQuantity <= 0)
                  }
                >
                  Agregar Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para ver plantilla */}
        {showViewTemplate && selectedTemplateToView && (
          <div className="modal-overlay">
            <div className="modal-content large-modal">
              <h4>Ver Plantilla: {selectedTemplateToView.name}</h4>
              
              <div className="template-info">
                <div className="template-type">
                  <span className={`template-type-badge ${selectedTemplateToView.type || 'entry'}`}>
                    {(selectedTemplateToView.type === 'exit') ? '↗ SALIDA' : '↙ ENTRADA'}
                  </span>
                </div>
                
                {selectedTemplateToView.description && (
                  <div className="form-group">
                    <label>Descripción:</label>
                    <p>{selectedTemplateToView.description}</p>
                  </div>
                )}

                <div className="form-group">
                  <label>Items de la plantilla ({selectedTemplateToView.items.length}):</label>
                  <div className="view-template-items">
                    {selectedTemplateToView.items.map((item, index) => {
                      const categoryName = categories.find(cat => cat.category_id === item.category_id)?.name || 'Sin categoría';
                      return (
                        <div key={index} className="view-template-item">
                          <div className="item-info">
                            <span className="item-name">{item.item_name}</span>
                            <span className="item-category">{categoryName}</span>
                            <span className="item-quantity">{item.quantity} {item.unit}</span>
                            {item.notes && <span className="item-notes">{item.notes}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowViewTemplate(false);
                    setSelectedTemplateToView(null);
                  }}
                >
                  Cerrar
                </button>
                {mode === 'manage' && onTemplateSelect && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      handleTemplateSelect(selectedTemplateToView);
                      setShowViewTemplate(false);
                      setSelectedTemplateToView(null);
                    }}
                  >
                    Usar Esta Plantilla
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}