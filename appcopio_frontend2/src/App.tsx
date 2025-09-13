// App.tsx (FIX: hijos relativos bajo "admin" y "center/:centerId")
import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import { paths } from "@/routes/paths";

import LoginPage from "@/pages/Auth/LoginPage";
import UsersManagementPage from "@/pages/UsersManagementPage";

// Placeholders (mantén los tuyos)
const Home = () => <div>Home</div>;
const Map = () => <div>Mapa</div>;
const MyCenters = () => <div>Mis Centros</div>;
const Profile = () => <div>Mi Perfil</div>;
const Centers = () => <div>Centers</div>;
const Updates = () => <div>Updates</div>;
const CenterLayout = () => <div style={{ padding: 16 }}>Center Layout</div>;
const CenterInventoryPage = () => <div>Inventory</div>;
const CenterDetailsPage = () => <div>Details</div>;
const CenterNewNeedPage = () => <div>New Need</div>;
const CenterUpdatesPage = () => <div>Center Updates</div>;
const CenterResidentsPage = () => <div>Residents</div>;

export default function App() {
  return (
    <Routes>
      {/* Públicas fuera del layout (sin navbar) */}
      <Route path={paths.login} element={<LoginPage />} />

      {/* Todo lo demás con layout (navbar fija) */}
      <Route element={<MainLayout />}>
        {/* Home */}
        <Route path={paths.home} element={<Home />} />
        <Route path={paths.map} element={<Map />} />

        {/* Perfil + Mis centros: cualquier autenticado */}
        <Route element={<ProtectedRoute allowedRoleIds={[1, 2, 3]} checkSupportAdmin={true} />}>
          <Route path={paths.profile} element={<Profile />} />
          <Route path={paths.myCenters} element={<MyCenters />} />
        </Route>

        {/* ADMIN: ojo => padre con path "admin" y HIJOS RELATIVOS */}
        <Route
          path="admin"
          element={<ProtectedRoute allowedRoleIds={[1]} checkSupportAdmin={true} />}
        >
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UsersManagementPage />} />
          <Route path="centers" element={<Centers />} />
          <Route path="updates" element={<Updates />} />
        </Route>

        {/* CENTER: padre con path "center/:centerId" y HIJOS RELATIVOS */}
        <Route
          path="center/:centerId"
          element={<ProtectedRoute allowedRoleIds={[1, 2, 3]} checkSupportAdmin={true} />}
        >
          <Route element={<CenterLayout />}>
            <Route index element={<Navigate to="inventory" replace />} />
            <Route path="inventory" element={<CenterInventoryPage />} />
            <Route path="details" element={<CenterDetailsPage />} />
            <Route path="needs/new" element={<CenterNewNeedPage />} />
            <Route path="updates" element={<CenterUpdatesPage />} />
            <Route path="residents" element={<CenterResidentsPage />} />
          </Route>
        </Route>

        {/* 404 dentro del layout */}
        <Route path="*" element={<div>404</div>} />
      </Route>

      {/* Fallback global */}
      <Route path="*" element={<Navigate to={paths.home} replace />} />
    </Routes>
  );
}
