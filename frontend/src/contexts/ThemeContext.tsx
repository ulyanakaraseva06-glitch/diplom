import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme, cyberTheme } from '../theme';
import { HeartsBackground, CracksBackground } from '../components/BackgroundPatterns';
import { TetrisBackground } from '../components/TetrisBackground';

type ThemeType = 'light' | 'dark' | 'cyber';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  currentTheme: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('app-theme') as ThemeType;
    return saved || 'cyber';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
  }, [theme]);

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
        return <TetrisBackground />;
      default:
        return null;
    }
  };

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