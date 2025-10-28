// src/pages/CsvUploadPage/CsvUploadPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Box,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as PreviewIcon,
} from "@mui/icons-material";
import CSVUploader from "@/components/common/CSVUploader";
import CSVDataTable from "@/components/common/CSVDataTable";
import { CSVParseResult } from "@/utils/csvParser";
import { CSVUploadResponse, CSVUploadModule } from "@/types/csv";
import {
  CSV_MODULE_CONFIGS,
  getCSVParseOptions,
  uploadCSVData,
  downloadStaticTemplate,
} from "@/services/csv.service";
import "./CsvUploadPage.css";

export default function CsvUploadPage() {
  // Definición de los pasos del stepper
  const steps = [
    "Seleccionar Módulo",
    "Cargar Archivo CSV",
    "Validar Datos",
    "Confirmar Importación",
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [selectedModule, setSelectedModule] = useState<CSVUploadModule | null>(
    null
  );
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResponse | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);

  // Función para calcular duplicados
  const calculateDuplicates = (errors: any[] | undefined): number => {
    if (!errors) return 0;
    return errors.filter(
      error => error.message.toLowerCase().includes('ya existe') || 
              error.message.toLowerCase().includes('duplicado')
    ).length;
  };

  // Función para calcular errores de validación (no duplicados)
  const calculateValidationErrors = (errors: any[] | undefined): number => {
    if (!errors) return 0;
    return errors.filter(
      error => !error.message.toLowerCase().includes('ya existe') && 
              !error.message.toLowerCase().includes('duplicado')
    ).length;
  };

  const handleModuleSelect = (module: CSVUploadModule) => {
    setSelectedModule(module);
    setParseResult(null);
    setUploadResult(null);
    setActiveStep(1);
  };

  const handleDataParsed = useCallback((result: CSVParseResult) => {
    setParseResult(result);
    if (result.validRows > 0) {
      setActiveStep(2);
    }
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    if (!selectedModule) return;
    downloadStaticTemplate(selectedModule);
  }, [selectedModule]);

  const handleUpload = async () => {
    if (!selectedModule || !parseResult) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadCSVData({
        module: selectedModule,
        data: parseResult.data,
        options: {
          updateExisting: true,
          ignoreErrors: false,
        },
      });
      setUploadResult(result);
      setActiveStep(3);
    } catch (error) {
      console.error("Error uploading data:", error);
      // Manejar error de upload
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedModule(null);
    setParseResult(null);
    setUploadResult(null);
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const selectedConfig = selectedModule
    ? CSV_MODULE_CONFIGS[selectedModule]
    : null;

  return (
    <Container maxWidth="xl" className="csv-upload-page">
      <div className="csv-upload-header">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Importar Datos CSV
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Carga información masiva desde archivos CSV para diferentes
              módulos del sistema
            </Typography>
          </Box>
          {selectedModule && activeStep > 0 && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Chip
                label={`Módulo: ${selectedConfig?.displayName}`}
                color="primary"
                variant="outlined"
                size="medium"
              />
              <Button
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                variant="outlined"
                color="primary"
              >
                Cambiar Módulo
              </Button>
            </Box>
          )}
        </Box>
      </div>

      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Seleccionar Módulo */}
        <Step>
          <StepLabel>Seleccionar Módulo</StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Elige el tipo de datos que deseas importar
            </Typography>
            <Grid container spacing={2}>
              {(Object.keys(CSV_MODULE_CONFIGS) as CSVUploadModule[]).map(
                (module) => {
                  const config = CSV_MODULE_CONFIGS[module];
                  return (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={module}>
                      <Card
                        className={`module-card ${selectedModule === module ? "selected" : ""}`}
                        onClick={() => handleModuleSelect(module)}
                        sx={{ height: '100%' }}
                      >
                        <CardContent sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          p: 0 
                        }}>
                          <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                mb: 1,
                              }}
                            >
                              <Typography variant="h6" component="h3">
                                {config.displayName}
                              </Typography>
                              {selectedModule === module && (
                                <CheckCircleIcon
                                  color="primary"
                                  fontSize="small"
                                />
                              )}
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              paragraph
                              sx={{ flex: 1 }}
                            >
                              {config.description}
                            </Typography>
                            <div className="required-columns">
                              <Typography variant="caption" display="block">
                                Columnas requeridas:
                              </Typography>
                              <Box
                                sx={{
                                  mt: 0.5,
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                }}
                              >
                                {config.requiredColumns.map((column) => (
                                  <Chip
                                    key={column}
                                    label={column}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                  />
                                ))}
                              </Box>
                            </div>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                }
              )}
            </Grid>
          </StepContent>
        </Step>

        {/* Step 2: Subir Archivo */}
        <Step>
          <StepLabel>Subir Archivo CSV</StepLabel>
          <StepContent>
            {selectedConfig && (
              <Box sx={{ mb: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Módulo seleccionado:{" "}
                  <strong>{selectedConfig.displayName}</strong>
                </Alert>

                <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadTemplate}
                    variant="outlined"
                    size="small"
                  >
                    Descargar Plantilla
                  </Button>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    mb: 2,
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                    variant="outlined"
                    size="small"
                    className="back-button"
                  >
                    Volver a Módulos
                  </Button>
                </Box>

                <CSVUploader
                  onDataParsed={handleDataParsed}
                  parseOptions={{
                    ...{
                      ...getCSVParseOptions(selectedModule!),
                      skipEmptyLines:
                        getCSVParseOptions(selectedModule!).skipEmptyLines === "greedy"
                          ? true
                          : !!getCSVParseOptions(selectedModule!).skipEmptyLines,
                    },
                    requiredColumns: [
                      ...(getCSVParseOptions(selectedModule!).requiredColumns ||
                        []),
                    ],
                  }}
                  helperText="Sube tu archivo CSV con los datos del módulo seleccionado"
                />
              </Box>
            )}
          </StepContent>
        </Step>

        {/* Step 3: Revisar Datos */}
        <Step>
          <StepLabel>Revisar Datos</StepLabel>
          <StepContent>
            {parseResult && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Button
                    startIcon={<PreviewIcon />}
                    onClick={() => setShowPreview(true)}
                    variant="outlined"
                  >
                    Ver Datos Completos
                  </Button>
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                    variant="outlined"
                    size="small"
                    className="back-button"
                  >
                    Cambiar Archivo
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={handleUpload}
                    disabled={isUploading || parseResult.validRows === 0}
                    color="primary"
                  >
                    {isUploading
                      ? "Importando..."
                      : `Importar ${parseResult.validRows} filas`}
                  </Button>
                </Box>
              </Box>
            )}
          </StepContent>
        </Step>

        {/* Step 4: Resultado */}
        <Step>
          <StepLabel>Resultado de la Importación</StepLabel>
          <StepContent>
            {uploadResult && (
              <Box>

                {uploadResult.results && (
                  <Box>
                    {/* Resumen numérico en tarjetas */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Card className="result-card success">
                          <CardContent>
                            <Typography variant="h4" className="value" color="success.main">
                              {uploadResult.results.createdRows || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                               Registros Creados
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              Nuevos registros agregados exitosamente
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Card className="result-card error">
                          <CardContent>
                            <Typography variant="h4" className="value" color="error.main">
                              {calculateValidationErrors(uploadResult.results.errors)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                               Errores de Validación
                            </Typography>
                            <Typography variant="caption" color="error.main">
                              Registros con datos inválidos
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 6, md: 3 }}>
                        <Card className="result-card warning">
                          <CardContent>
                            <Typography variant="h4" className="value" color="warning.main">
                              {calculateDuplicates(uploadResult.results.errors)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                               Duplicados
                            </Typography>
                            <Typography variant="caption" color="warning.main">
                              Registros que ya existían
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 6, md: 3 }}>
                        <Card className="result-card info">
                          <CardContent>
                            <Typography variant="h4" className="value" color="info.main">
                              {uploadResult.results.totalRows || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                               Total Procesado
                            </Typography>
                            <Typography variant="caption" color="info.main">
                              Filas analizadas del archivo
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Mostrar errores detallados si existen */}
                {uploadResult.results?.errors && uploadResult.results.errors.length > 0 && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Detalle de Problemas
                      </Typography>
                      
                      {/* Errores de validación */}
                      {calculateValidationErrors(uploadResult.results.errors) > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="error.main" gutterBottom>
                             Errores de Validación ({calculateValidationErrors(uploadResult.results.errors)})
                          </Typography>
                          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {uploadResult.results.errors
                              .filter(error => !error.message.toLowerCase().includes('ya existe') && 
                                             !error.message.toLowerCase().includes('duplicado'))
                              .map((error, index) => (
                                <Alert key={`validation-${index}`} severity="error" sx={{ mb: 1 }}>
                                  <strong>Fila {error.row}:</strong> {error.message}
                                  {error.column && <><br/><strong>Columna:</strong> {error.column}</>}
                                </Alert>
                              ))}
                          </Box>
                        </Box>
                      )}

                      {/* Duplicados */}
                      {calculateDuplicates(uploadResult.results.errors) > 0 && (
                        <Box>
                          <Typography variant="subtitle2" color="warning.main" gutterBottom>
                             Registros Duplicados ({calculateDuplicates(uploadResult.results.errors)})
                          </Typography>
                          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {uploadResult.results.errors
                              .filter(error => error.message.toLowerCase().includes('ya existe') || 
                                             error.message.toLowerCase().includes('duplicado'))
                              .map((error, index) => (
                                <Alert key={`duplicate-${index}`} severity="warning" sx={{ mb: 1 }}>
                                  <strong>Fila {error.row}:</strong> {error.message}
                                </Alert>
                              ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="contained"
                  onClick={handleReset}
                  color="primary"
                >
                  Nueva Importación
                </Button>
              </Box>
            )}
          </StepContent>
        </Step>
      </Stepper>

      {/* Dialog para vista completa de datos */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Vista Completa de Datos</DialogTitle>
        <DialogContent>
          {parseResult && (
            <CSVDataTable
              parseResult={parseResult}
              showRowNumbers={true}
              maxPreviewRows={1000}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
