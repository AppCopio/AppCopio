// src/components/map/VolunteerContactForm.tsx
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SendIcon from '@mui/icons-material/Send';

// --- NUEVO ---
// Función de validación de RUT (Módulo 11)
const validateRut = (rut: string): boolean => {
  if (typeof rut !== 'string') {
    return false;
  }

  // Limpiar RUT (quitar puntos y guión) y convertir 'k' a 'K'
  const rutLimpio = rut.replace(/[^0-9kK]+/g, '').toUpperCase();
  
  if (rutLimpio.length < 2) {
    return false; // Debe tener al menos cuerpo y dígito verificador
  }

  const dv = rutLimpio.slice(-1);
  const body = rutLimpio.slice(0, -1);

  if (!/^\d+$/.test(body)) {
    return false; // El cuerpo deben ser solo números
  }

  let suma = 0;
  let multiplo = 2;

  // Calcular suma ponderada (Módulo 11)
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body.charAt(i), 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const dvEsperado = 11 - (suma % 11);
  let dvCalculado: string;

  if (dvEsperado === 11) {
    dvCalculado = '0';
  } else if (dvEsperado === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = dvEsperado.toString();
  }

  return dv === dvCalculado;
};
// --- FIN NUEVO ---

interface VolunteerFormData {
  nombre: string;
  rut: string; // --- NUEVO ---
  celular: string;
  email: string;
  capacitaciones: string;
  descripcion_servicios: string;
}

interface VolunteerContactFormProps {
  centerId: string;
  centerName: string;
  onClose?: () => void;
}

export default function VolunteerContactForm({ 
  centerId, 
  centerName,
  onClose 
}: VolunteerContactFormProps) {
  const [formData, setFormData] = useState<VolunteerFormData>({
    nombre: '',
    rut: '', // --- NUEVO ---
    celular: '',
    email: '',
    capacitaciones: '',
    descripcion_servicios: '',
  });

  const [touched, setTouched] = useState({
    nombre: false,
    rut: false, // --- NUEVO ---
    celular: false,
    email: false,
    capacitaciones: false,
    descripcion_servicios: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Validaciones
  const errors = {
    nombre: touched.nombre && !formData.nombre.trim(),
    rut: touched.rut && (!formData.rut.trim() || !validateRut(formData.rut)), // --- NUEVO ---
    celular: touched.celular && (!formData.celular.trim() || !/^\+?[\d\s-]{8,}$/.test(formData.celular)),
    email: touched.email && (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)),
    capacitaciones: touched.capacitaciones && !formData.capacitaciones.trim(),
    descripcion_servicios: touched.descripcion_servicios && !formData.descripcion_servicios.trim(),
  };

  const isFormValid = 
    formData.nombre.trim() &&
    formData.rut.trim() && // --- MODIFICADO ---
    validateRut(formData.rut) && // --- MODIFICADO ---
    formData.celular.trim() &&
    /^\+?[\d\s-]{8,}$/.test(formData.celular) &&
    formData.email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.capacitaciones.trim() &&
    formData.descripcion_servicios.trim();

  const handleChange = (field: keyof VolunteerFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (submitStatus.type) {
      setSubmitStatus({ type: null, message: '' });
    }
  };

  const handleBlur = (field: keyof typeof touched) => () => {
    setTouched({ ...touched, [field]: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos los campos como tocados
    setTouched({
      nombre: true,
      rut: true, // --- NUEVO ---
      celular: true,
      email: true,
      capacitaciones: true,
      descripcion_servicios: true,
    });

    if (!isFormValid) {
      setSubmitStatus({
        type: 'error',
        message: 'Por favor completa todos los campos correctamente.',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      // TODO: Aquí irá la llamada al servicio backend cuando esté implementado
      // await volunteerService.submitContact(centerId, formData);
      
      // Simulación temporal
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Formulario de voluntario enviado:', {
        centerId,
        centerName,
        ...formData,
      });

      setSubmitStatus({
        type: 'success',
        message: '¡Gracias por tu interés! Nos pondremos en contacto contigo pronto.',
      });

      // Limpiar formulario después de envío exitoso
      setTimeout(() => {
        setFormData({
          nombre: '',
          rut: '', // --- NUEVO ---
          celular: '',
          email: '',
          capacitaciones: '',
          descripcion_servicios: '',
        });
        setTouched({
          nombre: false,
          rut: false, // --- NUEVO ---
          celular: false,
          email: false,
          capacitaciones: false,
          descripcion_servicios: false,
        });
        if (onClose) {
          setTimeout(onClose, 1000);
        }
      }, 2000);

    } catch (error: any) {
      console.error('Error al enviar formulario de voluntario:', error);
      setSubmitStatus({
        type: 'error',
        message: error.message || 'Error al enviar el formulario. Por favor intenta nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        maxWidth: 500,
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <VolunteerActivismIcon />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Ofrecer Servicios Voluntarios
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {centerName}
          </Typography>
        </Box>
      </Box>

      {/* Form Content */}
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Completa el formulario para ofrecer tus servicios voluntarios en este albergue.
          El equipo se pondrá en contacto contigo.
        </Typography>

        <Stack spacing={2.5}>
          {/* Nombre */}
          <TextField
            fullWidth
            label="Nombre completo"
            value={formData.nombre}
            onChange={handleChange('nombre')}
            onBlur={handleBlur('nombre')}
            error={errors.nombre}
            helperText={errors.nombre ? 'Ingresa tu nombre completo' : ''}
            required
            disabled={isSubmitting}
            placeholder="Ej: María González"
          />

          {/* --- NUEVO CAMPO RUT --- */}
          <TextField
            fullWidth
            label="RUT"
            value={formData.rut}
            onChange={handleChange('rut')}
            onBlur={handleBlur('rut')}
            error={errors.rut}
            helperText={
              errors.rut 
                ? 'Ingresa un RUT válido (Ej: 12.345.678-9)' 
                : ''
            }
            required
            disabled={isSubmitting}
            placeholder="Ej: 12.345.678-9"
            type="text"
          />
          {/* --- FIN NUEVO CAMPO RUT --- */}


          {/* Celular */}
          <TextField
            fullWidth
            label="Celular"
            value={formData.celular}
            onChange={handleChange('celular')}
            onBlur={handleBlur('celular')}
            error={errors.celular}
            helperText={
              errors.celular 
                ? 'Ingresa un número de celular válido (mín. 8 dígitos)' 
                : 'Incluye código de país si es necesario'
            }
            required
            disabled={isSubmitting}
            placeholder="Ej: +56 9 1234 5678"
            type="tel"
          />

          {/* Email */}
          <TextField
            fullWidth
            label="Correo electrónico"
            value={formData.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            error={errors.email}
            helperText={errors.email ? 'Ingresa un correo electrónico válido' : ''}
            required
            disabled={isSubmitting}
            placeholder="Ej: maria.gonzalez@email.com"
            type="email"
          />

          {/* Capacitaciones */}
          <TextField
            fullWidth
            label="Capacitaciones o certificaciones"
            value={formData.capacitaciones}
            onChange={handleChange('capacitaciones')}
            onBlur={handleBlur('capacitaciones')}
            error={errors.capacitaciones}
            helperText={
              errors.capacitaciones 
                ? 'Describe tus capacitaciones relevantes' 
                : 'Ej: Primeros auxilios, Psicología, Cocina, etc.'
            }
            required
            disabled={isSubmitting}
            multiline
            rows={2}
            placeholder="Describe tus capacitaciones, cursos o certificaciones relevantes"
          />

          {/* Descripción de servicios */}
          <TextField
            fullWidth
            label="Servicios que puedes prestar"
            value={formData.descripcion_servicios}
            onChange={handleChange('descripcion_servicios')}
            onBlur={handleBlur('descripcion_servicios')}
            error={errors.descripcion_servicios}
            helperText={
              errors.descripcion_servicios 
                ? 'Describe los servicios que puedes ofrecer' 
                : 'Sé específico sobre cómo puedes ayudar'
            }
            required
            disabled={isSubmitting}
            multiline
            rows={3}
            placeholder="Ej: Apoyo en cocina, atención médica básica, organización de actividades para niños, etc."
          />
        </Stack>

        {/* Alert de estado */}
        {submitStatus.type && (
          <Alert 
            severity={submitStatus.type} 
            sx={{ mt: 2 }}
            onClose={() => setSubmitStatus({ type: null, message: '' })}
          >
            {submitStatus.message}
          </Alert>
        )}

        {/* Botones */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {onClose && (
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || submitStatus.type === 'success'}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ minWidth: 120 }}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </Box>

        {/* Nota informativa */}
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ display: 'block', mt: 2, textAlign: 'center' }}
        >
          Al enviar este formulario, aceptas compartir tu información de contacto
          con el equipo del albergue.
        </Typography>
      </Box>
    </Box>
  );
}