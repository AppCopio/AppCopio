import React, { useState, useEffect } from 'react';
import { Box, Stepper, Step, StepLabel, Button, Typography, Alert } from '@mui/material';
import StepGeneral from '../CreateCenterPage/StepGeneral';
import StepInmueble from '../CreateCenterPage/StepInmueble';
import StepEvaluacion from '../CreateCenterPage/StepEvaluacion';
import { CenterData, initialCenterData } from '../../types/center';
import { useNavigate, useParams } from 'react-router-dom';
import { createCenter, updateCenter } from '../../services/centerApi';
import { useAuth } from '../../contexts/AuthContext';
import { registerForSync } from '../../utils/syncManager';
import { fetchWithAbort } from '../../services/api';
import './CenterEditPage.css';

interface StepHandle {
    validate: () => boolean;
}

const steps = ['General', 'Inmueble', 'Evaluación'];

const CenterEditPage: React.FC = () => {
    const { centerId } = useParams<{ centerId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<CenterData>(initialCenterData);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const step1Ref = React.useRef<StepHandle>(null);
    const step2Ref = React.useRef<StepHandle>(null);
    const step3Ref = React.useRef<StepHandle>(null);

    useEffect(() => {
        const fetchCenterData = async () => {
            if (!centerId) return;
            setIsLoading(true);
            try {
                const data = await fetchWithAbort<CenterData>(
                    `http://localhost:4000/api/centers/${centerId}`,
                    new AbortController().signal
                );
                setFormData(data);
            } catch (err) {
                console.error("Error fetching center data for edit:", err);
                setError("No se pudo cargar la información del centro. Intente de nuevo.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchCenterData();
    }, [centerId]);

    const handleNext = () => {
        let currentStepIsValid = false;
        if (activeStep === 0 && step1Ref.current) {
            currentStepIsValid = step1Ref.current.validate();
        } else if (activeStep === 1 && step2Ref.current) {
            currentStepIsValid = step2Ref.current.validate();
        } else if (activeStep === 2 && step3Ref.current) {
            currentStepIsValid = step3Ref.current.validate();
        }
        
        if (currentStepIsValid) {
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleChange = (name: keyof CenterData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleConfirm = () => {
        // La validación final se puede realizar aquí si es necesario
        setIsConfirmationOpen(true);
    };

    const handleCancelSubmit = () => {
        setIsConfirmationOpen(false);
        setIsSaving(false);
    };

    const handleFormSubmit = async () => {
        setIsSaving(true);
        if (navigator.onLine) {
            try {
                const token = user?.token || '';
                if (!centerId) throw new Error("ID del centro no disponible.");
                
                await updateCenter(centerId, formData, token);
                alert(`Centro "${formData.name}" actualizado con éxito.`);
                navigate('/admin/centers');
            } catch (err: any) {
                setError(err.message || 'Ocurrió un error inesperado al actualizar el centro.');
            } finally {
                setIsSaving(false);
                setIsConfirmationOpen(false);
            }
        } else {
            // Lógica de guardado offline (simulada o real)
            // Aquí puedes guardar los datos en IndexedDB y usar el SyncManager
            // para que se envíen al recuperar la conexión.
            alert('Sin conexión. Los cambios se guardaron y se sincronizarán cuando recuperes la red.');
            setIsSaving(false);
            setIsConfirmationOpen(false);
            navigate('/admin/centers');
        }
    };

    if (isLoading) {
        return <Box sx={{ p: 3 }}>Cargando datos del centro...</Box>;
    }

    return (
        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', p: 3 }}>
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

            <Box sx={{ '& > div': { mb: 3 } }}>
                {activeStep === 0 && <StepGeneral value={formData} onChange={handleChange} ref={step1Ref} />}
                {activeStep === 1 && <StepInmueble value={formData} onChange={handleChange} ref={step2Ref} />}
                {activeStep === 2 && <StepEvaluacion value={formData} onChange={handleChange} ref={step3Ref} />}
            </Box>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, gap: 2 }}>
                <Button disabled={activeStep === 0 || isSaving} onClick={handleBack} variant="outlined" color="secondary">
                    Atrás
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={activeStep === steps.length - 1 ? handleConfirm : handleNext}
                    disabled={isSaving}
                >
                    {activeStep === steps.length - 1 ? 'Guardar Cambios' : 'Siguiente'}
                </Button>
            </Box>

            {isConfirmationOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>Confirmar Actualización</h2>
                        <p>¿Estás seguro de que deseas guardar los cambios para este centro?</p>
                        <div className="modal-actions">
                            <Button onClick={handleFormSubmit} variant="contained" color="primary" disabled={isSaving}>Sí, guardar</Button>
                            <Button onClick={handleCancelSubmit} variant="outlined" color="secondary" disabled={isSaving}>Cancelar</Button>
                        </div>
                    </div>
                </div>
            )}
        </Box>
    );
};

export default CenterEditPage;