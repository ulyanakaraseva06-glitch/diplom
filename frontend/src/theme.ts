import { createTheme } from '@mui/material/styles';
// ==================== СВЕТЛАЯ ТЕМА (Пикми) ====================
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#9c27b0',
      light: '#ce93d8',
      dark: '#6a1b9a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e91e63',
      light: '#f06292',
      dark: '#c2185b',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#9c27b0',
    },
    success: {
      main: '#4caf50',
    },
    background: {
      default: '#fce4ec',
      paper: '#ffffff',
    },
    text: {
      primary: '#4a148c',
      secondary: '#6a1b9a',
    },
  },
  typography: {
    fontFamily: '"Nunito", "Quicksand", "Comic Neue", "Roboto", sans-serif',
    h4: {
      fontWeight: 600,
      background: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)',
          boxShadow: '0 2px 10px rgba(156, 39, 176, 0.3)',
          borderRadius: '0 0 20px 20px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '24px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
          borderRadius: '24px',
          '&:hover': {
            background: 'linear-gradient(135deg, #ab47bc 0%, #9c27b0 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',
          borderRadius: '24px',
          '&:hover': {
            background: 'linear-gradient(135deg, #f06292 0%, #e91e63 100%)',
          },
        },
        outlined: {
          borderColor: '#9c27b0',
          color: '#9c27b0',
          borderRadius: '24px',
          '&:hover': {
            borderColor: '#ce93d8',
            backgroundColor: 'rgba(156, 39, 176, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 20px rgba(156, 39, 176, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#f3e5f5',
          fontWeight: 600,
          color: '#4a148c',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)',
        },
      },
    },
  },
});
// ==================== ТЁМНАЯ ТЕМА (тёмно-серая с красным) ====================
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ef5350',
      light: '#ff867c',
      dark: '#b61827',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#d32f2f',
      light: '#ff6659',
      dark: '#9a0007',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#ef5350',
    },
    success: {
      main: '#4caf50',
    },
    background: {
      default: '#1a1a1a',
      paper: '#2d2d2d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#ef5350',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          borderBottom: '2px solid #ef5350',
          boxShadow: '0 2px 10px rgba(239, 83, 80, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
        containedPrimary: {
          backgroundColor: '#ef5350',
          '&:hover': {
            backgroundColor: '#ff867c',
          },
        },
        containedSecondary: {
          backgroundColor: '#d32f2f',
          '&:hover': {
            backgroundColor: '#ff6659',
          },
        },
        outlined: {
          borderColor: '#ef5350',
          color: '#ef5350',
          '&:hover': {
            borderColor: '#ff867c',
            backgroundColor: 'rgba(239, 83, 80, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d2d2d',
          borderRadius: '12px',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 20px rgba(239, 83, 80, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d2d2d',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#3d3d3d',
          fontWeight: 600,
          color: '#ef5350',
          borderBottom: '2px solid #ef5350',
        },
        root: {
          borderBottom: '1px solid #3d3d3d',
          color: '#e0e0e0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
        },
        colorSuccess: {
          backgroundColor: '#1b5e20',
          color: '#a5d6a7',
        },
        colorWarning: {
          backgroundColor: '#e65100',
          color: '#ffe0b2',
        },
        colorError: {
          backgroundColor: '#b71c1c',
          color: '#ef9a9a',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ef5350',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#3d3d3d',
            },
            '&:hover fieldset': {
              borderColor: '#ef5350',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ef5350',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#b0b0b0',
            '&.Mui-focused': {
              color: '#ef5350',
            },
          },
        },
      },
    },
  },
});

// ==================== КИБЕРСПОРТИВНАЯ ТЕМА (неоновая) ====================
export const cyberTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
      light: '#5eeaff',
      dark: '#0099cc',
      contrastText: '#000000',
    },
    secondary: {
      main: '#ff0044',
      light: '#ff4d7a',
      dark: '#cc0036',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ff0044',
    },
    warning: {
      main: '#ffaa00',
    },
    info: {
      main: '#00d4ff',
    },
    success: {
      main: '#00ff88',
    },
    background: {
      default: '#0a0a0f',
      paper: '#111118',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a0a0b0',
    },
  },
  typography: {
    fontFamily: '"Orbitron", "Roboto Mono", monospace',
    h4: {
      fontWeight: 800,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      background: 'linear-gradient(135deg, #00d4ff 0%, #ff0044 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'none',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(10, 10, 15, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '2px solid #00d4ff',
          boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
          boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5eeaff 0%, #00d4ff 100%)',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.7)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #ff0044 0%, #cc0036 100%)',
          boxShadow: '0 0 10px rgba(255, 0, 68, 0.5)',
          '&:hover': {
            background: 'linear-gradient(135deg, #ff4d7a 0%, #ff0044 100%)',
            boxShadow: '0 0 20px rgba(255, 0, 68, 0.7)',
          },
        },
        outlined: {
          borderColor: '#00d4ff',
          color: '#00d4ff',
          '&:hover': {
            borderColor: '#5eeaff',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #111118 0%, #0d0d14 100%)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '12px',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            border: '1px solid #00d4ff',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: 'rgba(0, 212, 255, 0.08)',
          fontWeight: 700,
          letterSpacing: '0.05em',
          borderBottom: '2px solid #00d4ff',
          color: '#00d4ff',
        },
        root: {
          borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
          color: '#ffffff',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 600,
        },
        colorSuccess: {
          background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
          color: '#000000',
        },
        colorWarning: {
          background: 'linear-gradient(135deg, #ffaa00 0%, #ff8800 100%)',
          color: '#000000',
        },
        colorError: {
          background: 'linear-gradient(135deg, #ff0044 0%, #cc0036 100%)',
          color: '#ffffff',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          border: '2px solid #00d4ff',
          background: 'linear-gradient(135deg, #00d4ff 0%, #ff0044 100%)',
        },
      },
    },
  },
});