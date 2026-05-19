import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavBar from '../components/NavBar';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SecurityIcon from '@mui/icons-material/Security';
import WhatshotIcon from '@mui/icons-material/Whatshot';

const Themes: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeContext();

  const handleBack = () => {
    navigate(-1);
  };

  const themes = [
    {
    id: 'light',
    name: 'Пикми',
    icon: <FavoriteIcon sx={{ fontSize: 48, color: '#f48fb1' }} />,
    description: 'Для самых милых 💕',
    previewBg: 'linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)',
    previewColor: '#4a148c',
    fontFamily: '"Nunito", "Quicksand", "Comic Neue", sans-serif',
    emoji: '🌸',
    },
    {
      id: 'dark',
      name: 'Bad boy',
      icon: <SecurityIcon sx={{ fontSize: 48, color: '#ef5350' }} />,
      description: 'Для самых серьезных 🔥',
      previewBg: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
      previewColor: '#ef5350',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      emoji: '⚡',
    },
    {
      id: 'cyber',
      name: 'Cyber',
      icon: <WhatshotIcon sx={{ fontSize: 48, color: '#00d4ff' }} />,
      description: 'Для киберспортсменов 🎮',
      previewBg: 'linear-gradient(135deg, #0a0a0f 0%, #111118 100%)',
      previewColor: '#00d4ff',
      fontFamily: '"Orbitron", "Roboto Mono", monospace',
      emoji: '⚡',
    },
  ];

  const activeTheme = themes.find(t => t.id === theme);

  return (
    <>
      <NavBar />

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
            Назад
          </Button>
          
          <Typography 
            variant="h4" 
            gutterBottom 
            align="center" 
            sx={{ 
              mb: 1,
              fontFamily: activeTheme?.fontFamily,
            }}
          >
            Выберите тему оформления {activeTheme?.emoji}
          </Typography>
          
          <Typography 
            variant="body1" 
            align="center" 
            sx={{ 
              mb: 5, 
              color: 'text.secondary',
              fontFamily: activeTheme?.fontFamily,
            }}
          >
            Настройте внешний вид платформы под своё настроение
          </Typography>

          <Grid container spacing={3}>
            {themes.map((t) => (
              <Grid size={{ xs: 12, md: 4 }} key={t.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: theme === t.id ? '3px solid' : '1px solid rgba(0,0,0,0.12)',
                    borderColor: theme === t.id 
                      ? (t.id === 'light' ? '#9c27b0' : t.id === 'dark' ? '#ef5350' : '#00d4ff')
                      : 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme === 'light' 
                        ? '0 12px 30px rgba(156, 39, 176, 0.2)' 
                        : theme === 'dark' 
                          ? '0 12px 30px rgba(239, 83, 80, 0.2)' 
                          : '0 12px 30px rgba(0, 212, 255, 0.3)',
                    },
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={() => setTheme(t.id as any)}
                >
                  {theme === t.id && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        bgcolor: t.id === 'light' ? '#9c27b0' : t.id === 'dark' ? '#ef5350' : '#00d4ff',
                        color: '#fff',
                        borderRadius: '20px',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 1,
                      }}
                    >
                      АКТИВНА
                    </Box>
                  )}
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box 
                      sx={{ 
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 80,
                        height: 80,
                        margin: '0 auto',
                        borderRadius: '50%',
                        background: t.previewBg,
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      {t.icon}
                    </Box>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 600,
                        fontFamily: t.fontFamily,
                      }}
                    >
                      {t.name}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        fontFamily: t.fontFamily,
                      }}
                    >
                      {t.description}
                    </Typography>
                    
                    <Box
                      sx={{
                        width: '100%',
                        height: 80,
                        borderRadius: 2,
                        background: t.previewBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        p: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          background: t.id === 'light' ? '#9c27b0' : t.id === 'dark' ? '#ef5350' : '#00d4ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '20px',
                        }}
                      >
                        🎮
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          height: 50,
                          borderRadius: 1.5,
                          background: t.id === 'light' ? '#fff' : t.id === 'dark' ? '#3d3d3d' : '#111118',
                          border: `1px solid ${t.id === 'light' ? '#ce93d8' : t.id === 'dark' ? '#ef5350' : '#00d4ff'}`,
                          display: 'flex',
                          alignItems: 'center',
                          px: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: t.id === 'light' ? '#e91e63' : t.id === 'dark' ? '#ef5350' : '#00d4ff',
                            mr: 1,
                          }}
                        />
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: t.id === 'light' ? '#4a148c' : t.id === 'dark' ? '#ef5350' : '#00d4ff',
                            fontSize: '10px',
                            fontWeight: 500,
                          }}
                        >
                          Текст
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default Themes;
