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
    useState<CSVUploadResponse | null>(null);

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
                      >
                        <CardContent>
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
                <Alert
                  severity={uploadResult.success ? "success" : "error"}
                  sx={{ mb: 2 }}
                >
                  {uploadResult.message}
                </Alert>

                {uploadResult.results && (
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Card className="result-card success">
                        <CardContent>
                          <Typography variant="h4" className="value">
                            {uploadResult.results.createdRows}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Registros Creados
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Card className="result-card warning">
                        <CardContent>
                          <Typography variant="h4" className="value">
                            {uploadResult.results.updatedRows}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Registros Actualizados
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Card className="result-card error">
                        <CardContent>
                          <Typography variant="h4" className="value">
                            {uploadResult.results.errorRows}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Errores
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Card className="result-card">
                        <CardContent>
                          <Typography variant="h4" className="value">
                            {uploadResult.results.processedRows}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Procesadas
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
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
