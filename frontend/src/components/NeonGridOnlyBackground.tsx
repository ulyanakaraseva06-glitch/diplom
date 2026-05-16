import React from 'react';
import { Box } from '@mui/material';

const NeonGridOnlyBackground: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: '#0a0a0f',
      }}
    >
      {/* Тёмный фон */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#0a0a0f',
        }}
      />
      
      {/* Сетка с градиентом от синего к красному */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Градиент для вертикальных линий (слева направо) */}
          <linearGradient id="gradientHorizontal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#9c27b0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff0044" stopOpacity="0.5" />
          </linearGradient>
          
          {/* Градиент для горизонтальных линий (сверху вниз) */}
          <linearGradient id="gradientVertical" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#9c27b0" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ff0044" stopOpacity="0.3" />
          </linearGradient>
          
          {/* Очень мелкая клетка (шаг 2px) */}
          <pattern id="neonGridTiny" width="2" height="2" patternUnits="userSpaceOnUse">
            <line
              x1="2"
              y1="0"
              x2="2"
              y2="2"
              stroke="url(#gradientHorizontal)"
              strokeWidth="0.08"
            />
            <line
              x1="0"
              y1="2"
              x2="2"
              y2="2"
              stroke="url(#gradientVertical)"
              strokeWidth="0.08"
            />
          </pattern>
          
          {/* Мелкая клетка (шаг 6px) */}
          <pattern id="neonGridSmall" width="6" height="6" patternUnits="userSpaceOnUse">
            <line
              x1="6"
              y1="0"
              x2="6"
              y2="6"
              stroke="url(#gradientHorizontal)"
              strokeWidth="0.1"
            />
            <line
              x1="0"
              y1="6"
              x2="6"
              y2="6"
              stroke="url(#gradientVertical)"
              strokeWidth="0.1"
            />
          </pattern>
          
          {/* Средняя клетка (шаг 18px) */}
          <pattern id="neonGridMedium" width="18" height="18" patternUnits="userSpaceOnUse">
            <line
              x1="18"
              y1="0"
              x2="18"
              y2="18"
              stroke="url(#gradientHorizontal)"
              strokeWidth="0.12"
              opacity="0.7"
            />
            <line
              x1="0"
              y1="18"
              x2="18"
              y2="18"
              stroke="url(#gradientVertical)"
              strokeWidth="0.12"
              opacity="0.7"
            />
          </pattern>
          
          {/* Крупная клетка (шаг 54px) */}
          <pattern id="neonGridLarge" width="54" height="54" patternUnits="userSpaceOnUse">
            <line
              x1="54"
              y1="0"
              x2="54"
              y2="54"
              stroke="#00d4ff"
              strokeWidth="0.15"
              opacity="0.25"
            />
            <line
              x1="0"
              y1="54"
              x2="54"
              y2="54"
              stroke="#ff0044"
              strokeWidth="0.15"
              opacity="0.25"
            />
          </pattern>
          
          {/* Центральное свечение */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#9c27b0" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Все слои сетки */}
        <rect width="100" height="100" fill="url(#neonGridTiny)" />
        <rect width="100" height="100" fill="url(#neonGridSmall)" />
        <rect width="100" height="100" fill="url(#neonGridMedium)" />
        <rect width="100" height="100" fill="url(#neonGridLarge)" />
        
        {/* Перекрёстные линии */}
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="url(#gradientHorizontal)"
          strokeWidth="0.2"
          opacity="0.15"
        />
        <line
          x1="50"
          y1="0"
          x2="50"
          y2="100"
          stroke="url(#gradientVertical)"
          strokeWidth="0.2"
          opacity="0.15"
        />
        
        {/* Центральное свечение */}
        <rect width="100" height="100" fill="url(#centerGlow)" />
      </svg>
      
      {/* Неоновое свечение по краям */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #00d4ff, #ff0044, #00d4ff, transparent)',
          opacity: 0.4,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #00d4ff, #ff0044, #00d4ff, transparent)',
          opacity: 0.4,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '1px',
          background: 'linear-gradient(180deg, transparent, #00d4ff, #ff0044, #00d4ff, transparent)',
          opacity: 0.4,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '1px',
          background: 'linear-gradient(180deg, transparent, #00d4ff, #ff0044, #00d4ff, transparent)',
          opacity: 0.4,
        }}
      />
      
      {/* Текст в углу */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          fontFamily: '"Orbitron", monospace',
          fontSize: '10px',
          color: '#00d4ff',
          opacity: 0.2,
          letterSpacing: '2px',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        GRID MODE
      </Box>
    </Box>
  );
};

export default NeonGridOnlyBackground;