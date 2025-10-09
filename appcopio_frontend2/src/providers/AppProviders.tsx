import * as React from "react";
import { BrowserRouter } from "react-router-dom"; 
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/offline/OfflineContext";
import { OfflineNotificationProvider } from "@/offline/OfflineNotifications";
import { theme } from "@/theme"; 
type Props = { children: React.ReactNode };

export function AppProviders({ children }: Props) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <OfflineProvider>
          <OfflineNotificationProvider>
            <AuthProvider>
              <BrowserRouter>{children}</BrowserRouter>
            </AuthProvider>
          </OfflineNotificationProvider>
        </OfflineProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
