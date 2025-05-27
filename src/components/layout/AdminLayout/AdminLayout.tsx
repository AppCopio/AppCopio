// src/components/layout/AdminLayout/AdminLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../navbar/Navbar'; // Usamos nuestra Navbar existente (¡con 'n' minúscula!)

const AdminLayout: React.FC = () => {
  // Aquí podríamos añadir lógica para pasar props a Navbar
  // o para renderizar una Sidebar si quisiéramos.

  return (
    <div className="admin-layout">
      {/* TODO: Considerar pasar una prop como <Navbar userRole="admin" /> 
        para que muestre opciones adicionales. Por ahora, usa la normal.
      */}
      <Navbar /> 

      <div className="admin-content">
        {/* <Sidebar />  <-- Aquí podría ir una barra lateral si la necesitáramos. 
        */}
        <main className="admin-main-area">
          {/* Outlet es el 'hueco' donde React Router 
              pondrá la página hija (Dashboard, Centers, etc.) */}
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;