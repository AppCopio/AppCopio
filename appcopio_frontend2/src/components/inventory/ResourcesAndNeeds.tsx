import React from 'react';
import { InventoryItem } from '@/types/inventory';
import { calculateNeeds, getPriorityColor, ItemRatio } from '@/config/inventoryRatios';
import './ResourcesAndNeeds.css';

interface ResourcesAndNeedsProps {
  inventory: { [category: string]: InventoryItem[] };
  centerCapacity: number;
  isOffline?: boolean;
  lastSyncTime?: string;
}

interface CategorySummary {
  category: string;
  currentItems: InventoryItem[];
  neededItems: ItemRatio[];
  totalCurrentQuantity: number;
  totalNeededQuantity: number;
  coveragePercentage: number;
}

const ResourcesAndNeeds: React.FC<ResourcesAndNeedsProps> = ({
  inventory,
  centerCapacity,
  isOffline = false,
  lastSyncTime
}) => {
  // Calcular resumen por categoría
  const categorySummaries: CategorySummary[] = React.useMemo(() => {
    return Object.keys(inventory).map(category => {
      const currentItems = inventory[category] || [];
      const neededItems = calculateNeeds(centerCapacity, category, 7); // 7 días
      
      const totalCurrentQuantity = currentItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalNeededQuantity = neededItems.reduce((sum, item) => sum + item.quantityPerPerson, 0);
      
      const coveragePercentage = totalNeededQuantity > 0 
        ? Math.min((totalCurrentQuantity / totalNeededQuantity) * 100, 100)
        : 100;

      return {
        category,
        currentItems,
        neededItems,
        totalCurrentQuantity,
        totalNeededQuantity,
        coveragePercentage
      };
    });
  }, [inventory, centerCapacity]);

  const getCoverageStatus = (percentage: number): { text: string; color: string } => {
    if (percentage >= 80) return { text: 'Bien abastecido', color: '#4caf50' };
    if (percentage >= 50) return { text: 'Abastecimiento moderado', color: '#ff9800' };
    if (percentage >= 20) return { text: 'Abastecimiento bajo', color: '#f44336' };
    return { text: 'Crítico', color: '#d32f2f' };
  };

  return (
    <div className="resources-and-needs">
      <div className="resources-header">
        <h2>Recursos Disponibles y Necesidades</h2>
        {isOffline && (
          <div className="offline-indicator">
            <span className="offline-icon">📶</span>
            Sin conexión - Última sincronización: {lastSyncTime || 'Desconocida'}
          </div>
        )}
        <div className="capacity-info">
          <span>Capacidad del centro: <strong>{centerCapacity} personas</strong></span>
        </div>
      </div>

      <div className="categories-grid">
        {categorySummaries.map(summary => {
          const status = getCoverageStatus(summary.coveragePercentage);
          
          return (
            <div key={summary.category} className="category-card">
              <div className="category-header">
                <h3>{summary.category}</h3>
                <div 
                  className="coverage-badge"
                  style={{ backgroundColor: status.color }}
                >
                  {Math.round(summary.coveragePercentage)}%
                </div>
              </div>
              
              <div className="category-status">
                <span style={{ color: status.color }}>
                  {status.text}
                </span>
              </div>

              <div className="quantity-summary">
                <div className="quantity-item">
                  <span className="label">Disponible:</span>
                  <span className="value current">{summary.totalCurrentQuantity} unidades</span>
                </div>
                <div className="quantity-item">
                  <span className="label">Necesario (7 días):</span>
                  <span className="value needed">{summary.totalNeededQuantity} unidades</span>
                </div>
              </div>

              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${Math.min(summary.coveragePercentage, 100)}%`,
                    backgroundColor: status.color
                  }}
                />
              </div>

              <div className="items-breakdown">
                <h4>Desglose por insumo:</h4>
                <div className="items-list">
                  {summary.neededItems.map(neededItem => {
                    const currentItem = summary.currentItems.find(
                      item => item.name.toLowerCase().includes(neededItem.name.toLowerCase())
                    );
                    const currentQuantity = currentItem?.quantity || 0;
                    const neededQuantity = neededItem.quantityPerPerson;
                    const itemCoverage = neededQuantity > 0 ? (currentQuantity / neededQuantity) * 100 : 100;
                    
                    return (
                      <div key={neededItem.name} className="item-row">
                        <div className="item-info">
                          <span className="item-name">{neededItem.name}</span>
                          <div 
                            className="priority-indicator"
                            style={{ backgroundColor: getPriorityColor(neededItem.priority) }}
                            title={`Prioridad: ${neededItem.priority}`}
                          />
                        </div>
                        <div className="item-quantities">
                          <span className="current">{currentQuantity}</span>
                          <span className="separator">/</span>
                          <span className="needed">{neededQuantity}</span>
                          <span className="unit">{neededItem.unit}</span>
                        </div>
                        <div className="item-coverage">
                          <span 
                            className={`coverage-text ${itemCoverage >= 100 ? 'sufficient' : 'insufficient'}`}
                          >
                            {Math.round(itemCoverage)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {categorySummaries.length === 0 && (
        <div className="empty-state">
          <p>No hay información de inventario disponible para calcular necesidades.</p>
          <p>Agregue algunos insumos al inventario para ver el análisis de necesidades.</p>
        </div>
      )}
    </div>
  );
};

export default ResourcesAndNeeds;