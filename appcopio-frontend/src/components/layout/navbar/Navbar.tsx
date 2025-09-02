// src/components/layout/navbar/Navbar.tsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './Navbar.css';

// MUI
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';

// Icons
import Logout from '@mui/icons-material/Logout';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Box from '@mui/material/Box';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdminOrSupport = user?.role_id === 1 || user?.es_apoyo_admin;

  // --- Profile menu state ---
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const goToProfile = () => {
    handleMenuClose();
    navigate('/mi-perfil');
  };

  const firstInitial =
    (user?.nombre?.trim()?.[0] ||
      user?.username?.trim()?.[0] ||
      'U').toUpperCase();

  return (
    <nav className="main-navbar">
      <div className="navbar-logo">
        <NavLink to={isAuthenticated ? (isAdminOrSupport ? "/admin/centers" : "/mis-centros") : "/"}>
          AppCopio
        </NavLink>
      </div>

      <ul className="navbar-links">
        {/* Públicos */}
        <li>
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active-link' : '')}>
            Inicio
          </NavLink>
        </li>
        <li>
          <NavLink to="/map" className={({ isActive }) => (isActive ? 'active-link' : '')}>
            Mapa
          </NavLink>
        </li>

        {!isAuthenticated ? (
          // No logueados
          <li>
            <NavLink to="/login" className="login-button-nav">
              Iniciar Sesión
            </NavLink>
          </li>
        ) : (
          <>
            {/* Admin / Apoyo admin */}
            {isAdminOrSupport && (
              <>
                <li>
                  <NavLink to="/admin/centers" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                    Gestión Centros
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                    Gestión Usuarios
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/updates" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                    Actualizaciones
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/fibe" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                    FIBE
                  </NavLink>
                </li>
              </>
            )}

            {/* Contacto Terreno / Comunidad sin apoyo admin */}
            {(user?.role_id === 2 || user?.role_id === 3) && !user?.es_apoyo_admin && (
              <li>
                <NavLink to="/mis-centros" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                  Mis Centros
                </NavLink>
              </li>
            )}

            {/* --- Perfil (Avatar con menú) --- */}
            <li>
              <Tooltip title={user?.nombre || user?.username || 'Mi cuenta'}>
                <Box
                  onClick={handleMenuOpen}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    ml: 1
                  }}
                >
                  <Avatar
                    src={user?.imagen_perfil || undefined}
                    alt={user?.nombre || user?.username || 'Usuario'}
                    sx={{ width: 36, height: 36, mr: 0.5 }}
                  >
                    {firstInitial}
                  </Avatar>
                  <KeyboardArrowDown fontSize="small" />
                </Box>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={menuOpen}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                PaperProps={{
                  elevation: 3,
                  sx: { minWidth: 200 }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={goToProfile}>
                  <ListItemIcon>
                    <AccountCircle fontSize="small" />
                  </ListItemIcon>
                  Mi Perfil
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Cerrar sesión
                </MenuItem>
              </Menu>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
