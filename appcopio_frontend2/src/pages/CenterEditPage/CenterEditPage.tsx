// src/pages/CenterEditPage/CenterEditPage.tsx
import React, { useState, useEffect } from "react";
import { Box, Stepper, Step, StepLabel, Button, Typography, Alert } from "@mui/material";
import StepGeneral from "./StepGeneral";
import StepInmueble from "@/pages/CreateCenterPage/steps/StepInmueble";
import StepEvaluacion from "@/pages/CreateCenterPage/steps/StepEvaluacion";
import { CenterData, initialCenterData } from "@/types/center";
import { useNavigate, useParams } from "react-router-dom";
import { getCenter, updateCenter, deleteCenter } from "@/services/centers.service";
import { useAuth } from "@/contexts/AuthContext";
import deepEqual from "fast-deep-equal";
import "./CenterEditPage.css";

interface StepHandle {
  validate: () => boolean;
}

const steps = ["General", "Inmueble", "Evaluación"];

const CenterEditPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<CenterData>(initialCenterData);
  const [originalData, setOriginalData] = useState<CenterData>(initialCenterData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step1Ref = React.useRef<StepHandle>(null);
  const step2Ref = React.useRef<StepHandle>(null);
  const step3Ref = React.useRef<StepHandle>(null);

  // Carga de datos del centro
  useEffect(() => {
    async function load() {
      if (!centerId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOneCenter(centerId);
        setOriginalData(data as unknown as CenterData); // asumiendo shape compatible
        setFormData(data as unknown as CenterData);
      } catch (err: any) {
        console.error("Error fetching center data for edit:", err);
        setError(err?.response?.data?.message || err?.message || "No se pudo cargar la información del centro.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [centerId]);

  const handleNext = () => {
    let currentStepIsValid = false;
    if (activeStep === 0 && step1Ref.current) currentStepIsValid = step1Ref.current.validate();
    else if (activeStep === 1 && step2Ref.current) currentStepIsValid = step2Ref.current.validate();
    else if (activeStep === 2 && step3Ref.current) currentStepIsValid = step3Ref.current.validate();

    if (currentStepIsValid) setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleChange = (name: keyof CenterData, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmUpdate = () => setIsConfirmationOpen(true);

  const handleCancelSubmit = () => {
    setIsConfirmationOpen(false);
    setIsDeleteModalOpen(false);
    setIsSaving(false);
  };

  const handleUpdateSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (!centerId) throw new Error("ID del centro no disponible.");
      await updateCenter(centerId, formData);
      alert(`Centro "${formData.name}" actualizado con éxito.`);
      navigate("/admin/centers");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Ocurrió un error inesperado al actualizar el centro.");
    } finally {
      setIsSaving(false);
      setIsConfirmationOpen(false);
    }
  };

  const handleOpenDeleteModal = () => setIsDeleteModalOpen(true);

  const handleDeleteSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (!centerId) throw new Error("ID del centro no disponible.");
      await deleteCenter(centerId);
      alert(`Centro "${formData.name}" eliminado con éxito.`);
      navigate("/admin/centers");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Ocurrió un error inesperado al eliminar el centro.");
    } finally {
      setIsSaving(false);
      setIsDeleteModalOpen(false);
    }
  };

  const hasChanges = !deepEqual(formData, originalData);

  if (isLoading) {
    return <Box sx={{ p: 3 }}>Cargando datos del centro...</Box>;
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 900, mx: "auto", p: 3 }}>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Editar Centro: {formData.name}
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ "& > div": { mb: 3 } }}>
        {activeStep === 0 && <StepGeneral value={formData} onChange={handleChange} ref={step1Ref} />}
        {activeStep === 1 && <StepInmueble value={formData} onChange={handleChange} ref={step2Ref} />}
        {activeStep === 2 && <StepEvaluacion value={formData} onChange={handleChange} ref={step3Ref} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3, gap: 2 }}>
        <Button disabled={activeStep === 0 || isSaving} onClick={handleBack} variant="outlined" color="secondary">
          Atrás
        </Button>
        <div>
          <Button
            variant="contained"
            color="error"
            onClick={handleOpenDeleteModal}
            disabled={isSaving}
            sx={{ mr: 2 }}
          >
            Eliminar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={activeStep === steps.length - 1 ? handleConfirmUpdate : handleNext}
            disabled={isSaving || (activeStep === steps.length - 1 && !hasChanges)}
          >
            {activeStep === steps.length - 1 ? "Guardar Cambios" : "Siguiente"}
          </Button>
        </div>
      </Box>

      {isConfirmationOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Confirmar Actualización</h2>
            <p>¿Estás seguro de que deseas guardar los cambios para este centro?</p>
            <div className="modal-actions">
              <Button onClick={handleUpdateSubmit} variant="contained" color="primary" disabled={isSaving}>
                Sí, guardar
              </Button>
              <Button onClick={handleCancelSubmit} variant="outlined" color="secondary" disabled={isSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro de que deseas eliminar este centro? Esta acción es irreversible y eliminará todos los datos
              relacionados.
            </p>
            <div className="modal-actions">
              <Button onClick={handleDeleteSubmit} variant="contained" color="primary" disabled={isSaving}>
                Sí, eliminar
              </Button>
              <Button onClick={handleCancelSubmit} variant="outlined" color="secondary" disabled={isSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};

export default CenterEditPage;
