// src/components/common/CSVDataTable.tsx
import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
  IconButton,
  Typography,
  Box,
  TablePagination,
  Alert,
} from '@mui/material';
import {
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

import { CSVParseResult, CSVError } from '@/utils/csvParser';

interface CSVDataTableProps<T = Record<string, any>> {
  parseResult: CSVParseResult<T>;
  maxPreviewRows?: number;
  showRowNumbers?: boolean;
  onRowClick?: (row: T, index: number) => void;
  hideColumns?: string[];
  columnDisplayNames?: Record<string, string>;
  maxColumnWidth?: number;
}

export default function CSVDataTable<T = Record<string, any>>({
  parseResult,
  maxPreviewRows = 100,
  showRowNumbers = true,
  onRowClick,
  hideColumns = [],
  columnDisplayNames = {},
  maxColumnWidth = 200
}: CSVDataTableProps<T>) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  // Agrupar errores por fila
  const errorsByRow = useMemo(() => {
    const grouped: Record<number, CSVError[]> = {};
    parseResult.errors.forEach(error => {
      if (error.row) {
        if (!grouped[error.row]) {
          grouped[error.row] = [];
        }
        grouped[error.row].push(error);
      }
    });
    return grouped;
  }, [parseResult.errors]);

  // Filtrar columnas visibles
  const visibleColumns = useMemo(() => {
    return parseResult.headers.filter(header => !hideColumns.includes(header));
  }, [parseResult.headers, hideColumns]);

  // Datos paginados
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return parseResult.data.slice(startIndex, startIndex + rowsPerPage);
  }, [parseResult.data, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getRowStatus = (rowIndex: number): 'valid' | 'warning' | 'error' => {
    const actualRowNumber = rowIndex + 2; // +1 por header, +1 por index 0-based
    const rowErrors = errorsByRow[actualRowNumber] || [];
    
    if (rowErrors.length === 0) return 'valid';
    
    const hasErrors = rowErrors.some(err => err.type === 'required' || err.type === 'type');
    return hasErrors ? 'error' : 'warning';
  };

  const getRowErrorsTooltip = (rowIndex: number): string => {
    const actualRowNumber = rowIndex + 2;
    const rowErrors = errorsByRow[actualRowNumber] || [];
    
    if (rowErrors.length === 0) return 'Sin errores';
    
    return rowErrors.map(err => `• ${err.message}`).join('\n');
  };

  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return <ValidIcon color="success" fontSize="small" />;
      case 'warning':
        return <WarningIcon color="warning" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (parseResult.data.length === 0) {
    return (
      <Alert severity="info">
        No hay datos para mostrar en el archivo CSV.
      </Alert>
    );
  }

  return (
    <Paper variant="outlined">
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Vista previa de datos
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Mostrando {Math.min(parseResult.data.length, maxPreviewRows)} de {parseResult.data.length} filas
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {showRowNumbers && (
                <TableCell sx={{ width: 60, fontWeight: 'bold' }}>
                  #
                </TableCell>
              )}
              <TableCell sx={{ width: 60, fontWeight: 'bold' }}>
                Estado
              </TableCell>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column}
                  sx={{ 
                    fontWeight: 'bold',
                    maxWidth: maxColumnWidth,
                    minWidth: 120,
                  }}
                >
                  {columnDisplayNames[column] || column}
                </TableCell>
              ))}
              {onRowClick && (
                <TableCell sx={{ width: 60, fontWeight: 'bold' }}>
                  Acciones
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => {
              const actualIndex = page * rowsPerPage + index;
              const status = getRowStatus(actualIndex);
              const errorsTooltip = getRowErrorsTooltip(actualIndex);
              
              return (
                <TableRow 
                  key={actualIndex}
                  hover={!!onRowClick}
                  sx={{ 
                    cursor: onRowClick ? 'pointer' : 'default',
                    backgroundColor: status === 'error' ? 'rgba(244, 67, 54, 0.05)' : 
                                   status === 'warning' ? 'rgba(255, 152, 0, 0.05)' : 'transparent'
                  }}
                  onClick={onRowClick ? () => onRowClick(row, actualIndex) : undefined}
                >
                  {showRowNumbers && (
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {actualIndex + 1}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>
                    <Tooltip title={errorsTooltip} arrow>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIcon(status)}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  {visibleColumns.map((column) => {
                    const value = (row as Record<string, any>)[column] || '';
                    const displayValue = truncateText(String(value));
                    
                    return (
                      <TableCell 
                        key={column}
                        sx={{ 
                          maxWidth: maxColumnWidth,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {displayValue.length < String(value).length ? (
                          <Tooltip title={String(value)} arrow>
                            <span>{displayValue}</span>
                          </Tooltip>
                        ) : (
                          displayValue
                        )}
                      </TableCell>
                    );
                  })}
                  {onRowClick && (
                    <TableCell>
                      <IconButton size="small">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={parseResult.data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
      />
    </Paper>
  );
}
