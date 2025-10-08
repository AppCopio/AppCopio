import * as React from "react";
import { BrowserRouter } from "react-router-dom"; 
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/offline/OfflineContext";
import { theme } from "@/theme"; 

type Props = { children: React.ReactNode };

export function AppProviders({ children }: Props) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <OfflineProvider>
          <AuthProvider>
            <BrowserRouter>{children}</BrowserRouter>
          </AuthProvider>
        </OfflineProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
