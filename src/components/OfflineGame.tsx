import React, { useState, useEffect, useRef } from "react";
import { WifiOff, Rocket, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflineGame() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Game State
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("devos_offline_highscore") || "0", 10));
  const [isGameOver, setIsGameOver] = useState(false);
  
  // Physics State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game constants
  const GRAVITY = 0.6;
  const JUMP_STRENGTH = -10;
  const GAME_SPEED = 5;
  
  const dino = useRef({ y: 150, velocity: 0, width: 40, height: 40, isJumping: false });
  const obstacles = useRef<{ x: number; y: number; width: number; height: number; passed: boolean }[]>([]);
  const scoreRef = useRef(0);
  const frameCount = useRef(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      resetGame();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const resetGame = () => {
    dino.current = { y: 150, velocity: 0, width: 40, height: 40, isJumping: false };
    obstacles.current = [];
    scoreRef.current = 0;
    frameCount.current = 0;
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(false);
  };

  const jump = () => {
    if (isGameOver) {
      resetGame();
      setIsPlaying(true);
      return;
    }
    
    if (!isPlaying) {
      setIsPlaying(true);
    }

    if (!dino.current.isJumping) {
      dino.current.velocity = JUMP_STRENGTH;
      dino.current.isJumping = true;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        if (isOffline) {
          e.preventDefault();
          jump();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOffline, isPlaying, isGameOver]);

  const updateGame = () => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Gravity
    dino.current.velocity += GRAVITY;
    dino.current.y += dino.current.velocity;

    // Ground collision
    const groundY = canvas.height - 20;
    if (dino.current.y + dino.current.height >= groundY) {
      dino.current.y = groundY - dino.current.height;
      dino.current.velocity = 0;
      dino.current.isJumping = false;
    }

    // Spawn obstacles
    frameCount.current++;
    if (frameCount.current % 90 === 0) {
      // Random obstacle height
      const height = Math.random() * 40 + 30;
      obstacles.current.push({
        x: canvas.width,
        y: groundY - height,
        width: 30,
        height,
        passed: false
      });
    }

    // Move & Draw Obstacles
    ctx.fillStyle = "#ef4444"; // Red for bugs
    for (let i = obstacles.current.length - 1; i >= 0; i--) {
      const obs = obstacles.current[i];
      obs.x -= GAME_SPEED;

      // Draw obstacle
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      
      // Collision Detection
      const d = dino.current;
      if (
        d.x! < obs.x + obs.width &&
        d.x! + d.width > obs.x &&
        d.y < obs.y + obs.height &&
        d.y + d.height > obs.y
      ) {
        setIsGameOver(true);
        if (scoreRef.current > highScore) {
          setHighScore(scoreRef.current);
          localStorage.setItem("devos_offline_highscore", scoreRef.current.toString());
        }
      }

      // Score update
      if (obs.x + obs.width < d.x! && !obs.passed) {
        obs.passed = true;
        scoreRef.current += 10;
        setScore(scoreRef.current);
      }

      // Remove off-screen obstacles
      if (obs.x + obs.width < 0) {
        obstacles.current.splice(i, 1);
      }
    }

    // Draw Ground
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, groundY, canvas.width, 20);

    // Draw Dino (Rocket)
    dino.current.x = 50; // Fixed horizontal position
    ctx.fillStyle = "#3b82f6"; // Blue rocket
    ctx.beginPath();
    ctx.moveTo(d.x! + d.width / 2, d.y); // top tip
    ctx.lineTo(d.x! + d.width, d.y + d.height); // bottom right
    ctx.lineTo(d.x!, d.y + d.height); // bottom left
    ctx.fill();

    requestRef.current = requestAnimationFrame(updateGame);
  };

  useEffect(() => {
    if (isPlaying && !isGameOver) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isGameOver]);

  if (!isOffline) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-base/95 backdrop-blur-md flex flex-col items-center justify-center font-mono overflow-hidden"
      >
        <div className="absolute top-10 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <WifiOff className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">You're Offline</h1>
          <p className="text-white/50 max-w-md text-center">
            We lost connection to the DevOS servers. Don't worry, your work is saved locally.
          </p>
        </div>

        <div className="mt-20 w-full max-w-3xl flex flex-col items-center">
          <div className="flex w-full justify-between px-4 mb-4 text-white/70 font-bold">
            <div className="text-2xl">HI {highScore.toString().padStart(5, '0')}</div>
            <div className="text-2xl">{score.toString().padStart(5, '0')}</div>
          </div>
          
          <div className="relative w-full h-[300px] border-2 border-white/10 rounded-2xl bg-[#0f172a] overflow-hidden shadow-2xl" onClick={jump}>
            <canvas 
              ref={canvasRef}
              width={768}
              height={300}
              className="w-full h-full cursor-pointer"
            />
            
            {!isPlaying && !isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Rocket className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
                <p className="text-white font-bold text-xl bg-black/50 px-6 py-2 rounded-full backdrop-blur-sm">
                  Press SPACE to launch
                </p>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-3xl font-black text-white mb-2 tracking-widest">CRASHED</h2>
                <p className="text-white/80 font-bold bg-white/10 px-6 py-2 rounded-full mb-6">
                  Watch out for the bugs!
                </p>
                <p className="text-white font-bold animate-pulse text-lg">
                  Press SPACE to restart
                </p>
              </div>
            )}
          </div>
          
          <p className="mt-6 text-white/40 text-sm">
            Waiting for network to reconnect...
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
