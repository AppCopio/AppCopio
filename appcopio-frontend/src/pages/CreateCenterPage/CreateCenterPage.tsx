import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  OutlinedInput,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import './CreateCenterPage.css';

import { createCenter } from '../../services/centerApi';
import { CenterData } from '../../types/center';

const CreateCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CenterData>({
    organizationName: '',
    address: '',
    directorName: '',
    directorRole: '',
    contactPhones: '',
    evaluationDate: '',
    coordinateEste: 0,
    coordinateNorte: 0,
    folioNumber: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: (name === 'coordinateEste' || name === 'coordinateNorte') ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- LÓGICA DE AUTENTICACIÓN TEMPORALMENTE DESHABILITADA ---
    // En lugar de obtener el token del localStorage, usaremos un string vacío.
    // Esto es solo para fines de prueba, no para producción.
    const token = '';

    const backendData = {
        center_id: "C009",
        name: formData.organizationName,
        type: 'Albergue',
        latitude: formData.coordinateNorte,
        longitude: formData.coordinateEste,
        address: formData.address,
    };
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const newCenter = await createCenter(backendData, token);
      setSuccess(`Centro "${newCenter.name}" creado con éxito.`);
      setTimeout(() => navigate('/admin/centers'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, margin: '2rem auto', padding: '2rem', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Registro de Nuevo Centro de Acopio
      </Typography>
      <form onSubmit={handleSubmit}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">1. Información General</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Datos de la Organización y ubicación del centro según el catastro.
            </Typography>
            <Grid container spacing={2}>
              {/* Nombre de la Organización */}
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined" sx={{ my: 1 }}>
                  <InputLabel htmlFor="organizationName-input" required>Nombre de la Organización</InputLabel>
                  <OutlinedInput
                    id="organizationName-input"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    label="Nombre de la Organización"
                  />
                </FormControl>
              </Grid>

              {/* Dirección */}
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined" sx={{ my: 1 }}>
                  <InputLabel htmlFor="address-input" required>Dirección</InputLabel>
                  <OutlinedInput
                    id="address-input"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    label="Dirección"
                  />
                </FormControl>
              </Grid>

              {/* Nombre Directiva o Dirigente/a */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ my: 1 }}>
                  <InputLabel htmlFor="directorName-input">Nombre Directiva o Dirigente/a</InputLabel>
                  <OutlinedInput
                    id="directorName-input"
                    name="directorName"
                    value={formData.directorName}
                    onChange={handleChange}
                    label="Nombre Directiva o Dirigente/a"
                  />
                </FormControl>
              </Grid>

              {/* Cargo/Rol */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ my: 1 }}>
                  <InputLabel htmlFor="directorRole-input">Cargo/Rol</InputLabel>
                  <OutlinedInput
                    id="directorRole-input"
                    name="directorRole"
                    value={formData.directorRole}
                    onChange={handleChange}
                    label="Cargo/Rol"
                  />
                </FormControl>
              </Grid>

              {/* Teléfonos de Contacto */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ my: 1 }}>
                  <InputLabel htmlFor="contactPhones-input">Teléfonos de Contacto</InputLabel>
                  <OutlinedInput
                    id="contactPhones-input"
                    name="contactPhones"
                    value={formData.contactPhones}
                    onChange={handleChange}
                    label="Teléfonos de Contacto"
                  />
                </FormControl>
              </Grid>
              
              {/* Fecha de Evaluación */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ my: 1 }}>
                  <InputLabel htmlFor="evaluationDate-input" shrink>Fecha de Evaluación</InputLabel>
                  <OutlinedInput
                    id="evaluationDate-input"
                    name="evaluationDate"
                    type="date"
                    value={formData.evaluationDate}
                    onChange={handleChange}
                    label="Fecha de Evaluación"
                  />
                </FormControl>
              </Grid>
              
              {/* Coordenadas */}
              <Grid item xs={12}>
                <Grid container spacing={1} sx={{ my: 1 }}>
                    <Grid item xs={6}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel htmlFor="coordinateEste-input" shrink>Coordenada Este</InputLabel>
                        <OutlinedInput
                          id="coordinateEste-input"
                          name="coordinateEste"
                          type="number"
                          value={formData.coordinateEste}
                          onChange={handleChange}
                          label="Coordenada Este"
                        />
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel htmlFor="coordinateNorte-input" shrink>Coordenada Norte</InputLabel>
                        <OutlinedInput
                          id="coordinateNorte-input"
                          name="coordinateNorte"
                          type="number"
                          value={formData.coordinateNorte}
                          onChange={handleChange}
                          label="Coordenada Norte"
                        />
                      </FormControl>
                    </Grid>
                  </Grid>
              </Grid>

              {/* N° FOLIO */}
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined" sx={{ my: 1 }}>
                  <InputLabel htmlFor="folioNumber-input">N° FOLIO</InputLabel>
                  <OutlinedInput
                    id="folioNumber-input"
                    name="folioNumber"
                    value={formData.folioNumber}
                    onChange={handleChange}
                    label="N° FOLIO"
                  />
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">2. Caracterización del Inmueble</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <p>Esta sección se completará en el siguiente paso.</p>
          </AccordionDetails>
        </Accordion>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button type="submit" variant="contained" color="primary" sx={{ mr: 2 }} disabled={isLoading}>
            {isLoading ? 'Creando...' : 'Crear Centro'}
          </Button>
          <Button component={NavLink} to="/admin/centers" variant="outlined" color="secondary" disabled={isLoading}>
            Volver
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default CreateCenterPage;