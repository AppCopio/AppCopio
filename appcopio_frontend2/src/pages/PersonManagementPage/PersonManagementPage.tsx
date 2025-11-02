import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  LinearProgress,
  Alert,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import type { PersonSearchFilters, PersonSearchResult } from '@/services/persons.service';
import { personsService } from '@/services/persons.service';
import { listCenters } from '@/services/centers.service';
import type { Center } from '@/types/center';

export default function PersonManagementPage() {
  const navigate = useNavigate();

  // Estados de búsqueda
  const [filters, setFilters] = React.useState<PersonSearchFilters>({
    rut: '',
    nombre: '',
    center_id: undefined,
  });

  // Estados de datos
  const [results, setResults] = React.useState<PersonSearchResult[]>([]);
  const [centers, setCenters] = React.useState<Center[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searched, setSearched] = React.useState(false);

  // Cargar centros para el filtro
  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const data = await listCenters(ac.signal);
        if (!ac.signal.aborted) setCenters(data);
      } catch (e: any) {
        if (!ac.signal.aborted) console.error('Error cargando centros:', e);
      }
    })();
    return () => ac.abort();
  }, []);

  const handleSearch = async () => {
    // Validación: al menos un filtro
    if (!filters.rut && !filters.nombre && !filters.center_id) {
      setError('Debes ingresar al menos un criterio de búsqueda (RUT, nombre o centro)');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const data = await personsService.search(filters);
      setResults(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al buscar personas');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters({ rut: '', nombre: '', center_id: undefined });
    setResults([]);
    setError(null);
    setSearched(false);
  };

  const handleEdit = (personId: number, familyId: number) => {
    navigate(`/personas/${personId}?family_id=${familyId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Personas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Busca personas por RUT, nombre o centro y edita su información
      </Typography>

      {/* Filtros de Búsqueda */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Criterios de Búsqueda</Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {/* RUT */}
            <TextField
              fullWidth
              label="RUT"
              placeholder="Ej: 12345678-9"
              value={filters.rut}
              onChange={(e) => setFilters({ ...filters, rut: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />

            {/* Nombre */}
            <TextField
              fullWidth
              label="Nombre"
              placeholder="Buscar por nombre o apellido"
              value={filters.nombre}
              onChange={(e) => setFilters({ ...filters, nombre: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />

            {/* Centro */}
            <TextField
              fullWidth
              select
              label="Centro"
              value={filters.center_id || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  center_id: e.target.value ? e.target.value : undefined,
                })
              }
            >
              <MenuItem value="">Todos los centros</MenuItem>
              {centers.map((c) => (
                <MenuItem key={c.center_id} value={c.center_id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Botones de acción */}
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              Buscar
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClear}
              disabled={loading}
            >
              Limpiar
            </Button>
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Resultados */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {searched && !loading && (
        <Paper>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">
              Resultados ({results.length})
            </Typography>
          </Box>

          {results.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No se encontraron personas con los criterios especificados
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>RUT</TableCell>
                    <TableCell>Nombre Completo</TableCell>
                    <TableCell>Edad</TableCell>
                    <TableCell>Centro</TableCell>
                    <TableCell>Parentesco</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((person, idx) => (
                    <TableRow key={`${person.person_id}-${idx}`} hover>
                      <TableCell>{person.rut}</TableCell>
                      <TableCell>
                        {personsService.formatFullName(person)}
                      </TableCell>
                      <TableCell>{person.edad}</TableCell>
                      <TableCell>{person.center_name}</TableCell>
                      <TableCell>{person.parentesco}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver/Editar">
                          <IconButton
                            color="primary"
                            onClick={() => handleEdit(person.person_id, person.family_id || 0)}
                            size="small"
                            disabled={!person.family_id}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Container>
  );
}
