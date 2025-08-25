// src/pages/CenterRegistrationPage.tsx
import React, { useState } from 'react';
import './CenterRegistrationPage.css';

const CenterRegistrationPage: React.FC = () => {
    const [formData, setFormData] = useState({
        // Sección 1: Detalles del inmueble y la organización
        organizacion_nombre: '',
        organizacion_direccion: '',
        organizacion_contacto: '',
        organizacion_cargo: '',
        telefonos_contacto: '',
        fecha_evaluacion: '',
        folio: '',
        fotos_adjuntas: '',
        // Sección 2: Caracterización del inmueble
        tipo_inmueble: '',
        estado_conservacion: '',
        materialidad_muros: '',
        materialidad_pisos: '',
        materialidad_techo: '',
        // Sección 3: Accesos y espacios comunes
        espacio_amplio_10_afectados: false,
        inf_discapacidad: false,
        areas_comunes_accesibles: false,
        espacios_recreacion: false,
        // Y así sucesivamente con todos los campos del catastro...
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Lógica de validación y envío
    };

    return (
        <div className="registration-container">
            <h1>Formulario de Registro de Centros</h1>
            <form onSubmit={handleSubmit}>
                {/* Sección 1: Detalles del inmueble y la organización */}
                <div className="form-section">
                    <h2>I. Detalles del inmueble y la organización</h2>
                    <label>Nombre de la Organización:</label>
                    <input type="text" name="organizacion_nombre" value={formData.organizacion_nombre} onChange={handleChange} required />
                    
                    {/* ... otros campos de la sección ... */}
                </div>

                {/* Sección 2: Caracterización del inmueble */}
                <div className="form-section">
                    <h2>II. Caracterización del inmueble</h2>
                    <label>Tipo de Inmueble:</label>
                    <select name="tipo_inmueble" value={formData.tipo_inmueble} onChange={handleChange} required>
                        <option value="">Seleccione...</option>
                        <option value="conteiner">Contenedor</option>
                        <option value="edificio">Edificio</option>
                        <option value="sede">Sede</option>
                        {/* ... otras opciones ... */}
                    </select>

                    {/* ... otros campos de la sección ... */}
                </div>
                
                {/* Repite para todas las secciones del formulario */}

                <button type="submit">Enviar Formulario</button>
            </form>
        </div>
    );
};

export default CenterRegistrationPage;