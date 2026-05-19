import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme, cyberTheme } from '../theme';
import { HeartsBackground, CracksBackground } from '../components/BackgroundPatterns';
import NeonGridOnlyBackground from '../components/NeonGridOnlyBackground';
import { useAuth } from './AuthContext';

type ThemeType = 'light' | 'dark' | 'cyber';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  currentTheme: any;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [theme, setThemeState] = useState<ThemeType>('cyber');
  const [loading, setLoading] = useState(true);

  // Загрузка темы из БД при авторизации
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setThemeState('cyber');
      setLoading(false);
      return;
    }

    const fetchTheme = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/client/theme', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setThemeState(data.theme as ThemeType);
        }
      } catch (err) {
        console.error('Failed to fetch theme:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();
  }, [isAuthenticated, token]);

  // Сохранение темы в БД при изменении
  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    
    if (!isAuthenticated || !token) return;
    
    try {
      await fetch('http://localhost:8080/api/client/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const getTheme = () => {
    switch (theme) {
      case 'light':
        return lightTheme;
      case 'dark':
        return darkTheme;
      case 'cyber':
        return cyberTheme;
      default:
        return cyberTheme;
    }
  };

  const renderBackground = () => {
    switch (theme) {
      case 'light':
        return <HeartsBackground />;
      case 'dark':
        return <CracksBackground />;
      case 'cyber':
        return <NeonGridOnlyBackground  />;
      default:
        return null;
    }
  };

  if (loading) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme: getTheme() }}>
      <ThemeProvider theme={getTheme()}>
        <CssBaseline />
        {renderBackground()}
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProviderWrapper');
  }
  return context;
};