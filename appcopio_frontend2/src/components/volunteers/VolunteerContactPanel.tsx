// --- Archivo Nuevo ---
import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { volunteerService } from '@/services/volunteer.service';
import type { VolunteerContactResponse, VolunteerStatus, VolunteerContactCreate } from '@/types/volunteer';
interface VolunteerContactPanelProps {
  activationId: number; // Recibe el ID de la activación
}

// Opciones de estado que define el backend
const STATUS_OPTIONS: VolunteerStatus[] = [
  'pendiente',
  'contactado',
  'aceptado',
  'rechazado',
];


export default function VolunteerContactPanel({
  activationId,
}: VolunteerContactPanelProps) {
  const queryClient = useQueryClient();

  // 1. Obtener los datos usando el servicio corregido
  const {
  data: records,
  isLoading,
  error,
} = useQuery<VolunteerContactResponse[], Error>({ // <-- Abre un objeto
  
  queryKey: ['volunteerContacts', activationId], // <-- 1. Define el queryKey
  
  queryFn: () => volunteerService.getVolunteerContactsByActivation(activationId), // <-- 2. Define el queryFn

});

  // 2. Mutación para actualizar el estado
 const updateStatusMutation = useMutation({ // <-- Abre un objeto
  
  // 1. La función AHORA va DENTRO del objeto, bajo la llave 'mutationFn'
  mutationFn: (data: { recordId: string; status: VolunteerStatus; notes: string; }) =>
    volunteerService.updateVolunteerContactStatus(data.recordId, data.status, data.notes),
  
  // 2. Las opciones (onSuccess, onError) van en el MISMO objeto
  onSuccess: () => {
    // (Sintaxis v5 actualizada para invalidar)
    queryClient.invalidateQueries({ queryKey: ['volunteerContacts', activationId] });
  },
  onError: (err: any) => {
    alert('Error al actualizar: ' + (err.response?.data?.error || err.message));
  },

});

  const handleStatusChange = (recordId: string, newStatus: VolunteerStatus) => {
  const notesToSend = ''; 
  
  updateStatusMutation.mutate({ recordId, status: newStatus, notes: notesToSend });
};
  
  // Nombres de los campos (columnas) que esperamos de la BD dinámica
// Línea 91:
const fieldNames = ['Nombre', 'RUT', 'Email', 'Celular', 'Mensaje', 'Notes', 'Contactado en', 'Status'];

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Error al cargar datos.</Alert>;
  if (!records || records == null) {
    return <Alert severity="info">No hay solicitudes de voluntarios.</Alert>;
  }

  // Función para obtener el estado de un registro
  const getRecordStatus = (record: VolunteerContactResponse): VolunteerStatus => {
    // El backend lo guarda en select_values
    return (record.select_values?.Status?.[0] || 'pendiente') as VolunteerStatus;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {fieldNames.map((name) => (
                <TableCell key={name}>{name}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => {
                const currentStatus = getRecordStatus(record);

                return (
                <TableRow key={record.id}>
                    {/* Celdas de Datos (data) */}
                    <TableCell>{record.data.Nombre}</TableCell>
                    <TableCell>{record.data.RUT}</TableCell> {/* <-- AÑADIDO */}
                    <TableCell>{record.data.Email}</TableCell>
                    <TableCell>{record.data.Celular}</TableCell>
                    <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {record.data.Mensaje}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {record.data.Notes} {/* <-- AÑADIDO */}
                    </TableCell>
                    <TableCell>
                    {record.data.contacted_at ? new Date(record.data.contacted_at as string).toLocaleDateString() : 'N/A'} {/* <-- AÑADIDO */}
                    </TableCell>

                    {/* Celda de Estado (select_values) */}
                    <TableCell>
                    <FormControl size="small" fullWidth sx={{ minWidth: 140 }}>
                      <Select
                        value={currentStatus}
                        disabled={updateStatusMutation.isPending}
                        onChange={(e) =>
                          handleStatusChange(record.id, e.target.value as VolunteerStatus)
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <MenuItem key={status} value={status}>
                            <Chip label={status} size="small" color={
                              status === 'aceptado' ? 'success' :
                              status === 'rechazado' ? 'error' :
                              status === 'contactado' ? 'info' : 'warning'
                            } />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}