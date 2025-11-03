import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from '@/contexts/AuthContext';
import { ActivationProvider } from '@/contexts/ActivationContext';
import { OfflineProvider } from '@/offline/OfflineContext';
import { theme } from '@/theme';

// 1. IMPORTAR PROVIDERS FALTANTES
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfflineNotificationProvider } from '@/offline/OfflineNotifications';

// 2. CREAR EL CLIENTE DE QUERY
const queryClient = new QueryClient();

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <React.StrictMode>
      {/* 3. AÑADIR QUERY CLIENT PROVIDER */}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <BrowserRouter>
            <OfflineProvider>
              {/* 4. AÑADIR OFFLINE NOTIFICATION PROVIDER */}
              <OfflineNotificationProvider>
                <AuthProvider>
                  {/* Hacemos centerId opcional en ActivationProvider si es necesario */}
                  <ActivationProvider>
                    {children}
                  </ActivationProvider>
                </AuthProvider>
              </OfflineNotificationProvider>
            </OfflineProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};