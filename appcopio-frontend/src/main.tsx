// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';

import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme";

// --- INICIO DE CAMBIOS PARA PWA ---
// 1. Importa la función para registrar el Service Worker.
//    Este módulo es proporcionado automáticamente por el plugin de Vite (vite-plugin-pwa).
import { registerSW } from 'virtual:pwa-register';

// 2. Llama a la función para registrar nuestro sw.ts en el navegador.
//    Esto le indica al navegador que comience a usar nuestro Service Worker
//    para interceptar peticiones y manejar el caché.
registerSW({ immediate: true });
// --- FIN DE CAMBIOS PARA PWA ---


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);