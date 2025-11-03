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
  notifications: '/notifications', 
  profile: "/mi-perfil",
  myCenters: "/mis-centros",
  myShifts: "/mis-turnos",

  // Center (segmento con parámetro y builders)
  center: {
    pattern: "/center/:centerId", // para <Route />
    root: (centerId: string | number) => `/center/${centerId}`,
    details: (centerId: string | number) => `/center/${centerId}/details`,
    inventory: (centerId: string | number) => `/center/${centerId}/inventory`,
    inventoryHistory: (centerId: string | number) => `/center/${centerId}/inventory/history`,
    movementsHistory: (centerId: string | number) => `/center/${centerId}/movements/history`,
    needsNew: (centerId: string | number) => `/center/${centerId}/needs/new`,
    needsStatus: (centerId: string | number) => `/center/${centerId}/needs/status`,
    residents: (centerId: string | number) => `/center/${centerId}/residents`,
    updates: (centerId: string | number) => `/center/${centerId}/updates`,
    fibe: (centerId: string | number) => `/center/${centerId}/fibe`,
    databases: (centerId: string | number) => `/center/${centerId}/databases`,
    activationsHistory: (centerId: string | number) => `/center/${centerId}/activations`,
    activationDetail: (centerId: string | number, activationId: number) =>  `/center/${centerId}/activations/${activationId}`,
    volunteers: (centerId: string) => `/centers/${centerId}/volunteers`,
    shifts: (centerId: string | number) => `/center/${centerId}/shifts`,

  },
} as const;
