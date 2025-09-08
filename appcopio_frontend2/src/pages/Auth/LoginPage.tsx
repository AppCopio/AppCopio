import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Paper, Stack, TextField, Button, Typography, Alert } from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const from = location?.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password); 
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (  
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "70vh", px: 2 }}>
      <Paper sx={{ p: 3, width: "100%", maxWidth: 420 }}>
        <Typography variant="h6" mb={2}>Ingresar</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
