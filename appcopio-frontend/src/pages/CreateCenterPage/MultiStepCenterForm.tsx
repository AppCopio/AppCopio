import React, { useState, useRef } from 'react';
import { Box, Stepper, Step, StepLabel, Button, Typography, Alert } from '@mui/material';
import StepGeneral from './StepGeneral';
import StepInmueble from './StepInmueble';
import StepEvaluacion from './StepEvaluacion';
//import StepFotos from './StepFotos';
import { CenterData, initialCenterData } from '../../types/center';
import { useNavigate } from 'react-router-dom';
import { createCenter } from '../../services/centerApi';
import { useAuth } from '../../contexts/AuthContext';
import { registerForSync } from '../../utils/syncManager';

interface StepHandle {
    validate: () => boolean;
}

const steps = ['General', 'Inmueble', 'Evaluación', 'Fotos'];

const MultiStepCenterForm: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<CenterData>(initialCenterData);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const step1Ref = useRef<StepHandle>(null);
    const step2Ref = useRef<StepHandle>(null);
    const step3Ref = useRef<StepHandle>(null);

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
                const newCenter = await createCenter(formData, token);
                alert(`Centro "${newCenter.name}" creado con éxito.`);
                navigate('/admin/centros');
            } catch (err: any) {
                setError(err.message || 'Ocurrió un error inesperado al registrar el centro.');
            } finally {
                setIsSaving(false);
                setIsConfirmationOpen(false);
            }
        } else {
            localStorage.setItem('pendingCenterRegistrationForm', JSON.stringify(formData));
            registerForSync('sync-centers');
            alert('Sin conexión. El formulario se guardó y se sincronizará cuando recuperes la red.');
            setIsSaving(false);
            setIsConfirmationOpen(false);
            navigate('/admin/centros');
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', p: 3 }}>
            <Typography variant="h4" component="h1" align="center" gutterBottom>
                Registro de Nuevo Centro
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
                {activeStep === 3 && (
                    <Box>
                        <Typography variant="h6">4. Subir Fotos del Centro</Typography>
                        <Typography>Esta sección se implementará más adelante.</Typography>
                    </Box>
                )}
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
                    {activeStep === steps.length - 1 ? 'Enviar y Confirmar' : 'Siguiente'}
                </Button>
            </Box>

            {isConfirmationOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>Confirmar Registro</h2>
                        <p>¿Estás seguro de que deseas enviar este formulario y registrar el nuevo centro?</p>
                        <div className="modal-actions">
                            <Button onClick={handleFormSubmit} variant="contained" color="primary" disabled={isSaving}>Sí, registrar</Button>
                            <Button onClick={handleCancelSubmit} variant="outlined" color="secondary" disabled={isSaving}>Cancelar</Button>
                        </div>
                    </div>
                </div>
            )}
        </Box>
    );
};

export default MultiStepCenterForm;