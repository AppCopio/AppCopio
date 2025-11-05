// src/components/inventory/ExitForm.tsx
import React, { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types/inventory';
import type { ExitMovementCreateDTO, ExitItemCreateDTO, StockValidation, BackendExitRequest, ResourceBox } from '@/types/movements';
import { createExitMovement, createBulkExitMovement, validateStock as validateStockAPI } from '@/services/movements.service';
import { familyService, type FamilyGroup } from '@/services/family.service';
import BoxTemplateManager from './BoxTemplateManager';
import './ExitForm.css';

interface ExitFormProps {
  centerId: string;
  currentInventory: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ExitItem {
  id: string; // ID temporal para el form
  item_id: number;
  item_name: string;
  category: string;
  available_stock: number;
  requested_quantity: number;
  unit: string;
  is_valid: boolean;
}

export default function ExitForm({ centerId, currentInventory, onClose, onSuccess }: ExitFormProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ExitItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockValidation, setStockValidation] = useState<StockValidation | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  
  // Estado para familias
  const [families, setFamilies] = useState<FamilyGroup[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);

  // Estados para agregar item
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [requestedQuantity, setRequestedQuantity] = useState(1);

  // Filtrar solo items con stock > 0
  const availableItems = currentInventory.filter(item => item.quantity > 0);

  // Cargar familias al inicializar
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const familyList = await familyService.list();
        const familiesWithHeadNames = await Promise.all(
          familyList.map(async (family) => {
            const headOfHouseholdName = await familyService.getPersonName(family.jefe_hogar_person_id);
            return {
              ...family,
              headOfHouseholdName,
            };
          })
        );
        setFamilies(familiesWithHeadNames);
        if (familiesWithHeadNames.length > 0) {
          setSelectedFamilyId(familiesWithHeadNames[0].family_id);
        }
      } catch (error) {
        console.error('Error loading families:', error);
      }
    };

    loadFamilies();
  }, []);

  // Validar stock cuando cambian los items
  useEffect(() => {
    if (items.length > 0) {
      validateStock();
    }
  }, [items]);

  const validateStock = async () => {
    try {
      const itemsToValidate = items.map(item => ({
        item_id: item.item_id,
        quantity: item.requested_quantity
      }));

      const validation = await validateStockAPI(centerId, itemsToValidate);
      setStockValidation(validation);

      // Actualizar estado de validación en items
      setItems(prevItems => prevItems.map(item => {
        const error = validation.errors?.find((err: any) => err.item_id === item.item_id);
        return {
          ...item,
          is_valid: !error
        };
      }));
    } catch (error) {
      console.error('Error validating stock:', error);
    }
  };

  const addItemToExit = () => {
    if (selectedItemId === 0 || requestedQuantity <= 0) {
      alert('Selecciona un item y cantidad válida');
      return;
    }

    const selectedItem = availableItems.find(item => item.item_id === selectedItemId);
    if (!selectedItem) {
      alert('Item no encontrado');
      return;
    }

    // Verificar si ya está agregado
    if (items.some(item => item.item_id === selectedItemId)) {
      alert('Este item ya está agregado a la salida');
      return;
    }

    const newExitItem: ExitItem = {
      id: `exit-${Date.now()}-${selectedItemId}`,
      item_id: selectedItemId,
      item_name: selectedItem.name,
      category: selectedItem.category,
      available_stock: selectedItem.quantity,
      requested_quantity: requestedQuantity,
      unit: selectedItem.unit || '',
      is_valid: requestedQuantity <= selectedItem.quantity
    };

    setItems([...items, newExitItem]);
    setShowAddItem(false);
    setSelectedItemId(0);
    setRequestedQuantity(1);
  };

  const removeItemFromExit = (itemId: string) => {
    console.log('Removing item with ID:', itemId);
    setItems(prevItems => {
      const filteredItems = prevItems.filter(item => item.id !== itemId);
      console.log('Items before filter:', prevItems.length, 'Items after filter:', filteredItems.length);
      return filteredItems;
    });
  };

  const handleTemplateSelect = (template: ResourceBox) => {
    // Convertir items de la plantilla al formato del formulario de salida
    const templateItems: ExitItem[] = template.items
      .map(templateItem => {
        // Validar que el item_name existe
        if (!templateItem.item_name) {
          return null; // Item inválido
        }

        // Buscar el item en el inventario actual
        const inventoryItem = currentInventory.find(invItem => 
          invItem.name.toLowerCase() === templateItem.item_name.toLowerCase() &&
          invItem.quantity > 0
        );

        if (!inventoryItem) {
          return null; // Item no disponible en inventario
        }

        return {
          id: crypto.randomUUID(),
          item_id: inventoryItem.item_id,
          item_name: inventoryItem.name,
          category: inventoryItem.category,
          available_stock: inventoryItem.quantity,
          requested_quantity: Math.min(templateItem.quantity, inventoryItem.quantity), // No exceder stock disponible
          unit: inventoryItem.unit,
          is_valid: templateItem.quantity <= inventoryItem.quantity
        };
      })
      .filter(item => item !== null) as ExitItem[];

    // Agregar items de la plantilla a la lista actual
    setItems(prev => [...prev, ...templateItems]);
    
    // Si no hay motivo, usar el nombre de la plantilla como sugerencia
    if (!reason.trim()) {
      setReason(`Salida desde plantilla: ${template.name}`);
    }
    
    setShowTemplateManager(false);

    // Mostrar alerta si algunos items no estaban disponibles
    const unavailableItems = template.items.length - templateItems.length;
    if (unavailableItems > 0) {
      alert(`Se agregaron ${templateItems.length} items. ${unavailableItems} items de la plantilla no están disponibles en el inventario.`);
    }
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          requested_quantity: newQuantity,
          is_valid: newQuantity <= item.available_stock
        };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert('El motivo es obligatorio');
      return;
    }

    if (!selectedFamilyId) {
      alert('Debes seleccionar una familia destinataria');
      return;
    }

    if (items.length === 0) {
      alert('Debes agregar al menos un item a la salida');
      return;
    }

    // Verificar validación de stock
    const hasInvalidItems = items.some(item => !item.is_valid);
    if (hasInvalidItems) {
      setShowValidationErrors(true);
      alert('Stock insuficiente. Revisa las cantidades.');
      return;
    }

    setIsSubmitting(true);

    // Obtener el nombre de la familia seleccionada
    const selectedFamily = families.find(family => family.family_id === selectedFamilyId);
    const familyName = selectedFamily?.headOfHouseholdName || `Familia #${selectedFamilyId}`;

    const exitData: ExitMovementCreateDTO = {
      reason: reason.trim(),
      recipient: familyName,
      notes: notes.trim() || undefined,
      items: items.map(item => ({
        item_id: item.item_id,
        quantity: item.requested_quantity
      }))
    };

    try {
      // El interceptor de Axios maneja automáticamente el estado offline
      // Si hay múltiples items, usar endpoint de salidas múltiples
      if (items.length > 1) {
        // Para múltiples items, crear una salida por cada item
        const exits: BackendExitRequest[] = items.map(item => ({
          itemId: item.item_id,
          quantity: item.requested_quantity,
          familyId: selectedFamilyId!,
          reason: reason.trim(),
          notes: `${familyName}${notes.trim() ? ` - ${notes.trim()}` : ''}`
        }));
        
        await createBulkExitMovement(centerId, { exits });
      } else {
        // Para un solo item, usar endpoint individual
        const singleExit: BackendExitRequest = {
          itemId: items[0].item_id,
          quantity: items[0].requested_quantity,
          familyId: selectedFamilyId!,
          reason: reason.trim(),
          notes: `${familyName}${notes.trim() ? ` - ${notes.trim()}` : ''}`
        };
        
        await createExitMovement(centerId, singleExit);
      }
      
      alert('Salida registrada exitosamente');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating exit movement:', error);
      
      if (error.response?.data?.type === 'INSUFFICIENT_STOCK') {
        alert(`Error de stock: ${error.response.data.error}`);
        setShowValidationErrors(true);
      } else {
        alert(error.response?.data?.error || error.message || 'Error al registrar la salida');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalItems = () => items.length;
  const getInvalidItems = () => items.filter(item => !item.is_valid).length;

  return (
    <div className="exit-form-overlay">
      <div className="exit-form-modal">
        <div className="exit-form-header">
          <h3>📤 Registrar Salida de Inventario</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="exit-form">
          {/* Información básica */}
          <div className="form-section">
            <h4>Información de la Salida</h4>
            
            <div className="form-group">
              <label htmlFor="reason">Motivo de la salida *</label>
              <input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Entrega a familia Rodriguez, Distribución semanal..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="family">Familia destinataria *</label>
              <select
                id="family"
                value={selectedFamilyId || ''}
                onChange={(e) => setSelectedFamilyId(e.target.value ? Number(e.target.value) : null)}
                required
              >
                <option value="">Selecciona una familia</option>
                {families.map(family => (
                  <option key={family.family_id} value={family.family_id}>
                    {family.headOfHouseholdName || `Familia #${family.family_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notas adicionales</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones, condiciones especiales..."
                rows={3}
              />
            </div>
          </div>

          {/* Lista de items */}
          <div className="form-section">
            <div className="items-header">
              <h4>Items a Entregar ({getTotalItems()})</h4>
              {getInvalidItems() > 0 && (
                <span className="validation-warning">
                  ⚠️ {getInvalidItems()} items con stock insuficiente
                </span>
              )}
              <div className="items-actions">
                <button 
                  type="button" 
                  className="template-btn"
                  onClick={() => setShowTemplateManager(true)}
                >
                  ⚙ Usar Plantilla
                </button>
                <button 
                  type="button" 
                  className="add-item-btn"
                  onClick={() => setShowAddItem(true)}
                  disabled={availableItems.length === 0}
                >
                  + Agregar Item
                </button>
              </div>
            </div>

            {availableItems.length === 0 && (
              <div className="no-items-message">
                <p>⚠️ No hay items con stock disponible para realizar salidas</p>
              </div>
            )}

            {items.length === 0 && availableItems.length > 0 && (
              <div className="empty-items">
                <p>No hay items agregados. Haz clic en "Agregar Item" para comenzar.</p>
              </div>
            )}

            {items.length > 0 && (
              <div className="items-list">
                {items.map((item) => (
                  <div key={item.id} className={`item-row ${!item.is_valid ? 'invalid' : ''}`}>
                    <div className="item-info">
                      <div className="item-name">{item.item_name}</div>
                      <div className="item-category">{item.category}</div>
                      <div className="item-stock">
                        Stock disponible: {item.available_stock} {item.unit}
                      </div>
                      {!item.is_valid && (
                        <div className="validation-error">
                          ❌ Stock insuficiente
                        </div>
                      )}
                    </div>
                    
                    <div className="item-quantity">
                      <label>Cantidad a entregar:</label>
                      <div className="quantity-input-container">
                        <input
                          type="number"
                          min="1"
                          max={item.available_stock}
                          value={item.requested_quantity}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                        />
                        <span className="unit">{item.unit}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeItemFromExit(item.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario para agregar item */}
          {showAddItem && (
            <div className="add-item-section">
              <h4>Agregar Item a la Salida</h4>
              
              <div className="form-group">
                <label htmlFor="item-select">Seleccionar Item:</label>
                <select
                  id="item-select"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(parseInt(e.target.value))}
                >
                  <option value={0}>-- Selecciona un item --</option>
                  {availableItems
                    .filter(item => !items.some(exitItem => exitItem.item_id === item.item_id))
                    .map(item => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.name} - Stock: {item.quantity} {item.unit} ({item.category})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Cantidad a entregar:</label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="add-item-actions">
                <button type="button" onClick={addItemToExit} className="confirm-btn">
                  Agregar Item
                </button>
                <button type="button" onClick={() => setShowAddItem(false)} className="cancel-btn">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting || items.length === 0}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Salida'}
            </button>
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancelar
            </button>
          </div>
        </form>

        {/* Modal para seleccionar plantilla de salida */}
        {showTemplateManager && (
          <BoxTemplateManager
            centerId={centerId}
            onClose={() => setShowTemplateManager(false)}
            onTemplateSelect={handleTemplateSelect}
            mode="select"
            selectMode="exit"
          />
        )}
      </div>
    </div>
  );
}