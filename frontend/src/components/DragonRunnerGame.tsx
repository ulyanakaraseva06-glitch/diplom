import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';

type GamePhase = 'idle' | 'playing' | 'over';

const W = 640;
const H = 140;
const GROUND_Y = 118;
const DRAGON_X = 48;
const DRAGON_W = 36;
const DRAGON_H = 32;
const GRAVITY = 0.55;
const JUMP_V = -9.5;
const BASE_SPEED = 4.2;

type Obstacle = { x: number; w: number; h: number };

function drawDragon(ctx: CanvasRenderingContext2D, y: number, frame: number) {
  const bob = Math.sin(frame * 0.25) * 2;
  const top = y + bob;

  ctx.fillStyle = '#00d4ff';
  ctx.strokeStyle = '#0099aa';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(DRAGON_X + 8, top + DRAGON_H);
  ctx.lineTo(DRAGON_X + DRAGON_W, top + 14);
  ctx.lineTo(DRAGON_X + DRAGON_W - 4, top + 4);
  ctx.lineTo(DRAGON_X + 20, top);
  ctx.lineTo(DRAGON_X + 4, top + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff0044';
  ctx.beginPath();
  ctx.arc(DRAGON_X + DRAGON_W - 6, top + 10, 3, 0, Math.PI * 2);
  ctx.fill();

  const wing = frame % 20 < 10;
  ctx.fillStyle = 'rgba(138, 43, 226, 0.7)';
  ctx.beginPath();
  if (wing) {
    ctx.moveTo(DRAGON_X + 14, top + 12);
    ctx.lineTo(DRAGON_X - 4, top + 4);
    ctx.lineTo(DRAGON_X + 12, top + 20);
  } else {
    ctx.moveTo(DRAGON_X + 14, top + 16);
    ctx.lineTo(DRAGON_X - 2, top + 22);
    ctx.lineTo(DRAGON_X + 12, top + 24);
  }
  ctx.closePath();
  ctx.fill();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  dragonY: number,
  obstacles: Obstacle[],
  frame: number,
  score: number
) {
  ctx.clearRect(0, 0, W, H);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0e17');
  g.addColorStop(1, '#121a2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(W, GROUND_Y);
  ctx.stroke();

  obstacles.forEach((o) => {
    ctx.fillStyle = '#ff0044';
    ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
    ctx.fillStyle = 'rgba(255, 0, 68, 0.4)';
    ctx.fillRect(o.x + 2, GROUND_Y - o.h - 6, o.w - 4, 6);
  });
  drawDragon(ctx, dragonY, frame);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`Счёт: ${score}`, 8, 18);
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

interface DragonRunnerGameProps {
  onGameEnd?: (score: number) => void;
}

const DragonRunnerGame: React.FC<DragonRunnerGameProps> = ({ onGameEnd }) => {
  const onGameEndRef = useRef(onGameEnd);
  onGameEndRef.current = onGameEnd;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<GamePhase>('idle');
  const dragonYRef = useRef(GROUND_Y - DRAGON_H);
  const vyRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(BASE_SPEED);
  const frameRef = useRef(0);
  const scoreRef = useRef(0);
  const spawnTimerRef = useRef(0);

  const [phase, setPhase] = useState<GamePhase>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const resetGame = useCallback(() => {
    dragonYRef.current = GROUND_Y - DRAGON_H;
    vyRef.current = 0;
    obstaclesRef.current = [];
    speedRef.current = BASE_SPEED;
    frameRef.current = 0;
    scoreRef.current = 0;
    spawnTimerRef.current = 0;
    setScore(0);
  }, []);

  const startGame = useCallback(() => {
    if (phaseRef.current === 'playing') return;
    resetGame();
    phaseRef.current = 'playing';
    setPhase('playing');
    containerRef.current?.focus();
  }, [resetGame]);

  const endGame = useCallback(() => {
    phaseRef.current = 'over';
    setPhase('over');
    const finalScore = scoreRef.current;
    setBest((b) => Math.max(b, finalScore));
    onGameEndRef.current?.(finalScore);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    if (dragonYRef.current >= GROUND_Y - DRAGON_H - 1) {
      vyRef.current = JUMP_V;
    }
  }, []);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || phaseRef.current !== 'playing') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameRef.current += 1;
    scoreRef.current = Math.floor(frameRef.current / 6);
    if (frameRef.current % 6 === 0) {
      setScore(scoreRef.current);
    }

    vyRef.current += GRAVITY;
    dragonYRef.current += vyRef.current;
    if (dragonYRef.current > GROUND_Y - DRAGON_H) {
      dragonYRef.current = GROUND_Y - DRAGON_H;
      vyRef.current = 0;
    }

    speedRef.current = BASE_SPEED + scoreRef.current * 0.02;
    spawnTimerRef.current -= 1;
    if (spawnTimerRef.current <= 0) {
      const h = 22 + Math.floor(Math.random() * 18);
      const w = 14 + Math.floor(Math.random() * 10);
      obstaclesRef.current.push({ x: W + 10, w, h });
      spawnTimerRef.current = 70 + Math.floor(Math.random() * 50) - scoreRef.current * 0.3;
      if (spawnTimerRef.current < 45) spawnTimerRef.current = 45;
    }

    obstaclesRef.current = obstaclesRef.current
      .map((o) => ({ ...o, x: o.x - speedRef.current }))
      .filter((o) => o.x + o.w > -20);

    const pad = 6;
    const dLeft = DRAGON_X + pad;
    const dTop = dragonYRef.current + pad;
    const dW = DRAGON_W - pad * 2;
    const dH = DRAGON_H - pad;

    for (const o of obstaclesRef.current) {
      if (rectsOverlap(dLeft, dTop, dW, dH, o.x + 2, GROUND_Y - o.h, o.w - 4, o.h)) {
        endGame();
        break;
      }
    }

    drawScene(ctx, dragonYRef.current, obstaclesRef.current, frameRef.current, scoreRef.current);

    rafRef.current = requestAnimationFrame(tick);
  }, [endGame]);

  useEffect(() => {
    if (phase !== 'playing') return;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, tick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const paintIdle = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawScene(ctx, GROUND_Y - DRAGON_H, [], frameRef.current, scoreRef.current);
    };

    paintIdle();
    const ro = new ResizeObserver(paintIdle);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (document.activeElement !== containerRef.current) return;
      e.preventDefault();
      if (phaseRef.current === 'playing') {
        jump();
      } else {
        startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump, startGame]);

  const handlePointerDown = (e: React.MouseEvent) => {
    if (phaseRef.current === 'playing') return;
    e.preventDefault();
    startGame();
  };

  const overlay =
    phase === 'idle'
      ? 'Кликните в карточку, чтобы начать · Пробел — прыжок'
      : phase === 'over'
        ? `Столкновение! Счёт: ${score}. Кликните, чтобы сыграть снова`
        : 'Пробел — прыжок';

  return (
    <Paper
      ref={containerRef}
      tabIndex={0}
      onClick={handlePointerDown}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: phase === 'playing' ? 'default' : 'pointer',
        outline: 'none',
        '&:focus-visible': {
          borderColor: 'primary.main',
          boxShadow: '0 0 0 2px rgba(0, 212, 255, 0.25)',
        },
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        {overlay}
        {best > 0 ? ` · Рекорд: ${best}` : ''}
      </Typography>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 720,
          mx: 'auto',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#0a0e17',
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${W} / ${H}` }}
        />
        {phase !== 'playing' && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: phase === 'over' ? 'rgba(0,0,0,0.35)' : 'transparent',
              pointerEvents: 'none',
            }}
          >
            {phase === 'over' && (
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, textShadow: '0 1px 4px #000' }}>
                Игра окончена
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default DragonRunnerGame;
