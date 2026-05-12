declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    startVelocity?: number;
    colors?: string[];
    decay?: number;
    ticks?: number;
    angle?: number;
    drift?: number;
    gravity?: number;
    shapes?: ('square' | 'circle' | 'star')[];
  }

  function confetti(options?: Options): Promise<null>;
  export default confetti;
}