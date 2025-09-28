// src/components/common/CSVUploader.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Stack,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

import { parseCSV, CSVParseResult, CSVError, CSVParseOptions } from '@/utils/csvParser';

interface CSVUploaderProps<T = Record<string, any>> {
  onDataParsed: (result: CSVParseResult<T>) => void;
  parseOptions?: CSVParseOptions;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // en bytes
  disabled?: boolean;
  className?: string;
  helperText?: string;
  showPreview?: boolean;
}

export default function CSVUploader<T = Record<string, any>>({
  onDataParsed,
  parseOptions = {},
  acceptedFileTypes = ['.csv', '.txt'],
  maxFileSize = 5 * 1024 * 1024, // 5MB por defecto
  disabled = false,
  className,
  helperText = 'Arrastra y suelta tu archivo CSV aquí o haz clic para seleccionar',
  showPreview = true
}: CSVUploaderProps<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<CSVParseResult<T> | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [showErrors, setShowErrors] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setFileError('');
    setParseResult(null);
    setFileName(file.name);

    // Validar tipo de archivo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      setFileError(`Tipo de archivo no permitido. Solo se aceptan: ${acceptedFileTypes.join(', ')}`);
      return;
    }

    // Validar tamaño
    if (file.size > maxFileSize) {
      setFileError(`El archivo es muy grande. Tamaño máximo: ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`);
      return;
    }

    setIsProcessing(true);

    try {
      const content = await readFileAsText(file);
      const result = parseCSV<T>(content, parseOptions);
      
      setParseResult(result);
      onDataParsed(result);
      
      if (result.errors.length > 0) {
        setShowErrors(true);
      }
    } catch (error) {
      setFileError(`Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [acceptedFileTypes, maxFileSize, parseOptions, onDataParsed]);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleClearFile = () => {
    setFileName('');
    setParseResult(null);
    setFileError('');
    setShowErrors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusColor = () => {
    if (fileError) return 'error';
    if (parseResult?.errors.length === 0) return 'success';
    if (parseResult?.errors.length && parseResult.errors.length > 0) return 'warning';
    return 'info';
  };

  return (
    <Box className={className}>
      {/* Input oculto para archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Zona de drop */}
      <Paper
        variant="outlined"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        sx={{
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: isDragging ? '2px dashed #1976d2' : '2px dashed #ccc',
          backgroundColor: isDragging ? '#f0f7ff' : disabled ? '#fafafa' : 'transparent',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease',
          '&:hover': !disabled ? {
            backgroundColor: '#f8f9fa',
            borderColor: '#1976d2',
          } : {}
        }}
      >
        <UploadIcon sx={{ fontSize: 48, color: isDragging ? '#1976d2' : '#666', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {fileName || 'Seleccionar archivo CSV'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {helperText}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Tipos aceptados: {acceptedFileTypes.join(', ')} | Tamaño máximo: {(maxFileSize / (1024 * 1024)).toFixed(1)}MB
        </Typography>
      </Paper>

      {/* Barra de progreso */}
      {isProcessing && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Procesando archivo...
          </Typography>
        </Box>
      )}

      {/* Error de archivo */}
      {fileError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setFileError('')}>
          {fileError}
        </Alert>
      )}

      {/* Resultados del parsing */}
      {parseResult && !fileError && (
        <Box sx={{ mt: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Resultados del análisis
              </Typography>
              <IconButton onClick={handleClearFile} size="small">
                <DeleteIcon />
              </IconButton>
            </Stack>

            {/* Estadísticas */}
            <Stack direction="row" spacing={2} flexWrap="wrap" mb={2}>
              <Chip 
                icon={<SuccessIcon />}
                label={`${parseResult.validRows} filas válidas`} 
                color="success" 
                variant="outlined" 
              />
              {parseResult.invalidRows > 0 && (
                <Chip 
                  icon={<ErrorIcon />}
                  label={`${parseResult.invalidRows} filas con errores`} 
                  color="error" 
                  variant="outlined" 
                />
              )}
              <Chip 
                label={`${parseResult.totalRows} filas totales`} 
                color={getStatusColor()}
                variant="outlined" 
              />
              <Chip 
                label={`${parseResult.headers.length} columnas`} 
                variant="outlined" 
              />
            </Stack>

            {/* Columnas detectadas */}
            <Typography variant="subtitle2" gutterBottom>
              Columnas detectadas:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
              {parseResult.headers.map((header, index) => (
                <Chip key={index} label={header} size="small" variant="outlined" />
              ))}
            </Stack>

            {/* Errores */}
            {parseResult.errors.length > 0 && (
              <Box>
                <Button
                  startIcon={showErrors ? <CollapseIcon /> : <ExpandIcon />}
                  onClick={() => setShowErrors(!showErrors)}
                  color="warning"
                  size="small"
                >
                  {parseResult.errors.length} error{parseResult.errors.length !== 1 ? 'es' : ''} encontrado{parseResult.errors.length !== 1 ? 's' : ''}
                </Button>
                
                <Collapse in={showErrors}>
                  <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                    <List dense>
                      {parseResult.errors.map((error, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" color="error">
                                Fila {error.row}: {error.message}
                              </Typography>
                            }
                            secondary={
                              error.column && error.value !== undefined ? (
                                <Typography variant="caption" color="text.secondary">
                                  Columna: {error.column}, Valor: "{error.value}"
                                </Typography>
                              ) : null
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Collapse>
              </Box>
            )}

            {/* Mensaje de éxito */}
            {parseResult.errors.length === 0 && parseResult.validRows > 0 && (
              <Alert severity="success">
                ¡Archivo procesado exitosamente! Todos los datos son válidos.
              </Alert>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
