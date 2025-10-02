// src/utils/csvParser.ts
export interface CSVParseResult<T = Record<string, any>> {
  data: T[];
  errors: CSVError[];
  headers: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface CSVError {
  row: number;
  column?: string;
  message: string;
  type: 'validation' | 'format' | 'required' | 'type';
  value?: any;
}

export interface CSVValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'date' | 'boolean';
  validate?: (value: any, row: Record<string, any>) => string | null;
}

export interface CSVParseOptions {
  delimiter?: string;
  skipEmptyLines?: boolean;
  trimWhitespace?: boolean;
  requiredColumns?: string[];
  validationRules?: CSVValidationRule[];
  columnMappings?: Record<string, string>; // CSV column -> internal field
}

/**
 * Parsea un archivo CSV y devuelve los datos estructurados con validaciones
 */
export function parseCSV<T = Record<string, any>>(
  csvContent: string,
  options: CSVParseOptions = {}
): CSVParseResult<T> {
  const {
    delimiter = ',',
    skipEmptyLines = true,
    trimWhitespace = true,
    requiredColumns = [],
    validationRules = [],
    columnMappings = {}
  } = options;

  const lines = csvContent.split(/\r?\n/);
  const result: CSVParseResult<T> = {
    data: [],
    errors: [],
    headers: [],
    totalRows: 0,
    validRows: 0,
    invalidRows: 0
  };

  if (lines.length === 0) {
    result.errors.push({
      row: 0,
      message: 'El archivo CSV está vacío',
      type: 'format'
    });
    return result;
  }

  // Parsear headers
  const headerLine = lines[0];
  if (!headerLine) {
    result.errors.push({
      row: 1,
      message: 'No se encontró línea de encabezados',
      type: 'format'
    });
    return result;
  }

  result.headers = parseCSVLine(headerLine, delimiter, trimWhitespace);

  // Validar columnas requeridas
  const missingColumns = requiredColumns.filter(col => !result.headers.includes(col));
  if (missingColumns.length > 0) {
    result.errors.push({
      row: 1,
      message: `Columnas requeridas faltantes: ${missingColumns.join(', ')}`,
      type: 'validation'
    });
  }

  // Parsear filas de datos
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (skipEmptyLines && (!line || line.trim() === '')) {
      continue;
    }

    result.totalRows++;
    const rowData = parseCSVLine(line, delimiter, trimWhitespace);
    const rowObject: Record<string, any> = {};
    let hasRowErrors = false;

    // Mapear datos a objeto
    result.headers.forEach((header, index) => {
      const mappedField = columnMappings[header] || header;
      const value = rowData[index] || '';
      rowObject[mappedField] = value;
    });

    // Validar fila
    const rowErrors = validateRow(rowObject, validationRules, i + 1);
    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
      hasRowErrors = true;
    }

    if (hasRowErrors) {
      result.invalidRows++;
    } else {
      result.validRows++;
    }

    result.data.push(rowObject as T);
  }

  return result;
}

/**
 * Parsea una línea CSV individual respetando comillas
 */
function parseCSVLine(line: string, delimiter: string, trim: boolean): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Comilla escapada
        current += '"';
        i += 2;
      } else {
        // Toggle estado de comillas
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Delimiter fuera de comillas
      result.push(trim ? current.trim() : current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Añadir último campo
  result.push(trim ? current.trim() : current);
  
  return result;
}

/**
 * Valida una fila según las reglas definidas
 */
function validateRow(
  row: Record<string, any>,
  rules: CSVValidationRule[],
  rowNumber: number
): CSVError[] {
  const errors: CSVError[] = [];

  rules.forEach(rule => {
    const value = row[rule.field];
    
    // Validar campo requerido
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors.push({
        row: rowNumber,
        column: rule.field,
        message: `El campo "${rule.field}" es obligatorio`,
        type: 'required',
        value
      });
      return;
    }

    // Si no hay valor y no es requerido, skip validaciones de tipo
    if (!value || value.toString().trim() === '') {
      return;
    }

    // Validar tipo
    if (rule.type) {
      const typeError = validateFieldType(value, rule.type, rule.field);
      if (typeError) {
        errors.push({
          row: rowNumber,
          column: rule.field,
          message: typeError,
          type: 'type',
          value
        });
      }
    }

    // Validación custom
    if (rule.validate) {
      const customError = rule.validate(value, row);
      if (customError) {
        errors.push({
          row: rowNumber,
          column: rule.field,
          message: customError,
          type: 'validation',
          value
        });
      }
    }
  });

  return errors;
}

/**
 * Valida el tipo de un campo
 */
function validateFieldType(value: any, type: string, fieldName: string): string | null {
  const strValue = value.toString().trim();
  
  switch (type) {
    case 'number':
      if (isNaN(Number(strValue))) {
        return `"${fieldName}" debe ser un número válido`;
      }
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strValue)) {
        return `"${fieldName}" debe ser un email válido`;
      }
      break;
      
    case 'date':
      const date = new Date(strValue);
      if (isNaN(date.getTime())) {
        return `"${fieldName}" debe ser una fecha válida (YYYY-MM-DD)`;
      }
      break;
      
    case 'boolean':
      const validBooleans = ['true', 'false', '1', '0', 'sí', 'no', 'yes', 'no'];
      if (!validBooleans.includes(strValue.toLowerCase())) {
        return `"${fieldName}" debe ser un valor booleano (true/false, 1/0, sí/no)`;
      }
      break;
  }
  
  return null;
}

/**
 * Convierte un objeto a formato CSV
 */
export function objectsToCSV<T extends Record<string, any>>(
  data: T[],
  headers?: string[],
  options: { delimiter?: string; includeHeaders?: boolean } = {}
): string {
  const { delimiter = ',', includeHeaders = true } = options;
  
  if (data.length === 0) return '';
  
  const actualHeaders = headers || Object.keys(data[0]);
  const lines: string[] = [];
  
  if (includeHeaders) {
    lines.push(actualHeaders.join(delimiter));
  }
  
  data.forEach(row => {
    const values = actualHeaders.map(header => {
      const value = row[header] || '';
      const strValue = value.toString();
      
      // Envolver en comillas si contiene delimiter, comillas o saltos de línea
      if (strValue.includes(delimiter) || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      
      return strValue;
    });
    
    lines.push(values.join(delimiter));
  });
  
  return lines.join('\n');
}

/**
 * Descarga un CSV desde el navegador
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
