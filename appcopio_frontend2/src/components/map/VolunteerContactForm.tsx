// src/components/map/VolunteerContactForm.tsx
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SendIcon from '@mui/icons-material/Send';
import { volunteerService } from '@/services/volunteer.service';
import type { VolunteerContactCreate } from '@/types/volunteer';

// Función de validación de RUT (Módulo 11)
const validateRut = (rut: string): boolean => {
  if (typeof rut !== 'string') return false;
  const rutLimpio = rut.replace(/[^0-9kK]+/g, '').toUpperCase();
  if (rutLimpio.length < 2) return false;
  const dv = rutLimpio.slice(-1);
  const body = rutLimpio.slice(0, -1);
  if (!/^\d+$/.test(body)) return false;
  
  let suma = 0;
  let multiplo = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body.charAt(i), 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  
  const dvEsperado = 11 - (suma % 11);
  let dvCalculado: string;
  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = dvEsperado.toString();
  
  return dv === dvCalculado;
};

interface VolunteerFormData {
  nombre: string;
  rut: string;
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
    rut: '',
    celular: '',
    email: '',
    capacitaciones: '',
    descripcion_servicios: '',
  });

  const [touched, setTouched] = useState({
    nombre: false,
    rut: false,
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
    rut: touched.rut && (!formData.rut.trim() || !validateRut(formData.rut)),
    celular: touched.celular && (!formData.celular.trim() || !/^\+?[\d\s-]{8,}$/.test(formData.celular)),
    email: touched.email && (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)),
    capacitaciones: touched.capacitaciones && !formData.capacitaciones.trim(),
    descripcion_servicios: touched.descripcion_servicios && !formData.descripcion_servicios.trim(),
  };

  const isFormValid = 
    formData.nombre.trim() &&
    formData.rut.trim() &&
    validateRut(formData.rut) &&
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

    setTouched({
      nombre: true,
      rut: true,
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
      const contactData: VolunteerContactCreate = {
        nombre: formData.nombre.trim(),
        rut: formData.rut.trim(),
        celular: formData.celular.trim(),
        email: formData.email.trim(),
        capacitaciones: formData.capacitaciones.trim(),
        descripcion_servicios: formData.descripcion_servicios.trim(),
      };

      // ✅ SIMPLIFICADO: El backend busca el activation_id automáticamente
      await volunteerService.createVolunteerContact(
        contactData,
        0, // El backend ignora esto y busca automáticamente
        centerId
      );

      setSubmitStatus({
        type: 'success',
        message: '¡Gracias por tu interés! Nos pondremos en contacto contigo pronto.',
      });

      setTimeout(() => {
        setFormData({
          nombre: '',
          rut: '',
          celular: '',
          email: '',
          capacitaciones: '',
          descripcion_servicios: '',
        });
        setTouched({
          nombre: false,
          rut: false,
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
        message: error.response?.data?.error || error.message || 'Error al enviar el formulario.',
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

      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Completa el formulario para ofrecer tus servicios voluntarios.
        </Typography>

        <Stack spacing={2.5}>
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

          <TextField
            fullWidth
            label="RUT"
            value={formData.rut}
            onChange={handleChange('rut')}
            onBlur={handleBlur('rut')}
            error={errors.rut}
            helperText={errors.rut ? 'Ingresa un RUT válido' : ''}
            required
            disabled={isSubmitting}
            placeholder="Ej: 12.345.678-9"
          />

          <TextField
            fullWidth
            label="Celular"
            value={formData.celular}
            onChange={handleChange('celular')}
            onBlur={handleBlur('celular')}
            error={errors.celular}
            helperText={errors.celular ? 'Ingresa un número válido' : ''}
            required
            disabled={isSubmitting}
            placeholder="Ej: +56 9 1234 5678"
            type="tel"
          />

          <TextField
            fullWidth
            label="Correo electrónico"
            value={formData.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            error={errors.email}
            helperText={errors.email ? 'Ingresa un correo válido' : ''}
            required
            disabled={isSubmitting}
            placeholder="Ej: maria@email.com"
            type="email"
          />

          <TextField
            fullWidth
            label="Capacitaciones o certificaciones"
            value={formData.capacitaciones}
            onChange={handleChange('capacitaciones')}
            onBlur={handleBlur('capacitaciones')}
            error={errors.capacitaciones}
            helperText={errors.capacitaciones ? 'Describe tus capacitaciones' : ''}
            required
            disabled={isSubmitting}
            multiline
            rows={2}
          />

          <TextField
            fullWidth
            label="Servicios que puedes prestar"
            value={formData.descripcion_servicios}
            onChange={handleChange('descripcion_servicios')}
            onBlur={handleBlur('descripcion_servicios')}
            error={errors.descripcion_servicios}
            helperText={errors.descripcion_servicios ? 'Describe los servicios' : ''}
            required
            disabled={isSubmitting}
            multiline
            rows={3}
          />
        </Stack>

        {submitStatus.type && (
          <Alert 
            severity={submitStatus.type} 
            sx={{ mt: 2 }}
            onClose={() => setSubmitStatus({ type: null, message: '' })}
          >
            {submitStatus.message}
          </Alert>
        )}

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

        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ display: 'block', mt: 2, textAlign: 'center' }}
        >
          Al enviar este formulario, aceptas compartir tu información de contacto.
        </Typography>
      </Box>
    </Box>
  );
}