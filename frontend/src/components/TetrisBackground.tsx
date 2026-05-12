import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

interface FallingBlock {
  id: number;
  x: number;
  y: number;
  shape: number[][];
  color: string;
  speed: number;
}

const TETRIS_COLORS = [
  '#00d4ff', // I (голубой)
  '#ff0044', // O (красный)
  '#00ff88', // S (зелёный)
  '#ffaa00', // Z (оранжевый)
  '#9c27b0', // J (фиолетовый)
  '#e91e63', // L (розовый)
  '#4caf50', // T (зелёный)
];

const TETRIS_SHAPES = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
  [[1, 0, 0], [1, 1, 1]], // J
  [[0, 0, 1], [1, 1, 1]], // L
  [[0, 1, 0], [1, 1, 1]], // T
];

export const TetrisBackground: React.FC = () => {
  const [blocks, setBlocks] = useState<FallingBlock[]>([]);
  const [nextId, setNextId] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      // Добавляем новый блок сверху
      const randomShape = TETRIS_SHAPES[Math.floor(Math.random() * TETRIS_SHAPES.length)];
      const randomColor = TETRIS_COLORS[Math.floor(Math.random() * TETRIS_COLORS.length)];
      const randomX = Math.random() * 80 + 10; // от 10% до 90% ширины экрана
      
      setBlocks(prev => [...prev, {
        id: nextId,
        x: randomX,
        y: -20,
        shape: randomShape,
        color: randomColor,
        speed: Math.random() * 1.5 + 0.8,
      }]);
      setNextId(prev => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [nextId]);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(function animate() {
      setBlocks(prev => 
        prev
          .map(block => ({
            ...block,
            y: block.y + block.speed,
          }))
          .filter(block => block.y < 120)
      );
      requestAnimationFrame(animate);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, []);

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
        backgroundColor: '#0a0a0f',
      }}
    >
      {/* Сетка как в тетрисе */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.08,
        }}
      >
        <defs>
          <pattern id="tetrisGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00d4ff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tetrisGrid)" />
      </svg>

      {/* Падающие блоки */}
      {blocks.map(block => (
        <Box
          key={block.id}
          sx={{
            position: 'absolute',
            left: `${block.x}%`,
            top: `${block.y}%`,
            transform: 'translateX(-50%)',
            display: 'inline-block',
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 60 60"
            style={{
              filter: `drop-shadow(0 0 8px ${block.color}) drop-shadow(0 0 4px ${block.color})`,
              animation: 'blockGlow 0.5s ease-in-out infinite alternate',
            }}
          >
            <defs>
              <filter id={`glow-${block.id}`}>
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {block.shape.map((row, i) =>
              row.map((cell, j) =>
                cell === 1 ? (
                  <rect
                    key={`${i}-${j}`}
                    x={j * 15 + 15}
                    y={i * 15 + 15}
                    width="12"
                    height="12"
                    rx="2"
                    fill={block.color}
                    stroke={block.color}
                    strokeWidth="1"
                    opacity="0.85"
                    filter={`url(#glow-${block.id})`}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.6;1;0.6"
                      dur={`${Math.random() * 1 + 0.5}s`}
                      repeatCount="indefinite"
                    />
                  </rect>
                ) : null
              )
            )}
          </svg>
        </Box>
      ))}

      {/* Текст "TETRIS" на фоне */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          fontFamily: '"Orbitron", monospace',
          fontSize: '14px',
          color: '#00d4ff',
          opacity: 0.3,
          letterSpacing: '4px',
        }}
      >
        TETRIS STYLE
      </Box>

      {/* Анимация для свечения */}
      <style>
        {`
          @keyframes blockGlow {
            0% {
              filter: drop-shadow(0 0 2px #00d4ff);
            }
            100% {
              filter: drop-shadow(0 0 12px #00d4ff);
            }
          }
        `}
      </style>
    </Box>
  );
};