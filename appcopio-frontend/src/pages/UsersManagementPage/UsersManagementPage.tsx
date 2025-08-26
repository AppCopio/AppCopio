// src/pages/UsersManagementPage/UsersManagementPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { User } from "../../types/user";
import { listUsers, updateUser, deleteUser } from "../../services/usersApi";
import { AssignCentersModal } from "./AssignCentersModal";
import './UsersManagementPage.css'; // Importamos el CSS

// Asumimos que tienes un componente Modal genérico, si no, puedes usar este.
const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="close-button">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
);

export default function UsersManagementPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Simplificamos la carga para obtener todos los usuarios por ahora
      const { users } = await listUsers({});
      setRows(users as User[]);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleSupport(user: User) {
    if (!confirm(`¿Cambiar permiso de Apoyo de Administrador para ${user.nombre}?`)) return;
    try {
      await updateUser(user.user_id, { es_apoyo_admin: !user.es_apoyo_admin });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error al actualizar permiso");
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`¿Eliminar usuario ${u.nombre}?`)) return;
    try {
      await deleteUser(u.user_id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error al eliminar");
    }
  }

  return (
    <div className="users-management-page">
      <h1>Gestión de Usuarios</h1>
      {/* Podríamos añadir filtros y un botón de crear usuario aquí si es necesario */}
      
      {loading && <p>Cargando usuarios...</p>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Username</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Apoyo Admin</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.user_id}>
                <td>{user.user_id}</td>
                <td>{user.nombre}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role_name}</td>
                <td>
                  {user.role_name === 'Trabajador Municipal' ? (
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={user.es_apoyo_admin}
                        onChange={() => handleToggleSupport(user)}
                      />
                      <span className="slider round"></span>
                    </label>
                  ) : 'N/A'}
                </td>
                <td className="actions-cell">
                  {user.role_name === 'Trabajador Municipal' && (
                    <button onClick={() => setAssigningUser(user)}>Asignar Centros</button>
                  )}
                  <button onClick={() => alert('Funcionalidad de editar pendiente.')}>Editar</button>
                  <button onClick={() => handleDelete(user)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assigningUser && (
        <Modal onClose={() => setAssigningUser(null)} title={`Asignar Centros a ${assigningUser.nombre}`}>
          <AssignCentersModal 
            user={assigningUser}
            onClose={() => setAssigningUser(null)}
            onSave={async () => {
              setAssigningUser(null);
              await load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}