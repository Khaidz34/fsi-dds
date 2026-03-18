/**
 * Fusion Slice Game Component - Integrated into FSI DDS
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, 
  Heart, 
  Trophy, 
  Play, 
  RotateCcw,
  Zap,
  Flame,
  Home
} from 'lucide-react';

// --- Types ---
interface Sliceable {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  emoji: string;
  isBomb: boolean;
  isSliced: boolean;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

// --- Constants ---
const FOOD_ITEMS = [
  { emoji: '🥖', name: 'Bánh Mì', color: '#fde68a', isBomb: false },
  { emoji: '🍣', name: 'Sushi', color: '#f87171', isBomb: false },
  { emoji: '🍜', name: 'Phở/Ramen', color: '#fef3c7', isBomb: false },
  { emoji: '🍤', name: 'Tempura', color: '#fb923c', isBomb: false },
  { emoji: '🌯', name: 'Spring Roll', color: '#86efac', isBomb: false },
  { emoji: '🍵', name: 'Matcha', color: '#166534', isBomb: false },
  { emoji: '☕', name: 'Coffee', color: '#451a03', isBomb: false },
  { emoji: '🍙', name: 'Onigiri', color: '#f8fafc', isBomb: false },
  { emoji: '💣', name: 'Bomb', color: '#000000', isBomb: true },
];

const GRAVITY = 0.015;
const TRAIL_MAX_AGE = 150;

export const FusionSliceGame: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [showBoom, setShowBoom] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useRef<Sliceable[]>([]);
  const particles = useRef<Particle[]>([]);
  const trail = useRef<TrailPoint[]>([]);
  const nextId = useRef(0);
  const lastTime = useRef(0);
  const spawnTimer = useRef(0);
  const isDragging = useRef(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const shakeIntensity = useRef(0);
  const flashOpacity = useRef(0);
  const canvasSize = useRef({ width: 0, height: 0 });

  // Game logic (same as original)
  const resetGame = () => {
    setScore(0);
    setLives(3);
    flashOpacity.current = 0;
    setShowBoom(false);
    items.current = [];
    particles.current = [];
    trail.current = [];
    setGameState('PLAYING');
  };

  const createParticles = (x: number, y: number, color: string, count = 15, speed = 12) => {
    if (particles.current.length > 150) return;
    
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        life: 1.0,
        color,
        size: 3 + Math.random() * 5,
      });
    }
  };

  const triggerExplosion = (x: number, y: number) => {
    shakeIntensity.current = 30;
    flashOpacity.current = 0.8;
    setShowBoom(true);
    setTimeout(() => setShowBoom(false), 1000);
    
    createParticles(x, y, '#ff4500', 30, 25);
    createParticles(x, y, '#ffcc00', 20, 20);
    createParticles(x, y, '#000000', 20, 15);
  };

  const spawnItem = (width: number, height: number) => {
    const isBomb = Math.random() < 0.15;
    const food = isBomb 
      ? FOOD_ITEMS[FOOD_ITEMS.length - 1] 
      : FOOD_ITEMS[Math.floor(Math.random() * (FOOD_ITEMS.length - 1))];

    const difficulty = 1 + (score / 1000);
    const x = Math.random() * (width - 60) + 30;
    const vx = (Math.random() - 0.5) * 2 * difficulty; 
    const vy = -(Math.random() * 2 + 5) * difficulty;

    items.current.push({
      id: nextId.current++,
      x,
      y: height + 50,
      vx,
      vy,
      radius: 45,
      emoji: food.emoji,
      isBomb: food.isBomb,
      isSliced: false,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      color: food.color,
    });
  };

  const checkSlice = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    items.current.forEach(item => {
      if (item.isSliced) return;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthSq = dx * dx + dy * dy;
      if (lengthSq === 0) return;

      let t = ((item.x - p1.x) * dx + (item.y - p1.y) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));

      const closestX = p1.x + t * dx;
      const closestY = p1.y + t * dy;
      const distSq = (item.x - closestX) ** 2 + (item.y - closestY) ** 2;

      if (distSq < item.radius ** 2) {
        item.isSliced = true;
        if (item.isBomb) {
          setLives(l => {
            if (l <= 1) setGameState('GAMEOVER');
            return Math.max(0, l - 1);
          });
          triggerExplosion(item.x, item.y);
        } else {
          setScore(s => s + 10);
          createParticles(item.x, item.y, item.color, 20);
        }
      }
    });
  };

  // Canvas and game loop setup (same as original)
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasSize.current = { width: clientWidth, height: clientHeight };
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Game loop (complete implementation)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animationId: number;

    const update = (time: number) => {
      const deltaTime = Math.min(time - lastTime.current, 32);
      lastTime.current = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d'); 
      if (!ctx) return;

      const { width, height } = canvasSize.current;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Apply Shake
      if (shakeIntensity.current > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shakeIntensity.current, (Math.random() - 0.5) * shakeIntensity.current);
        shakeIntensity.current *= 0.85;
        if (shakeIntensity.current < 0.1) shakeIntensity.current = 0;
      }

      // Update Flash
      if (flashOpacity.current > 0) {
        flashOpacity.current = Math.max(0, flashOpacity.current - 0.04);
      }

      // Spawn Logic
      spawnTimer.current += deltaTime;
      const spawnRate = Math.max(400, 800 - (score / 100) * 50);
      if (spawnTimer.current > spawnRate) {
        const count = Math.floor(Math.random() * 3) + 2;
        for(let i=0; i<count; i++) spawnItem(width, height);
        spawnTimer.current = 0;
      }

      // Update Trail
      const now = Date.now();
      trail.current = trail.current.filter(p => now - p.time < TRAIL_MAX_AGE);
      if (isDragging.current) {
        trail.current.push({ x: mousePos.current.x, y: mousePos.current.y, time: now });
        if (trail.current.length > 1) {
          const p1 = trail.current[trail.current.length - 2];
          const p2 = trail.current[trail.current.length - 1];
          checkSlice(p1, p2);
        }
      }

      // Draw Trail
      if (trail.current.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#60a5fa';
        
        ctx.moveTo(trail.current[0].x, trail.current[0].y);
        for (let i = 1; i < trail.current.length; i++) {
          ctx.lineTo(trail.current[i].x, trail.current[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Update & Draw Items
      for (let i = items.current.length - 1; i >= 0; i--) {
        const item = items.current[i];
        item.x += item.vx;
        item.y += item.vy;
        item.vy += GRAVITY;
        item.rotation += item.rotationSpeed;

        if (item.y > height + 100) {
          if (!item.isSliced && !item.isBomb) {
            setLives(l => {
              if (l <= 1) setGameState('GAMEOVER');
              return Math.max(0, l - 1);
            });
          }
          items.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);
        ctx.font = `${item.radius * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (item.isSliced) {
          ctx.globalAlpha = 0.8;
          ctx.save();
          ctx.translate(-10, 0);
          ctx.fillText(item.emoji, 0, 0);
          ctx.restore();
          ctx.save();
          ctx.translate(10, 0);
          ctx.fillText(item.emoji, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(item.emoji, 0, 0);
        }
        ctx.restore();
      }

      // Update & Draw Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.02;
        if (p.life <= 0) {
          particles.current.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Draw Flash
      if (flashOpacity.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity.current})`;
        ctx.fillRect(0, 0, width, height);
      }

      if (shakeIntensity.current > 0) {
        ctx.restore();
      }

      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, score]);

  // Input handlers (complete implementation)
  useEffect(() => {
    const handleStart = (x: number, y: number) => {
      isDragging.current = true;
      mousePos.current = { x, y };
      trail.current = [{ x, y, time: Date.now() }];
    };

    const handleMove = (x: number, y: number) => {
      if (isDragging.current) {
        mousePos.current = { x, y };
      }
    };

    const handleEnd = () => {
      isDragging.current = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        handleStart(e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        handleMove(e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    const onMouseUp = handleEnd;

    const onTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        handleStart(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        handleMove(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      handleEnd();
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd, { passive: false });

      return () => {
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
      };
    }
  }, []);

  // High score management
  useEffect(() => {
    const saved = localStorage.getItem('fusion_slice_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('fusion_slice_highscore', score.toString());
    }
  }, [score, highScore]);

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <Sword size={24} className="text-orange-500" />
          <h1 className="text-xl font-black text-white">FUSION SLICE</h1>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
            Viet-Nippon Blade
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white transition-colors"
          >
            <Home size={16} />
            <span className="text-sm font-bold">Về FSI DDS</span>
          </button>
        )}
      </div>

      {/* Game Container */}
      <div 
        ref={containerRef}
        className="flex-1 bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-900 overflow-hidden font-sans select-none touch-none relative"
      >
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
          <div className="text-[30vh] font-black text-white rotate-90">FUSION</div>
        </div>

        {/* Canvas Game Layer */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

        {/* UI Overlay */}
        <div className="absolute top-0 left-0 w-full p-6 flex flex-col gap-4 pointer-events-none z-30">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <Trophy className="text-yellow-400" size={20} />
              <span className="text-2xl font-black text-white">{score}</span>
            </div>
            <div className="flex gap-1.5 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: i < lives ? [1, 1.2, 1] : 0.8,
                    opacity: i < lives ? 1 : 0.2
                  }}
                >
                  <Heart className={i < lives ? "text-red-500 fill-current" : "text-slate-600"} size={20} />
                </motion.div>
              ))}
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Best Score: {highScore}</span>
        </div>

        {/* Game Screens */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-800 via-purple-800 to-rose-800 p-8 text-center"
            >
              <motion.div 
                initial={{ y: 50 }} animate={{ y: 0 }}
                className="mb-12 relative z-10"
              >
                <h1 className="text-6xl font-black text-white tracking-tighter leading-none">
                  FUSION<br/>
                  <span className="text-orange-500 text-7xl">SLICE</span>
                </h1>
                <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-[10px] mt-4">Viet-Nippon Blade</p>
              </motion.div>

              <button
                onClick={resetGame}
                className="group relative bg-white text-black px-12 py-6 rounded-full font-black text-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 overflow-hidden z-10"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Play fill="currentColor" size={32} />
                  PLAY NOW
                </span>
              </button>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-rose-900/95 backdrop-blur-md p-8 text-center text-white"
            >
              <h2 className="text-5xl font-black mb-8 tracking-tighter italic uppercase">Blade Broken</h2>
              
              <div className="bg-white/10 backdrop-blur-xl p-10 rounded-[3rem] mb-10 border-2 border-white/20 w-full max-w-md shadow-2xl">
                <p className="text-red-300 text-[10px] font-black uppercase tracking-widest mb-2">Final Score</p>
                <p className="text-7xl font-black">{score}</p>
                <p className="text-red-400 text-[10px] mt-4 font-bold">Best: {highScore}</p>
              </div>

              <button
                onClick={resetGame}
                className="bg-white text-red-950 px-12 py-6 rounded-full font-black text-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
              >
                <RotateCcw size={32} />
                RETRY
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOOM Feedback */}
        <AnimatePresence>
          {showBoom && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.5, 1], rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <span className="text-7xl font-black text-orange-500 drop-shadow-[0_0_30px_rgba(255,69,0,0.8)] italic">
                BOOM!
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};