// src/pages/UsersManagementPage/AssignCentersModal.tsx
import React, { useState, useEffect } from 'react';
import type { User } from '../../types/user';
import { fetchWithAbort } from '../../services/api';
import { assignCenterToUser, removeCenterFromUser, getUser } from '../../services/usersApi';

interface Center {
  center_id: string;
  name: string;
}

interface Props {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

export const AssignCentersModal: React.FC<Props> = ({ user, onClose, onSave }) => {
  const [allCenters, setAllCenters] = useState<Center[]>([]);
  const [selectedCenters, setSelectedCenters] = useState<Set<string>>(new Set());
  const [initialAssignments, setInitialAssignments] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false; 

    const loadData = async () => {
      try {
        const [userData, centersData] = await Promise.all([
          getUser(user.user_id, controller.signal),
          fetchWithAbort<Center[]>(`${apiUrl}/centers`, controller.signal),
        ]);

        if (ignore) return;

        const userAssignedCenters = new Set<string>(
          ((userData.assignedCenters || []) as (string | number)[]).map(String)
        );

        setSelectedCenters(userAssignedCenters);
        setInitialAssignments(userAssignedCenters);
        setAllCenters((centersData || []).map(c => ({
          ...c, center_id: String(c.center_id)
        })));
      } catch (err: any) {
        // Si la petición fue abortada, no lo tratamos como error
        if (controller.signal.aborted || err?.name === 'AbortError') {
          return;
        }
        setError("No se pudieron cargar los datos para la asignación.");
        console.error(err);
      } finally {
        if (!controller.signal.aborted && !ignore) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [user.user_id, apiUrl]);


  const handleCheckboxChange = (centerId: string) => {
    setSelectedCenters(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(centerId)) {
        newSelection.delete(centerId);
      } else {
        newSelection.add(centerId);
      }
      return newSelection;
    });
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    const toAdd = [...selectedCenters].filter(id => !initialAssignments.has(id));
    const toRemove = [...initialAssignments].filter(id => !selectedCenters.has(id));

    try {
      await Promise.all([
        ...toAdd.map(center_id => assignCenterToUser(user.user_id, center_id, user.role_name ?? "")),
        ...toRemove.map(center_id => removeCenterFromUser(user.user_id, center_id))
      ]);
      onSave();
    } catch (error) {
      alert('Error al guardar las asignaciones.');
      console.error(error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  if (isLoading) return <div>Cargando datos de asignación...</div>;
  if (error) return <div style={{ color: 'crimson' }}>{error}</div>;

  return (
    <div>
      <h4>Asignar Centros para {user.nombre}</h4>
      <div className="centers-list">
        {allCenters.map(center => (
          <div key={center.center_id} className="center-item">
            <label>
              <input
                type="checkbox"
                checked={selectedCenters.has(center.center_id)}
                onChange={() => handleCheckboxChange(center.center_id)}
              />
              {center.name} ({center.center_id})
            </label>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={handleSaveChanges}>Guardar Cambios</button>
      </div>
    </div>
  );
};