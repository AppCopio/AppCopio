// src/components/layout/AdminLayout/AdminLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../navbar/Navbar';

const AdminLayout: React.FC = () => {
  return (
    <div className="admin-layout">
      {/* Le decimos a la Navbar que estamos en modo Admin */}
      <Navbar isAdmin={true} /> 
      <div className="admin-content">
        <main className="admin-main-area">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;