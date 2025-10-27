// src/components/inventory/ExitForm.tsx
import React, { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types/inventory';
import type { ExitMovementCreateDTO, ExitItemCreateDTO, StockValidation, BackendExitRequest } from '@/types/movements';
import { createExitMovement, createBulkExitMovement, validateStock as validateStockAPI, savePendingOperation } from '@/services/movements.service';
import { familyService, type FamilyGroup } from '@/services/family.service';
import './ExitForm.css';

interface ExitFormProps {
  centerId: string;
  currentInventory: InventoryItem[];
  isOffline?: boolean;
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

export default function ExitForm({ centerId, currentInventory, isOffline = false, onClose, onSuccess }: ExitFormProps) {
  const [reason, setReason] = useState('');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ExitItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockValidation, setStockValidation] = useState<StockValidation | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
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
        setFamilies(familyList);
        if (familyList.length > 0) {
          setSelectedFamilyId(familyList[0].family_id);
        }
      } catch (error) {
        console.error('Error loading families:', error);
      }
    };
    
    if (!isOffline) {
      loadFamilies();
    }
  }, [isOffline]);

  // Validar stock cuando cambian los items
  useEffect(() => {
    if (items.length > 0 && !isOffline) {
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
      const updatedItems = items.map(item => {
        const error = validation.errors?.find((err: any) => err.item_id === item.item_id);
        return {
          ...item,
          is_valid: !error
        };
      });
      setItems(updatedItems);
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
    setItems(items.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    setItems(items.map(item => {
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

    if (!reason.trim() || !recipient.trim()) {
      alert('El motivo y destinatario son obligatorios');
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
    if (hasInvalidItems && !isOffline) {
      setShowValidationErrors(true);
      alert('Hay items con stock insuficiente. Revisa las cantidades.');
      return;
    }

    setIsSubmitting(true);

    const exitData: ExitMovementCreateDTO = {
      reason: reason.trim(),
      recipient: recipient.trim(),
      notes: notes.trim() || undefined,
      items: items.map(item => ({
        item_id: item.item_id,
        quantity: item.requested_quantity
      }))
    };

    try {
      if (isOffline) {
        // Guardar operación pendiente para sincronizar después
        savePendingOperation({
          center_id: centerId,
          type: 'EXIT',
          data: exitData
        });
        alert('Salida guardada offline. Se sincronizará cuando recuperes conexión.');
      } else {
        // Si hay múltiples items, usar endpoint de salidas múltiples
        if (items.length > 1) {
          // Para múltiples items, crear una salida por cada item
          const exits: BackendExitRequest[] = items.map(item => ({
            itemId: item.item_id,
            quantity: item.requested_quantity,
            familyId: selectedFamilyId!,
            reason: reason.trim(),
            notes: `${recipient.trim()}${notes.trim() ? ` - ${notes.trim()}` : ''}`
          }));
          
          await createBulkExitMovement(centerId, { exits });
        } else {
          // Para un solo item, usar endpoint individual
          const singleExit: BackendExitRequest = {
            itemId: items[0].item_id,
            quantity: items[0].requested_quantity,
            familyId: selectedFamilyId!,
            reason: reason.trim(),
            notes: `${recipient.trim()}${notes.trim() ? ` - ${notes.trim()}` : ''}`
          };
          
          await createExitMovement(centerId, singleExit);
        }
        
        alert('Salida registrada exitosamente');
      }
      
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
                    {familyService.getDisplayName(family)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="recipient">Destinatario *</label>
              <input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Ej: Familia Rodriguez, Grupo de 5 personas, María González..."
                required
              />
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
              {!isOffline && getInvalidItems() > 0 && (
                <span className="validation-warning">
                  ⚠️ {getInvalidItems()} items con stock insuficiente
                </span>
              )}
              <button 
                type="button" 
                className="add-item-btn"
                onClick={() => setShowAddItem(true)}
                disabled={availableItems.length === 0}
              >
                + Agregar Item
              </button>
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
                    </div>
                    
                    <div className="item-quantity">
                      <label>Cantidad a entregar:</label>
                      <input
                        type="number"
                        min="1"
                        max={item.available_stock}
                        value={item.requested_quantity}
                        onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                      />
                      <span className="unit">{item.unit}</span>
                    </div>

                    {!item.is_valid && (
                      <div className="validation-error">
                        ❌ Stock insuficiente
                      </div>
                    )}

                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => removeItemFromExit(item.id)}
                    >
                      Eliminar
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

          {/* Estado offline */}
          {isOffline && (
            <div className="offline-notice">
              <p>📡 Modo offline: La salida se guardará localmente y se sincronizará cuando recuperes conexión.</p>
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
      </div>
    </div>
  );
}