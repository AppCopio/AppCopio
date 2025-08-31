// src/pages/CreateCenterPage/steps/StepFotos.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { CenterData } from '../../types/center';

interface StepFotosProps {
    value: CenterData;
    onChange: (name: keyof CenterData, value: any) => void;
}

const StepFotos = React.forwardRef<any, StepFotosProps>(({ value, onChange }, ref) => {
    const validate = () => true;
    React.useImperativeHandle(ref, () => ({ validate }));
    return (
        <Box>
            <Typography variant="h6">Paso 4: Fotos del Centro</Typography>
            <Typography>Esta sección se implementará más adelante.</Typography>
        </Box>
    );
});

export default StepFotos;