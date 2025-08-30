import React from 'react';
import { FormControl, Typography, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { CenterData } from '../../types/center';

const likertOptions = [
    { value: 1, label: 'No existe' },
    { value: 2, label: 'Existe, pero precario' },
    { value: 3, label: 'Estado regular' },
    { value: 4, label: 'Estado bueno' },
    { value: 5, label: 'Excelente' },
];

interface LikertScaleInputProps {
    label: string; 
    name: keyof CenterData; 
    value: number | null; 
    onChange: (name: keyof CenterData, value: number | null) => void;
}

const LikertScaleInput: React.FC<LikertScaleInputProps> = ({ label, name, value, onChange }) => (
    <FormControl component="fieldset" fullWidth margin="normal">
        <Typography variant="subtitle1" component="legend">{label}</Typography>
        <RadioGroup
            row
            name={name}
            value={value !== null ? String(value) : ''}
            onChange={(e) => onChange(name, Number(e.target.value))}
        >
            {likertOptions.map(option => (
                <FormControlLabel
                    key={option.value}
                    value={String(option.value)}
                    control={<Radio />}
                    label={`${option.value}: ${option.label}`}
                    labelPlacement="bottom"
                />
            ))}
        </RadioGroup>
    </FormControl>
);

export default LikertScaleInput;