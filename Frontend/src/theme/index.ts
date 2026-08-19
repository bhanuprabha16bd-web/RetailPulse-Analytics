import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0F172A',
      light: '#334155',
      dark: '#020617',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0284C7',
      light: '#38BDF8',
      dark: '#0369A1',
      contrastText: '#ffffff',
    },
    error: { main: '#DC2626' },
    warning: { main: '#D97706' },
    info: { main: '#2563EB' },
    success: { main: '#059669' },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.25rem', letterSpacing: '-0.025em', color: '#0F172A' },
    h2: { fontWeight: 600, fontSize: '1.875rem', letterSpacing: '-0.025em', color: '#0F172A' },
    h3: { fontWeight: 600, fontSize: '1.5rem', letterSpacing: '-0.015em', color: '#0F172A' },
    h4: { fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.125rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    subtitle1: { fontSize: '1rem', fontWeight: 500, color: '#334155' },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, color: '#475569' },
    body1: { fontSize: '1rem', lineHeight: 1.6, color: '#334155' },
    body2: { fontSize: '0.875rem', lineHeight: 1.57, color: '#475569' },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          padding: '8px 20px',
          boxShadow: 'none',
          transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out',
          '&:hover': {
            boxShadow: 'none',
            backgroundColor: '#334155',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': { borderWidth: '1px', backgroundColor: '#F1F5F9' },
        }
      },
      variants: [
        {
          props: { variant: 'contained', color: 'secondary' },
          style: { '&:hover': { backgroundColor: '#0369A1' } },
        },
      ],
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #E2E8F0',
        },
        elevation0: { boxShadow: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #E2E8F0',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
            '& fieldset': { borderColor: '#CBD5E1' },
            '&:hover fieldset': { borderColor: '#94A3B8' },
            '&.Mui-focused fieldset': {
              borderWidth: '1px',
              borderColor: '#0284C7',
              boxShadow: '0 0 0 2px rgba(2, 132, 199, 0.15)',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          borderRight: 'none',
          '& .MuiListItemIcon-root': { color: '#94A3B8' },
          '& .MuiListItemText-primary': { color: '#F8FAFC' },
          '& .MuiDivider-root': { borderColor: '#1E293B' }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          borderBottom: '1px solid #E2E8F0',
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: '#475569',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
        },
        body: {
          color: '#334155',
          borderBottom: '1px solid #F1F5F9',
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: '4px', fontWeight: 500 }
      }
    }
  },
});

export default theme;
