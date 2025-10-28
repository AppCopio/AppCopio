// theme.ts
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import "@fontsource-variable/montserrat";
// import { alpha } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypographyVariants {
    titleHero: React.CSSProperties;
    titlePage: React.CSSProperties;
    subtitle: React.CSSProperties;
    heading: React.CSSProperties;
    subheading: React.CSSProperties;
    bodyBase: React.CSSProperties;
    bodyStrong: React.CSSProperties;
    bodyEmphasis: React.CSSProperties;
    bodyLink: React.CSSProperties;
    bodySmall: React.CSSProperties;
    bodySmallStrong: React.CSSProperties;
    bodyCode: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    titleHero?: React.CSSProperties;
    titlePage?: React.CSSProperties;
    subtitle?: React.CSSProperties;
    heading?: React.CSSProperties;
    subheading?: React.CSSProperties;
    bodyBase?: React.CSSProperties;
    bodyStrong?: React.CSSProperties;
    bodyEmphasis?: React.CSSProperties;
    bodyLink?: React.CSSProperties;
    bodySmall?: React.CSSProperties;
    bodySmallStrong?: React.CSSProperties;
    bodyCode?: React.CSSProperties;
  }
}
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    titleHero: true;
    titlePage: true;
    subtitle: true;
    heading: true;
    subheading: true;
    bodyBase: true;
    bodyStrong: true;
    bodyEmphasis: true;
    bodyLink: true;
    bodySmall: true;
    bodySmallStrong: true;
    bodyCode: true;
  }
}
declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    brand: true; softGray: true; outlineGray: true; textBare: true;
  }
}

const toRem = (px: number) => `${px / 16}rem`;

// Tema global
export const theme = createTheme({
  // Craeción de tipografías personalizadas
  typography: {
    fontFamily:
      '"Inter Variable","Inter",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol",sans-serif',

    // ===== TÍTULOS (Montserrat) =====
    titleHero: {
      fontFamily: '"Montserrat Variable","Montserrat",sans-serif',
      fontWeight: 700,
      fontSize: toRem(48),
      lineHeight: 1.2,
      letterSpacing: "-0.01em",
    },
    titlePage: {
      fontFamily: '"Montserrat Variable","Montserrat",sans-serif',
      fontWeight: 700,
      fontSize: toRem(40),
      lineHeight: 1.2,
      letterSpacing: "-0.01em",
    },
    subtitle: {
      fontFamily: '"Montserrat Variable","Montserrat",sans-serif',
      fontWeight: 600,
      fontSize: toRem(32),
      lineHeight: 1.2,
    },
    heading: {
      fontFamily: '"Montserrat Variable","Montserrat",sans-serif',
      fontWeight: 600,
      fontSize: toRem(24),
      lineHeight: 1.2,
    },
    subheading: {
      fontFamily: '"Montserrat Variable","Montserrat",sans-serif',
      fontWeight: 600,
      fontSize: toRem(20),
      lineHeight: 1.2,
    },

    // ===== CUERPO (Inter) =====
    bodyBase: {
      fontSize: toRem(16),
      lineHeight: 1.4,
      fontWeight: 400,
    },
    bodyStrong: {
      fontSize: toRem(16),
      lineHeight: 1.4,
      fontWeight: 600,
    },
    bodyEmphasis: {
      fontSize: toRem(16),
      lineHeight: 1.4,
      fontStyle: "italic",
      fontWeight: 400,
    },
    bodyLink: {
      fontSize: toRem(16),
      lineHeight: 1.4,
      fontWeight: 500,
      textDecoration: "underline",
      textUnderlineOffset: "0.2em",
    },
    bodySmall: {
      fontSize: toRem(14),
      lineHeight: 1.4,
      fontWeight: 400,
    },
    bodySmallStrong: {
      fontSize: toRem(14),
      lineHeight: 1.4,
      fontWeight: 600,
    },
    bodyCode: {
      fontSize: toRem(16),
      lineHeight: 1.0,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },

    // Mantener también las variantes MUI clásicas (borrar después de la estandarización)
    /* h1: { fontFamily: '"Montserrat Variable","Montserrat",sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Montserrat Variable","Montserrat",sans-serif', fontWeight: 700 },
    button: {
      fontFamily: '"Montserrat Variable","Montserrat",sans-serif',
      fontWeight: 600,
      fontSize: "1rem",      // 16px
      textTransform: "none",
    }, */
  },

  
  // ======== Estilos personalizados base para componentes MUI ========
  components: {

    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        /* Utilidad opcional para quitar márgenes cuando uses <div>/<span> */
        ".ds-reset": { margin: 0 },

        /* Títulos (Montserrat) */
        ".ds-titleHero":       { ...theme.typography.titleHero,       margin: 0 },
        ".ds-titlePage":       { ...theme.typography.titlePage,       margin: 0 },
        ".ds-subtitle":        { ...theme.typography.subtitle,        margin: 0 },
        ".ds-heading":         { ...theme.typography.heading,         margin: 0 },
        ".ds-subheading":      { ...theme.typography.subheading,      margin: 0 },

        /* Cuerpo (Inter) */
        ".ds-bodyBase":        { ...theme.typography.bodyBase,        margin: 0 },
        ".ds-bodyStrong":      { ...theme.typography.bodyStrong,      margin: 0 },
        ".ds-bodyEmphasis":    { ...theme.typography.bodyEmphasis,    margin: 0 },
        ".ds-bodySmall":       { ...theme.typography.bodySmall,       margin: 0 },
        ".ds-bodySmallStrong": { ...theme.typography.bodySmallStrong, margin: 0 },

        /* Enlaces y código */
        ".ds-bodyLink":        { ...theme.typography.bodyLink, color: "inherit" },
        ".ds-bodyCode":        { ...theme.typography.bodyCode },

        /* Azúcar para bloques de código */
        "code.ds-bodyCode": {
          padding: "0.125rem 0.25rem",
          borderRadius: 4,
          backgroundColor: "rgba(0,0,0,0.04)",
        },
        "pre.ds-bodyCode": {
          padding: "8px 12px",
          borderRadius: 6,
          backgroundColor: "rgba(0,0,0,0.04)",
          overflow: "auto",
        },
      }),
    },

    MuiTypography:{
      defaultProps: {
        variantMapping: {
          titleHero: "h1",
          titlePage: "h1",
          subtitle: "h2",
          heading: "h3",
          subheading: "h4",
          bodyBase: "p",
          bodyStrong: "p",
          bodyEmphasis: "p",
          bodyLink: "a",
          bodySmall: "p",
          bodySmallStrong: "p",
          bodyCode: "code",
        },
      },
    },

    MuiButton: {
      defaultProps: { variant: "brand", disableElevation: true},
      styleOverrides: {
        root: ({ theme }) => ({
          // Estilo default
          ...theme.typography.button,
          color: "var(--btn-text, #ffffff)",
          backgroundColor: "var(--btn-bg, #262626)",
          border: "0.5px solid var(--btn-border, transparent)",
          

          borderRadius: 10,
          boxShadow: "none",
          gap: theme.spacing(1),
          transition: "background-color .15s, border-color .15s, box-shadow .15s",
          textTransform: "none",
          
          "& .MuiButton-startIcon, & .MuiButton-endIcon": {
            margin: 0,
            "& > *:nth-of-type(1)": { fontSize: 18 },
            color: "inherit",
          },
          "&:hover": {
            backgroundColor: "var(--btn-bg-hover, #1f1f1f)",
            borderColor: "var(--btn-border-hover, transparent)",
            color: "var(--btn-text-hover, var(--btn-text, #ffffff))",
          },
          "&.Mui-focusVisible": { boxShadow: "0 0 0 3px rgba(0,0,0,0.10)" },
          "&:active": { backgroundColor: "#171717" },
          "&.Mui-disabled": {
            color: "#9CA3AF", borderColor: "#E5E7EB", backgroundColor: "#F3F4F6",
          },
        }),

        // Sizes definidos
        sizeSmall: {
          fontSize: "0.875rem", // 14
          lineHeight: 1.25,
          paddingInline: 14,
          paddingBlock: 6,
          minHeight: 32,
          height: 32,
          borderRadius: 9,
        },
        sizeMedium: {
          fontSize: "1rem",
          lineHeight: 1.25,
          paddingInline: 18,
          paddingBlock: 8,
          minHeight: 36,
          height: 36,
          borderRadius: 10,
        },
        sizeLarge: {
          fontSize: "1.125rem", // 18
          lineHeight: 1.25,
          paddingInline: 22,
          paddingBlock: 10,
          minHeight: 40,
          height: 40,
          borderRadius: 12,
        },
      },

      // Variantes visuales
      variants: [
        { props: { variant: "brand" }, style: {
          "--btn-bg": "#262626",  "--btn-bg-hover": "#666666ff",
          "--btn-border": "#262626", "--btn-border-hover": "#262626",
          "--btn-text": "#ffffff", "--btn-text-hover": "#ffffff",
        }},
        { props: { variant: "softGray" }, style: {
          "--btn-bg": "#E5E7EB", "--btn-bg-hover": "#DADDE3",
          "--btn-border": "#D1D5DB", "--btn-border-hover": "#CBD5E1",
          "--btn-text": "#111111", "--btn-text-hover": "#111111",
        }},
        { props: { variant: "outlineGray" }, style: {
          "--btn-bg": "transparent", "--btn-bg-hover": "#d4d4d4ff",
          "--btn-border": "#D1D5DB", "--btn-border-hover": "#94A3B8", 
          "--btn-text": "#111111", "--btn-text-hover": "#111111",
        }},
        { props: { variant: "textBare" }, style: {
          "--btn-bg": "transparent", "--btn-bg-hover": "#d4d4d4ff",
          "--btn-border": "transparent", "--btn-border-hover": "transparent",
          "--btn-text": "#004ca3ff", "--btn-text-hover": "#001a38ff",
        }},
      ],
    },
  },
});


