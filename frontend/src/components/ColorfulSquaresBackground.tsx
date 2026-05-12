import React, { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';

interface Square {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
}

const ColorfulSquaresBackground: React.FC = () => {
  const [squares, setSquares] = useState<Square[]>([]);
  const [nextId, setNextId] = useState(0);

  const colors = [
    '#00d4ff', // неоновый голубой
    '#ff0044', // неоновый красный
    '#00ff88', // неоновый зелёный
    '#ffaa00', // неоновый оранжевый
    '#9c27b0', // фиолетовый
    '#e91e63', // розовый
    '#4caf50', // изумрудный
    '#2196f3', // синий
    '#ff6b6b', // коралловый
    '#ff1493', // горячий розовый
  ];

  // Создание нового квадрата
  const createSquare = useCallback(() => {
    const size = Math.random() * 40 + 15; // от 15 до 55 пикселей
    const color = colors[Math.floor(Math.random() * colors.length)];
    const speedX = (Math.random() - 0.5) * 0.5; // от -0.25 до 0.25
    const speedY = (Math.random() - 0.5) * 0.5;
    const rotationSpeed = (Math.random() - 0.5) * 1.5;
    
    return {
      id: nextId,
      x: Math.random() * 90 + 5, // от 5% до 95%
      y: Math.random() * 90 + 5,
      size: size,
      color: color,
      opacity: 0,
      speedX: speedX,
      speedY: speedY,
      rotation: Math.random() * 360,
      rotationSpeed: rotationSpeed,
    };
  }, [nextId, colors]);

  // Добавление новых квадратов
  useEffect(() => {
    const addInterval = setInterval(() => {
      setSquares(prev => {
        const filtered = prev.filter(sq => sq.opacity > 0);
        const newSquare = createSquare();
        
        setTimeout(() => {
          setSquares(current => 
            current.map(sq => 
              sq.id === newSquare.id ? { ...sq, opacity: 0.3 + Math.random() * 0.5 } : sq
            )
          );
        }, 50);
        
        return [...filtered, newSquare];
      });
      setNextId(prev => prev + 1);
    }, 800);

    return () => clearInterval(addInterval);
  }, [createSquare]);

  // Анимация движения и исчезновения
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      setSquares(prev => 
        prev
          .map(square => {
            let newX = square.x + square.speedX;
            let newY = square.y + square.speedY;
            let newOpacity = square.opacity;
            let newRotation = square.rotation + square.rotationSpeed;
            
            if (square.opacity > 0) {
              newOpacity -= 0.001;
            }
            
            if (newX < 0 || newX > 100) {
              square.speedX = -square.speedX;
              newX = square.x + square.speedX;
            }
            if (newY < 0 || newY > 100) {
              square.speedY = -square.speedY;
              newY = square.y + square.speedY;
            }
            
            return {
              ...square,
              x: newX,
              y: newY,
              opacity: newOpacity,
              rotation: newRotation % 360,
            };
          })
          .filter(square => square.opacity > 0.01)
      );
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

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
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at center, #0a0a0f 0%, #000000 100%)',
        }}
      />
      
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(2px 2px at 20px 30px, #fff, rgba(0,0,0,0))',
          backgroundSize: '50px 50px',
          backgroundRepeat: 'repeat',
          opacity: 0.3,
        }}
      />

      {squares.map(square => (
        <Box
          key={square.id}
          sx={{
            position: 'absolute',
            left: `${square.x}%`,
            top: `${square.y}%`,
            width: `${square.size}px`,
            height: `${square.size}px`,
            backgroundColor: square.color,
            opacity: square.opacity,
            transform: `translate(-50%, -50%) rotate(${square.rotation}deg)`,
            transition: 'opacity 0.1s linear',
            boxShadow: `0 0 ${square.size / 2}px ${square.color}`,
            borderRadius: '4px',
          }}
        />
      ))}

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
        }}
      >
        CYBERSPACE
      </Box>
    </Box>
  );
};

export default ColorfulSquaresBackground;