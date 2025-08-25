// theme.ts
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  components: {
    MuiButton: {
      defaultProps: { variant: "text" }, // <- todos text por defecto
    },
  },
});
