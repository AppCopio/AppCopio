// src/pages/AdminDashboard/AdminDashboard.tsx
import React from 'react';

const AdminDashboard: React.FC = () => {
  return (
    <div>
      <h2>Dashboard DIDECO - Vista Principal</h2>
      <p>
        Bienvenido al panel de control de AppCopio. Desde aquí podrás supervisar
        y gestionar los centros de acopio y albergues de la comuna. [cite: 50]
      </p>
      {/* Aquí irían estadísticas, alertas, accesos directos, etc. */}
      <ul>
        <li>Ver estado de Centros</li>
        <li>Gestionar Recursos</li>
        <li>Revisar Incidencias</li>
      </ul>
    </div>
  );
};

export default AdminDashboard;