import * as React from "react";
import { Navigate, useRoutes } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";

// helper para lazy con fallback local
const withSuspense = (node: React.ReactNode) => (
  <React.Suspense fallback={<LoadingScreen />}>{node}</React.Suspense>
);

// Lazy pages
const LoginPage = React.lazy(() => import("@/pages/Auth/LoginPage"));
const ForbiddenPage = React.lazy(() => import("@/pages/System/ForbiddenPage"));


const UsersManagementPage = React.lazy(() => import("@/pages/UsersManagementPage"));


/* const DashboardPage = React.lazy(() => import("@/pages/DashboardPage"));
const CentersManagementPage = React.lazy(() => import("@/pages/CentersManagementPage"));

const CenterLayout = React.lazy(() => import("@/layouts/CenterLayout"));
const CenterInventoryPage = React.lazy(() => import("@/pages/Center/InventoryPage"));
const CenterDetailsPage = React.lazy(() => import("@/pages/Center/CenterDetailsPage"));
const CenterNewNeedPage = React.lazy(() => import("@/pages/Center/NewNeedPage"));
const CenterUpdatesPage = React.lazy(() => import("@/pages/Center/UpdatesPage"));
const CenterResidentsPage = React.lazy(() => import("@/pages/Center/ResidentsPage")); */

export default function AppRoutes() {
  const element = useRoutes([
    // públicas
    { path: "/login", element: withSuspense(<LoginPage />) },
    { path: "/403", element: withSuspense(<ForbiddenPage />) },

    {
      element: <MainLayout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },

        /* {
          path: "/dashboard",
          element: (
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          ),
        }, */
        {
          path: "admin/users",
          element: (
            <ProtectedRoute roles={[1]}>
              <UsersManagementPage />
            </ProtectedRoute>
          ),
        },
       /*  {
          path: "/centers",
          element: (
            <ProtectedRoute>
              <CentersManagementPage />
            </ProtectedRoute>
          ),
        },

        // rutas por centro
        {
          path: "/center/:centerId",
          element: (
            <ProtectedRoute>
              <CenterLayout />
            </ProtectedRoute>
          ),
          children: [
            { index: true, element: <Navigate to="inventory" replace /> },
            { path: "inventory", element: <CenterInventoryPage /> },
            { path: "details", element: <CenterDetailsPage /> },
            { path: "needs/new", element: <CenterNewNeedPage /> },
            { path: "updates", element: <CenterUpdatesPage /> },
            { path: "residents", element: <CenterResidentsPage /> },
          ],
        }, */

        { path: "*", element: <Navigate to="/dashboard" replace /> },
      ],
    },
  ]);

  return element;
}
