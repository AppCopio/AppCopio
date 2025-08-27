// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx'; // <-- IMPORTA

import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <AuthProvider> {/* <-- ENVUELVE TU APP AQUÍ */}
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
     </StyledEngineProvider>
  </React.StrictMode>,
);