// src/pages/CreateCenterPage/CreateCenterPage.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Accordion, AccordionSummary, AccordionDetails, TextField, Button, Box, Typography, Grid } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import './CreateCenterPage.css';

interface FormData {
  organizationName: string;
  address: string;
  directorName: string;
  directorRole: string;
  contactPhones: string;
  evaluationDate: string;
  coordinateEast: string;
  coordinateNorth: string;
  folioNumber: string;
  // Agrega más campos a medida que avanzamos en el formulario.
}

const CreateCenterPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    address: '',
    directorName: '',
    directorRole: '',
    contactPhones: '',
    evaluationDate: '',
    coordinateEast: '',
    coordinateNorth: '',
    folioNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
    // Lógica para manejar el registro offline o la llamada a la API
  };

  return (
    <Box sx={{ maxWidth: 900, margin: '2rem auto', padding: '2rem', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
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
              <Grid item xs={50} md={41} lg={50}>
                <TextField
                  fullWidth
                  label="Nombre de la Organización"
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dirección"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre Directiva o Dirigente/a"
                  id="directorName"
                  name="directorName"
                  value={formData.directorName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cargo/Rol"
                  id="directorRole"
                  name="directorRole"
                  value={formData.directorRole}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfonos de Contacto"
                  id="contactPhones"
                  name="contactPhones"
                  value={formData.contactPhones}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha de Evaluación"
                  type="date"
                  id="evaluationDate"
                  name="evaluationDate"
                  value={formData.evaluationDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Coordenada Este"
                  id="coordinateEast"
                  name="coordinateEast"
                  value={formData.coordinateEast}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Coordenada Norte"
                  id="coordinateNorth"
                  name="coordinateNorth"
                  value={formData.coordinateNorth}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="N° FOLIO"
                  id="folioNumber"
                  name="folioNumber"
                  value={formData.folioNumber}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Sección II: Caracterización del Inmueble (próximamente) */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">2. Caracterización del Inmueble</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <p>Esta sección se completará en el siguiente paso.</p>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button type="submit" variant="contained" color="primary" sx={{ mr: 2 }}>
            Crear Centro
          </Button>
          <Button component={NavLink} to="/admin/centers" variant="outlined" color="secondary">
            Volver
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default CreateCenterPage;