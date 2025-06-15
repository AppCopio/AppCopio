// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx'; // <-- IMPORTA

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* <-- ENVUELVE TU APP AQUÍ */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);