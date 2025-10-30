import * as React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Collapse,
  useMediaQuery,
  useTheme,
  Chip,
  Typography,
  AppBar,
  Toolbar,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import MapIcon from "@mui/icons-material/Map";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PeopleIcon from "@mui/icons-material/People";
import UpdateIcon from "@mui/icons-material/Update";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import WorkIcon from "@mui/icons-material/Work";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LoginIcon from "@mui/icons-material/Login";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { useAuth } from "@/contexts/AuthContext";
import { isAdminOrSupport, isFieldUser, isMunicipalWorker } from "@/utils/authz";
import { paths } from "@/routes/paths";
import { OfflineIndicator } from "@/offline/components/OfflineIndicator";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 70;
const APP_BAR_HEIGHT = 64;

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  isCollapsed: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge, isCollapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/");

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <Tooltip title={isCollapsed ? label : ""} placement="right" arrow>
        <ListItemButton
          component={NavLink}
          to={to}
          onClick={handleClick}
          sx={{
            minHeight: 48,
            justifyContent: isCollapsed ? "center" : "initial",
            px: 2.5,
            backgroundColor: isActive ? "rgba(255, 255, 255, 0.1)" : "transparent",
            borderLeft: isActive ? "4px solid white" : "4px solid transparent",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.15)",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: isCollapsed ? "auto" : 3,
              justifyContent: "center",
              color: "white",
            }}
          >
            {badge ? (
              <Badge badgeContent={badge} color="error">
                {icon}
              </Badge>
            ) : (
              icon
            )}
          </ListItemIcon>
          {!isCollapsed && (
            <ListItemText
              primary={label}
              sx={{
                color: "white",
                "& .MuiTypography-root": {
                  fontWeight: isActive ? 600 : 400,
                },
              }}
            />
          )}
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );
};

export default function VerticalNavbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [adminMenuOpen, setAdminMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false); // Ahora falso por defecto en desktop
  const [mobileOpen, setMobileOpen] = React.useState(false);
  
  // Obtener notificaciones no leídas
  const { unreadCount: unreadNotifications } = useUnreadNotifications();

  const menuOpen = Boolean(anchorEl);

  // Función para obtener el display del rol
  const getRoleDisplay = () => {
    if (!user?.role_name) return null;

    const roleName = user.role_name.toLowerCase();
    
    let label = "";
    let icon = <WorkIcon fontSize="small" />;
    let color: "primary" | "success" | "info" = "info";

    if (roleName.includes("admin") || user.es_apoyo_admin) {
      label = "Administrador";
      icon = <AdminPanelSettingsIcon fontSize="small" />;
      color = "primary";
    } else if (roleName.includes("municipal") || roleName.includes("trabajador")) {
      label = "Trabajador Municipal";
      icon = <WorkIcon fontSize="small" />;
      color = "success";
    } else if (roleName.includes("contacto") || roleName.includes("ciudadano")) {
      label = "Contacto Ciudadano";
      icon = <AccountCircleIcon fontSize="small" />;
      color = "info";
    } else {
      label = user.role_name;
      color = "info";
    }

    return { label, icon, color };
  };

  const roleDisplay = getRoleDisplay();

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate(paths.login, { replace: true });
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate(paths.profile);
  };

  const toggleAdminMenu = () => {
    setAdminMenuOpen(!adminMenuOpen);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleNavItemClick = () => {
    // Cerrar drawer en móvil al hacer click en un enlace
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const initial = (user?.nombre?.trim()?.[0] || user?.username?.trim()?.[0] || "U").toUpperCase();

  const drawerWidth = isCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  // Contenido del drawer
  const drawerContent = (
    <>
      {/* Logo */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          minHeight: 80,
        }}
      >
        <NavLink to={paths.home} style={{ display: "flex", alignItems: "center" }}>
          <Box
            component="img"
            src="/logos/Monocromático_vertical.png"
            alt="AppCopio"
            sx={{
              height: isCollapsed ? "40px" : "60px",
              objectFit: "contain",
              transition: "height 0.3s ease",
            }}
          />
        </NavLink>
      </Box>

      {/* Botón de colapsar/expandir para desktop - Solo visible en desktop */}
      {!isMobile && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            pb: 1,
          }}
        >
          <IconButton
            onClick={handleCollapseToggle}
            sx={{
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
            size="small"
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>
      )}

      <Divider sx={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }} />

      {/* Indicador Offline */}
      <Box sx={{ px: 2, py: 1 }}>
        <OfflineIndicator variant="chip" showWhenOnline={false} />
      </Box>

      {/* Navigation Items */}
      <List>
        <NavItem to={paths.home} icon={<HomeIcon />} label="Inicio" isCollapsed={isCollapsed} onClick={handleNavItemClick} />
        <NavItem to={paths.map} icon={<MapIcon />} label="Mapa" isCollapsed={isCollapsed} onClick={handleNavItemClick} />
        <NavItem
          to={paths.notifications}
          icon={<NotificationsIcon />}
          label="Buzón"
          badge={unreadNotifications}
          isCollapsed={isCollapsed}
          onClick={handleNavItemClick}
        />

        {/* Admin Menu (Agrupado) */}
        {isAdminOrSupport(user) && (
          <>
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title={isCollapsed ? "Administración" : ""} placement="right" arrow>
                <ListItemButton
                  onClick={toggleAdminMenu}
                  sx={{
                    minHeight: 48,
                    justifyContent: isCollapsed ? "center" : "initial",
                    px: 2.5,
                    backgroundColor: adminMenuOpen ? "rgba(255, 255, 255, 0.05)" : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isCollapsed ? "auto" : 3,
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    <AdminPanelSettingsIcon />
                  </ListItemIcon>
                  {!isCollapsed && (
                    <>
                      <ListItemText
                        primary="Administración"
                        sx={{
                          color: "white",
                        }}
                      />
                      {adminMenuOpen ? <ExpandLessIcon sx={{ color: "white" }} /> : <ExpandMoreIcon sx={{ color: "white" }} />}
                    </>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <Collapse in={adminMenuOpen && !isCollapsed} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <NavItem
                  to={paths.admin.users}
                  icon={<PeopleIcon />}
                  label="Usuarios"
                  isCollapsed={false}
                  onClick={handleNavItemClick}
                />
                <NavItem
                  to={paths.admin.updates}
                  icon={<UpdateIcon />}
                  label="Actualizaciones"
                  isCollapsed={false}
                  onClick={handleNavItemClick}
                />
                <NavItem
                  to={paths.admin.csv}
                  icon={<UploadFileIcon />}
                  label="Importar datos"
                  isCollapsed={false}
                  onClick={handleNavItemClick}
                />
                <NavItem
                  to={paths.admin.centers.root}
                  icon={<HomeIcon />}
                  label="Centros"
                  isCollapsed={false}
                  onClick={handleNavItemClick}
                />
              </List>
            </Collapse>
          </>
        )}


        {isFieldUser(user) && (
          <NavItem to={paths.myCenters} icon={<WorkIcon />} label="Mis Centros" isCollapsed={isCollapsed} onClick={handleNavItemClick} />
        )}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }} />

      {/* User Section */}
      {!isAuthenticated ? (
        <Box sx={{ p: 2 }}>
          <Tooltip title={isCollapsed ? "Iniciar Sesión" : ""} placement="right" arrow>
            <ListItemButton
              component={NavLink}
              to={paths.login}
              sx={{
                borderRadius: 2,
                backgroundColor: "white",
                color: "#000000",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 2, color: "#000000" }}>
                <LoginIcon />
              </ListItemIcon>
              {!isCollapsed && <ListItemText primary="Iniciar Sesión" />}
            </ListItemButton>
          </Tooltip>
        </Box>
      ) : (
        <Box sx={{ p: 1.5 }}>
          {/* Avatar y Chip en la misma línea cuando NO está colapsado */}
          {!isCollapsed ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                p: 1,
                borderRadius: 2,
                transition: "background-color 0.2s",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
              onClick={handleMenuOpen}
            >
              {/* Avatar más pequeño */}
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={
                  user?.es_apoyo_admin ? (
                    <VerifiedUserIcon
                      sx={{
                        fontSize: "0.85rem",
                        color: "#ffa726",
                        backgroundColor: "#000",
                        borderRadius: "50%",
                        padding: "2px",
                      }}
                    />
                  ) : undefined
                }
              >
                <Avatar
                  src={user?.imagen_perfil || undefined}
                  alt={user?.nombre || user?.username || "Usuario"}
                  sx={{
                    width: 32,
                    height: 32,
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  {initial}
                </Avatar>
              </Badge>

              {/* Info del usuario al lado */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Nombre (más pequeño) */}
                <Typography
                  variant="body2"
                  sx={{
                    color: "white",
                    fontWeight: 500,
                    fontSize: "0.813rem",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.nombre}
                </Typography>

                {/* Chip de rol más compacto */}
                {roleDisplay && (
                  <Chip
                    icon={roleDisplay.icon}
                    label={roleDisplay.label}
                    color={roleDisplay.color}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.688rem",
                      fontWeight: 500,
                      mt: 0.5,
                      "& .MuiChip-icon": {
                        fontSize: "0.875rem",
                        marginLeft: "4px",
                      },
                      "& .MuiChip-label": {
                        padding: "0 6px",
                      },
                    }}
                  />
                )}
              </Box>
            </Box>
          ) : (
            /* Modo colapsado - Solo avatar clickeable */
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={handleMenuOpen}
            >
              <Tooltip title={`${user?.nombre}${roleDisplay ? ` - ${roleDisplay.label}` : ""}`} placement="right" arrow>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  badgeContent={
                    user?.es_apoyo_admin ? (
                      <VerifiedUserIcon
                        sx={{
                          fontSize: "0.85rem",
                          color: "#ffa726",
                          backgroundColor: "#000",
                          borderRadius: "50%",
                          padding: "2px",
                        }}
                      />
                    ) : undefined
                  }
                >
                  <Avatar
                    src={user?.imagen_perfil || undefined}
                    alt={user?.nombre || user?.username || "Usuario"}
                    sx={{
                      width: 36,
                      height: 36,
                      border: "2px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    {initial}
                  </Avatar>
                </Badge>
              </Tooltip>
            </Box>
          )}
        </Box>
      )}

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 200 },
        }}
        transformOrigin={{ horizontal: "right", vertical: "bottom" }}
        anchorOrigin={{ horizontal: "right", vertical: "top" }}
      >
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Mi Perfil
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Cerrar sesión
        </MenuItem>
      </Menu>
    </>
  );

  return (
    <>
      {/* AppBar superior solo visible en móvil */}
      <AppBar
        position="fixed"
        sx={{
          display: { xs: "flex", md: "none" },
          backgroundColor: "#000000",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="abrir menú"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            component="img"
            src="/logos/Monocromático_vertical.png"
            alt="AppCopio"
            sx={{
              height: "40px",
              objectFit: "contain",
            }}
          />
        </Toolbar>
      </AppBar>

      {/* Drawer permanente para Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#000000",
            color: "white",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: "hidden",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Drawer temporal para Móvil */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Mejor performance en móvil
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            backgroundColor: "#000000",
            color: "white",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

// Exportar constantes para usar en MainLayout
export { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED, APP_BAR_HEIGHT };