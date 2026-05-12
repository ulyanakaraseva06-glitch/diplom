import React from 'react';
import { Box } from '@mui/material';

// Компонент с сердечками для темы "Пикми"
export const HeartsBackground: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {[...Array(30)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            color: `rgba(233, 30, 99, ${Math.random() * 0.1 + 0.05})`,
            fontSize: `${Math.random() * 30 + 15}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `floatHeart ${Math.random() * 5 + 3}s infinite ease-in-out`,
            animationDelay: `${Math.random() * 5}s`,
            '@keyframes floatHeart': {
              '0%': {
                transform: 'translateY(0px) rotate(0deg)',
                opacity: 0,
              },
              '50%': {
                transform: `translateY(-${Math.random() * 30 + 20}px) rotate(${Math.random() * 20}deg)`,
                opacity: 0.7,
              },
              '100%': {
                transform: 'translateY(-60px) rotate(0deg)',
                opacity: 0,
              },
            },
          }}
        >
          ❤️
        </Box>
      ))}
    </Box>
  );
};

// Компонент с трещинами для темы "Bad boy"
export const CracksBackground: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.15,
        }}
        viewBox="0 0 1000 800"
        preserveAspectRatio="none"
      >
        {/* Трещина 1 */}
        <path
          d="M100,0 L150,80 L120,150 L200,200 L180,300 L250,350 L230,450 L300,500"
          stroke="#ef5350"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Трещина 2 */}
        <path
          d="M700,0 L680,100 L750,150 L720,250 L800,300 L780,400 L850,450 L820,550"
          stroke="#ef5350"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Трещина 3 */}
        <path
          d="M400,0 L420,60 L380,120 L450,180 L430,260 L500,320"
          stroke="#ef5350"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Трещина 4 */}
        <path
          d="M150,400 L200,450 L180,500 L250,550 L230,620 L300,680 L280,750"
          stroke="#ef5350"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Трещина 5 */}
        <path
          d="M600,400 L650,460 L630,530 L700,590 L680,660 L750,720"
          stroke="#ef5350"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Трещина 6 (горизонтальная) */}
        <path
          d="M0,250 L80,240 L150,260 L250,230 L350,250"
          stroke="#ef5350"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Трещина 7 */}
        <path
          d="M850,200 L900,280 L870,350 L950,400"
          stroke="#ef5350"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Красные искры */}
        <circle cx="100" cy="0" r="4" fill="#ef5350" opacity="0.6">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="700" cy="0" r="3" fill="#ef5350" opacity="0.6">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="400" cy="0" r="3.5" fill="#ef5350" opacity="0.6">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="850" cy="200" r="2.5" fill="#ef5350" opacity="0.6">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="150" cy="400" r="3" fill="#ef5350" opacity="0.6">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </Box>
  );
};