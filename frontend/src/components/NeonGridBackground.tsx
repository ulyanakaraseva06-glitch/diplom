import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

const NeonGridBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Установка размера canvas на весь экран
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Рисование сетки с перспективой
    const drawGrid = (time: number) => {
      if (!ctx || !canvas) return;
      
      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 1.3; // Горизонт чуть выше центра
      
      // Полупрозрачный чёрный фон (для эффекта затухания)
      ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
      ctx.fillRect(0, 0, w, h);
      
      // Количество линий
      const lineCount = 25;
      const pulse = Math.sin(time) * 0.3 + 0.7; // Пульсация 0.4-1.0
      
      // Рисуем горизонтальные линии (уходящие в перспективу)
      for (let i = 1; i <= lineCount; i++) {
        const t = i / lineCount; // 0-1, где 0 - горизонт, 1 - передний план
        const y = centerY + t * (h - centerY);
        const alpha = (1 - t) * 0.4 * pulse;
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.lineWidth = 1 + (1 - t) * 2;
        ctx.stroke();
      }
      
      // Рисуем вертикальные линии (расходящиеся от центра)
      const verticalLineCount = 31;
      for (let i = -verticalLineCount; i <= verticalLineCount; i++) {
        const t = Math.abs(i) / verticalLineCount;
        const x = centerX + i * (w / verticalLineCount / 1.5);
        const alpha = (1 - t) * 0.35 * pulse;
        
        ctx.beginPath();
        ctx.moveTo(x, centerY);
        ctx.lineTo(x, h);
        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.lineWidth = 1 + (1 - t) * 1.5;
        ctx.stroke();
      }
      
      // Рисуем дополнительные линии, создающие "дорогу"
      for (let i = 1; i <= 5; i++) {
        const offset = i * 40;
        const alpha = 0.2 * (1 - i / 6) * pulse;
        
        ctx.beginPath();
        ctx.moveTo(centerX - offset, centerY);
        ctx.lineTo(centerX - offset * 3, h);
        ctx.strokeStyle = `rgba(255, 0, 68, ${alpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX + offset, centerY);
        ctx.lineTo(centerX + offset * 3, h);
        ctx.strokeStyle = `rgba(255, 0, 68, ${alpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // Добавляем точку схода (яркое свечение в центре горизонта)
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(centerX - 50, centerY - 50, 100, 100);
      
      // Рисуем пульсирующие точки на пересечениях (эффект "далёких огней")
      for (let i = 2; i <= 8; i++) {
        const t = i / 10;
        const y = centerY + t * (h - centerY);
        for (let j = -4; j <= 4; j++) {
          const x = centerX + j * (w / 20) * t;
          const alpha = (1 - t) * 0.6 * pulse;
          if (alpha > 0.05) {
            ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      // Добавляем красные акценты (как в киберспортивной эстетике)
      for (let i = 1; i <= 3; i++) {
        const alpha = 0.15 * pulse * (1 - i / 4);
        ctx.beginPath();
        ctx.moveTo(centerX - i * 80, centerY + i * 30);
        ctx.lineTo(centerX + i * 80, centerY + i * 30);
        ctx.strokeStyle = `rgba(255, 0, 68, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };
    
    // Анимационный цикл
    const animate = () => {
      timeRef.current += 0.03;
      drawGrid(timeRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
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
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      
      {/* Верхний градиент (небо в кибергороде) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '30%',
          background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.03) 0%, rgba(0, 212, 255, 0) 100%)',
          pointerEvents: 'none',
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
        NEON CITY
      </Box>
    </Box>
  );
};

export default NeonGridBackground;