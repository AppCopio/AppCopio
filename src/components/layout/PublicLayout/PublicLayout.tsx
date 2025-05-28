import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../navbar/Navbar';

const PublicLayout: React.FC = () => {
  return (
    <>
      <Navbar isAdmin={false} /> {/* O simplemente <Navbar /> */}
      <Outlet />
    </>
  );
};
export default PublicLayout;