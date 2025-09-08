export const paths = {
  home: "/",
  map: "/map",
  login: "/login",
  profile: "/mi-perfil",

  admin: {
    centers: "/admin/centers",
    users: "/admin/users",
    updates: "/admin/updates",
  },

  myCenters: "/mis-centros",

  center: (id = ":centerId") => ({
    root: `/center/${id}`,
    inventory: `/center/${id}/inventory`,
    details: `/center/${id}/details`,
    needsNew: `/center/${id}/needs/new`,
    updates: `/center/${id}/updates`,
    residents: `/center/${id}/residents`,
  }),
} as const;
