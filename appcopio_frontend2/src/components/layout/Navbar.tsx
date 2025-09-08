import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, Typography, Box, Button, Stack, Avatar,
  Menu, MenuItem, Divider, Tooltip, IconButton
} from "@mui/material";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import Logout from "@mui/icons-material/Logout";
import AccountCircle from "@mui/icons-material/AccountCircle";

import { useAuth } from "@/contexts/AuthContext";
import { isAdminOrSupport, isFieldUser } from "@/utils/authz";
import { paths } from "@/routes/paths";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
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

  const initial =
    (user?.nombre?.trim()?.[0] || user?.username?.trim()?.[0] || "U").toUpperCase();

  const LinkBtn = ({ to, label, show = true }: { to: string; label: string; show?: boolean }) =>
    show ? (
      <Button
        component={NavLink}
        to={to}
        sx={{ "&.active": { fontWeight: 700, textDecoration: "underline" } }}
      >
        {label}
      </Button>
    ) : null;

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography
          variant="h6"
          sx={{ cursor: "pointer" }}
          onClick={() =>
            navigate(
              isAuthenticated ? (isAdminOrSupport(user) ? paths.admin.centers : paths.myCenters) : paths.home
            )
          }
        >
          AppCopio
        </Typography>

        {/* Navegación izquierda */}
        <Stack direction="row" spacing={1} flex={1}>
          <LinkBtn to={paths.home} label="Inicio" />
          <LinkBtn to={paths.map}  label="Mapa" />

          {/* Admin / Apoyo admin */}
          <LinkBtn to={paths.admin.centers} label="Gestión Centros" show={isAdminOrSupport(user)} />
          <LinkBtn to={paths.admin.users}   label="Gestión Usuarios" show={isAdminOrSupport(user)} />
          <LinkBtn to={paths.admin.updates} label="Actualizaciones"  show={isAdminOrSupport(user)} />

          {/* TMO / CC sin apoyo */}
          <LinkBtn to={paths.myCenters} label="Mis Centros" show={isFieldUser(user)} />
        </Stack>

        {/* Lado derecho */}
        {!isAuthenticated ? (
          <Button variant="contained" onClick={() => navigate(paths.login)} size="small">
            Iniciar sesión
          </Button>
        ) : (
          <Tooltip title={user?.nombre || user?.username || "Mi cuenta"}>
            <Box onClick={onMenuOpen} sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <Avatar
                src={user?.imagen_perfil || undefined}
                alt={user?.nombre || user?.username || "Usuario"}
                sx={{ width: 36, height: 36, mr: 0.5 }}
              >
                {initial}
              </Avatar>
              <IconButton size="small">
                <KeyboardArrowDown fontSize="small" />
              </IconButton>
            </Box>
          </Tooltip>
        )}

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={onMenuClose}
          PaperProps={{ elevation: 3, sx: { minWidth: 220 } }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem onClick={goProfile}>
            <AccountCircle fontSize="small" style={{ marginRight: 8 }} />
            Mi Perfil
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <Logout fontSize="small" style={{ marginRight: 8 }} />
            Cerrar sesión
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
