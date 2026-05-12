import { createTheme } from '@mui/material/styles';

// Киберспортивная тёмная тема
export const cyberTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff', // неоновый голубой/синий
      light: '#5eeaff',
      dark: '#0099cc',
      contrastText: '#000000',
    },
    secondary: {
      main: '#ff0044', // неоновый красный
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
      main: '#00ff88', // неоновый зелёный для успеха
    },
    background: {
      default: '#0a0a0f', // очень тёмный с синеватым оттенком
      paper: '#111118', // чуть светлее для карточек
    },
    text: {
      primary: '#ffffff',
      secondary: '#a0a0b0',
    },
  },
  typography: {
    fontFamily: '"Orbitron", "Roboto Mono", "Courier New", monospace',
    h4: {
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      background: 'linear-gradient(135deg, #00d4ff 0%, #ff0044 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '0.05em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0.05em',
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
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #111118 0%, #0a0a0f 100%)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
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
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
          transition: 'all 0.2s',
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
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
          color: '#ffffff',
        },
        head: {
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          fontWeight: 700,
          letterSpacing: '0.05em',
          borderBottom: '2px solid #00d4ff',
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
        colorInfo: {
          background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
          color: '#000000',
        },
        colorError: {
          background: 'linear-gradient(135deg, #ff0044 0%, #cc0036 100%)',
          color: '#ffffff',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          overflow: 'hidden',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 212, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: '#00d4ff',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00d4ff',
              boxShadow: '0 0 5px rgba(0, 212, 255, 0.5)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#a0a0b0',
            '&.Mui-focused': {
              color: '#00d4ff',
            },
          },
          '& .MuiInputBase-input': {
            color: '#ffffff',
          },
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
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 212, 255, 0.3)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          border: '1px solid',
        },
        standardSuccess: {
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          borderColor: '#00ff88',
          color: '#00ff88',
        },
        standardError: {
          backgroundColor: 'rgba(255, 0, 68, 0.1)',
          borderColor: '#ff0044',
          color: '#ff0044',
        },
        standardInfo: {
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderColor: '#00d4ff',
          color: '#00d4ff',
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 170, 0, 0.1)',
          borderColor: '#ffaa00',
          color: '#ffaa00',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: '#ff0044',
          color: '#ffffff',
          boxShadow: '0 0 5px #ff0044',
        },
      },
    },
  },
});