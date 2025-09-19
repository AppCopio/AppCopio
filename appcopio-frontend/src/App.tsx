// src/App.tsx
import { Routes, Route } from "react-router-dom";
import "./App.css";

// Rutas normalizadas
import { paths } from "@/routes/paths";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import CenterLayout from "@/layouts/CenterLayout";

// Guards
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import ActivationProviderFromParams from "@/components/guards/ActivationProviderFromParams";
import RequireCenterActive from "@/components/guards/RequireCenterActive";

// Pages
import HomePage from "@/pages/HomePage/HomePage";
import MapPage from "@/pages/MapPage/MapPage";
import LoginPage from "@/pages/Auth/LoginPage";
import CenterManagementPage from "@/pages/CenterManagementPage/CenterManagementPage";
import UsersManagementPage from "@/pages/UsersManagementPage/UsersManagementPage";
import CenterDetailsPage from "@/pages/CenterDetailsPage/CenterDetailsPage";
import InventoryPage from "@/pages/InventoryPage/InventoryPage";
import NeedsFormPage from "@/pages/NeedsFormPage/NeedsFormPage";
import NeedsStatusPage from "@/pages/NeedsStatusPage/NeedsStatusPage";
import UpdatesPage from "@/pages/UpdatesPage/UpdatesPage";
import InventoryHistoryPage from "@/pages/InventoryHistoryPage/InventoryHistoryPage";
import MisCentrosPage from "@/pages/MisCentrosPage/MisCentrosPage";
import FibePage from "@/pages/FibePage/FibePage";
import CenterResidentsPage from "@/pages/CenterResidentsPage/CenterResidentsPage";
import CenterEditPage from "@/pages/CenterEditPage/CenterEditPage";
import MultiStepCenterForm from "@/pages/CreateCenterPage/steps/MultiStepCenterForm";
import MyUserPage from "@/pages/MyUserPage/MyUserPage";

export default function App() {
  return (
    <div className="App">
      <main className="content">
        <Routes>
          {/* 1) Públicas */}
          <Route element={<MainLayout />}>
            <Route path={paths.home} element={<HomePage />} />
            <Route path={paths.map} element={<MapPage />} />
            <Route path={paths.login} element={<LoginPage />} />
          </Route>

          {/* 2) Protegidas (roles 1,2,3; incluye es_apoyo_admin) */}
          <Route
            element={
              <ProtectedRoute
                allowedRoleIds={[1, 2, 3]}
                checkSupportAdmin={true}
              />
            }
          >
            {/* /admin con layout */}
            <Route element={<MainLayout />}>
              <Route path={paths.admin.centers.root} element={<CenterManagementPage />} />
              <Route path={paths.admin.centers.new} element={<MultiStepCenterForm />} />
              <Route path={paths.admin.users} element={<UsersManagementPage />} />
              <Route path={paths.admin.updates} element={<UpdatesPage />} />
              <Route path={paths.profile} element={<MyUserPage />} />
              <Route path={paths.myCenters} element={<MisCentrosPage />} />

              {/* center/:centerId con hijos relativos + providers/guards */}
              <Route path={paths.center.pattern} element={<CenterLayout />}>
                <Route element={<ActivationProviderFromParams />}>
                  <Route path="details" element={<CenterDetailsPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/history" element={<InventoryHistoryPage />} />
                  <Route path="needs/new" element={<NeedsFormPage />} />
                  <Route path="needs/status" element={<NeedsStatusPage />} />
                  <Route path="residents" element={<CenterResidentsPage />} />
                  <Route path="updates" element={<UpdatesPage />} />

                  {/* Requiere activación activa */}
                  <Route element={<RequireCenterActive redirectTo="../details" />}>
                    <Route path="fibe" element={<FibePage />} />
                  </Route>
                </Route>
              </Route>

              {/* Edit de centros */}
              <Route path={paths.admin.centers.editPattern} element={<CenterEditPage />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<h2>404 - Página no encontrada</h2>} />
        </Routes>
      </main>
    </div>
  );
}
