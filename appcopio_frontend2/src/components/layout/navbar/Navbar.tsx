import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Avatar, Menu, MenuItem, Tooltip, Divider, Box, IconButton, ListItemIcon, Chip, Badge
} from "@mui/material";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import Logout from "@mui/icons-material/Logout";
import AccountCircle from "@mui/icons-material/AccountCircle";
import AdminPanelSettings from "@mui/icons-material/AdminPanelSettings";
import Work from "@mui/icons-material/Work";
import Person from "@mui/icons-material/Person";
import VerifiedUser from "@mui/icons-material/VerifiedUser";

import { useAuth } from "@/contexts/AuthContext";
import { isAdminOrSupport, isFieldUser, isMunicipalWorker } from "@/utils/authz";
import { paths } from "@/routes/paths";
import { OfflineIndicator } from "@/offline/components/OfflineIndicator";

import "./Navbar.css";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const onMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const onMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    onMenuClose();
    await logout();
    navigate(paths.login, { replace: true });
  };

  const goProfile = () => {
    onMenuClose();
    navigate(paths.profile);
  };

  const getRoleDisplay = () => {
    if (!user?.role_name) return null;

    const roleName = user.role_name.toLowerCase();
    
    let label = "";
    let icon = <Person fontSize="small" />;
    let color: "primary" | "success" | "info" = "info";

    if (roleName.includes("admin") || user.es_apoyo_admin) {
      label = "Administrador";
      icon = <AdminPanelSettings fontSize="small" />;
      color = "primary";
    } else if (roleName.includes("municipal") || roleName.includes("trabajador")) {
      label = "Trabajador Municipal";
      icon = <Work fontSize="small" />;
      color = "success";
    } else if (roleName.includes("contacto") || roleName.includes("ciudadano")) {
      label = "Contacto Ciudadano";
      icon = <Person fontSize="small" />;
      color = "info";
    } else {
      label = user.role_name;
      color = "info";
    }

    return { label, icon, color };
  };

  const roleDisplay = getRoleDisplay();

  const initial = (user?.nombre?.trim()?.[0] || user?.username?.trim()?.[0] || "U").toUpperCase();

  return (
    <nav className="main-navbar">
      <div className="navbar-logo">
        <NavLink to={paths.home}>AppCopio</NavLink>
      </div>

      <ul className="navbar-links">
        {/* Indicador offline mejorado */}
        <li style={{ marginRight: "1rem" }}>
          <OfflineIndicator variant="chip" showWhenOnline={false} />
        </li>

        <li>
          <NavLink to={paths.home} className={({ isActive }) => (isActive ? "active-link" : "")}>Inicio</NavLink>
        </li>
        <li>
          <NavLink to={paths.map} className={({ isActive }) => (isActive ? "active-link" : "")}>Mapa</NavLink>
        </li>
        <li>
          <NavLink to={paths.notifications} className={({ isActive }) => (isActive ? "active-link" : "")}>Buzón</NavLink>
        </li>

        {isAdminOrSupport(user) && (
          <>
            <li><NavLink to={paths.admin.centers.root} className={({ isActive }) => (isActive ? "active-link" : "")}>Gestión Centros</NavLink></li>
            <li><NavLink to={paths.admin.users}   className={({ isActive }) => (isActive ? "active-link" : "")}>Gestión Usuarios</NavLink></li>
            <li><NavLink to={paths.admin.updates} className={({ isActive }) => (isActive ? "active-link" : "")}>Actualizaciones</NavLink></li>
            <li><NavLink to={paths.admin.csv} className={({ isActive }) => (isActive ? "active-link" : "")}>Carga CSV</NavLink></li>
          </>
        )}

        {isMunicipalWorker(user) && !isAdminOrSupport(user) && (
          <li><NavLink to={paths.admin.updates} className={({ isActive }) => (isActive ? "active-link" : "")}>Mis Actualizaciones</NavLink></li>
        )}

        {isFieldUser(user) && (
          <li><NavLink to={paths.myCenters} className={({ isActive }) => (isActive ? "active-link" : "")}>Mis Centros</NavLink></li>
        )}

        {!isAuthenticated ? (
          <li style={{ marginLeft: "auto" }}>
            <NavLink to={paths.login} className="login-button-nav">Iniciar Sesión</NavLink>
          </li>
        ) : (
          <li style={{ marginLeft: "auto" }}>
            <Tooltip title={user?.nombre || user?.username || "Mi cuenta"}>
              <Box onClick={onMenuOpen} sx={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 1.5 }}>
                {roleDisplay && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Chip
                      icon={roleDisplay.icon}
                      label={roleDisplay.label}
                      color={roleDisplay.color}
                      size="small"
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        height: 28
                      }}
                    />
                    {user?.es_apoyo_admin && (
                      <Tooltip title="Apoyo Administrativo" arrow placement="top">
                        <VerifiedUser 
                          sx={{ 
                            fontSize: '1.1rem', 
                            color: '#ffa726',
                            filter: 'drop-shadow(0 0 2px rgba(255, 167, 38, 0.5))'
                          }} 
                        />
                      </Tooltip>
                    )}
                  </Box>
                )}
                <Avatar src={user?.imagen_perfil || undefined} alt={user?.nombre || user?.username || "Usuario"} sx={{ width: 36, height: 36 }}>
                  {initial}
                </Avatar>
                <IconButton size="small" sx={{ color: "inherit" }}>
                  <KeyboardArrowDown fontSize="small" />
                </IconButton>
              </Box>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={onMenuClose}
              PaperProps={{ elevation: 3, sx: { minWidth: 220 } }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem onClick={goProfile}>
                <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
                Mi Perfil
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                Cerrar sesión
              </MenuItem>
            </Menu>
          </li>
        )}
      </ul>
    </nav>
  );
}
