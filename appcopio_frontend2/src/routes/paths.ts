// src/routes/paths.ts
export const paths = {
  // Públicas
  home: "/",
  map: "/map",
  login: "/login",

  // Admin
  admin: {
    root: "/admin",
    users: "/admin/users",
    updates: "/admin/updates",
    csv: "/admin/csv-upload",

    centers: {
      root: "/admin/centers",
      new: "/admin/centers/new",
      editPattern: "/admin/centers/:centerId/edit",
      edit: (centerId: string | number) => `/admin/centers/${centerId}/edit`,
    },
  },

  // Perfil y mis centros
  profile: "/mi-perfil",
  myCenters: "/mis-centros",

  // Center (segmento con parámetro y builders)
  center: {
    pattern: "/center/:centerId", // para <Route />
    root: (centerId: string | number) => `/center/${centerId}`,
    details: (centerId: string | number) => `/center/${centerId}/details`,
    inventory: (centerId: string | number) => `/center/${centerId}/inventory`,
    inventoryHistory: (centerId: string | number) => `/center/${centerId}/inventory/history`,
    needsNew: (centerId: string | number) => `/center/${centerId}/needs/new`,
    needsStatus: (centerId: string | number) => `/center/${centerId}/needs/status`,
    residents: (centerId: string | number) => `/center/${centerId}/residents`,
    updates: (centerId: string | number) => `/center/${centerId}/updates`,
    fibe: (centerId: string | number) => `/center/${centerId}/fibe`,
    datasets: (centerId: string | number) => `/center/${centerId}/datasets`,
  },
} as const;
