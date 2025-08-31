import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Avatar,
  Button,
  Skeleton,
} from "@mui/material";
import { Person as PersonIcon, Groups as GroupsIcon } from "@mui/icons-material";
import { getUser } from "../../services/usersApi";

type UserLite = {
  user_id: number;
  nombre?: string | null;
  username: string;
  email?: string | null;
  celular?: string | null;
  phone?: string | null; // por si tu API usa 'phone'
};

const getInitials = (name?: string | null) => {
  const s = (name || "").trim();
  if (!s) return "?";
  return s
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

function ResponsibleCard({
  user,
  fallbackIcon,
}: {
  user: UserLite | null;
  fallbackIcon: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 48, height: 48 }}>
            {user ? getInitials(user.nombre || user.username) : fallbackIcon}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            {user ? (
              <>
                <Typography variant="body1" noWrap>
                  {(user.nombre || user.username) ?? "—"}
                </Typography>
                {(user.celular || user.phone) && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    📞 {user.celular || user.phone}
                  </Typography>
                )}
                {user.email && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    ✉️ {user.email}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No asignado
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ResponsibleSection({
  municipalId,
  comunityId,
  onAssignMunicipal, 
  onAssignCommunity,
}: {
  municipalId?: number | null;
  comunityId?: number | null;
  onAssignMunicipal?: () => void;
  onAssignCommunity?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [municipalManager, setMunicipalManager] = useState<UserLite | null>(null);
  const [communityContact, setCommunityContact] = useState<UserLite | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      try {
        const [mun, com] = await Promise.all([
          municipalId ? getUser(municipalId).catch(() => null) : Promise.resolve(null),
          comunityId ? getUser(comunityId).catch(() => null) : Promise.resolve(null),
        ]);
        setMunicipalManager(mun);
        setCommunityContact(com);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [municipalId, comunityId]);

  const SkeletonCard = () => (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="60%" />
            <Skeleton width="40%" />
            <Skeleton width="30%" />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {/* Columna 1: Trabajador municipal */}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Trabajador municipal a cargo
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={onAssignMunicipal}
              disabled={!onAssignMunicipal || !navigator.onLine}  // desactiva si no hay callback o sin conexión
            >
              Cambiar
            </Button>
          </Stack>
          {loading ? (
            <SkeletonCard />
          ) : (
            <ResponsibleCard user={municipalManager} fallbackIcon={<PersonIcon />} />
          )}
        </Box>

        {/* Columna 2: Contacto comunidad */}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Contacto comunidad
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={onAssignCommunity}
              disabled={!onAssignCommunity || !navigator.onLine}
            >
              Cambiar
            </Button>
          </Stack>
          {loading ? (
            <SkeletonCard />
          ) : (
            <ResponsibleCard user={communityContact} fallbackIcon={<GroupsIcon />} />
          )}
        </Box>
      </Stack>
    </Box>
  );
}