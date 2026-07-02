import React, { useState, useEffect, useRef } from "react";
import { WifiOff, Keyboard, AlertTriangle, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = [
  "function", "async", "await", "promise", "react", "typescript", "database",
  "component", "tailwind", "backend", "frontend", "interface", "export",
  "import", "default", "return", "console", "window", "document", "object",
  "array", "string", "number", "boolean", "null", "undefined", "class",
  "extends", "constructor", "super", "this", "yield", "debugger", "delete",
  "typeof", "instanceof", "void", "switch", "case", "break", "continue",
  "throw", "try", "catch", "finally", "let", "const", "var", "while", "for",
  "if", "else", "devos", "code", "execute", "build", "compile", "deploy"
];

interface FallingWord {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
}

export default function OfflineGame() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Game State
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("devos_offline_highscore_typing") || "0", 10));
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Mutable refs for physics
  const words = useRef<FallingWord[]>([]);
  const scoreRef = useRef(0);
  const frameCount = useRef(0);
  const inputRef = useRef("");
  const spawnRate = useRef(100);
  const baseSpeed = useRef(0.5);
  const wordIdCounter = useRef(0);

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
    words.current = [];
    scoreRef.current = 0;
    frameCount.current = 0;
    inputRef.current = "";
    spawnRate.current = 100;
    baseSpeed.current = 0.5;
    
    setScore(0);
    setCurrentInput("");
    setIsGameOver(false);
    setIsPlaying(false);
  };

  const startGame = () => {
    resetGame();
    setIsPlaying(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOffline) return;

      if (!isPlaying || isGameOver) {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      // Handle typing
      if (e.key === "Backspace") {
        inputRef.current = inputRef.current.slice(0, -1);
        setCurrentInput(inputRef.current);
      } else if (e.key === "Escape") {
        inputRef.current = "";
        setCurrentInput(inputRef.current);
      } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        inputRef.current += e.key.toLowerCase();
        setCurrentInput(inputRef.current);
        
        // Check for matches
        const matchedIndex = words.current.findIndex(w => w.text === inputRef.current);
        if (matchedIndex !== -1) {
          // Explode word
          words.current.splice(matchedIndex, 1);
          scoreRef.current += 10;
          setScore(scoreRef.current);
          inputRef.current = "";
          setCurrentInput("");
          
          // Increase difficulty slightly
          if (scoreRef.current % 50 === 0) {
            baseSpeed.current += 0.2;
            spawnRate.current = Math.max(30, spawnRate.current - 5);
          }
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

    // Spawn new words
    frameCount.current++;
    if (frameCount.current % spawnRate.current === 0) {
      const text = WORDS[Math.floor(Math.random() * WORDS.length)];
      // calculate text width roughly
      ctx.font = "bold 20px monospace";
      const metrics = ctx.measureText(text);
      const width = metrics.width;
      
      const x = Math.max(10, Math.random() * (canvas.width - width - 20));
      const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"];
      
      words.current.push({
        id: ++wordIdCounter.current,
        text,
        x,
        y: -30,
        speed: baseSpeed.current + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Draw Ground
    const groundY = canvas.height - 40;
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, groundY, canvas.width, 2);

    // Move & Draw Words
    for (let i = words.current.length - 1; i >= 0; i--) {
      const w = words.current[i];
      w.y += w.speed;

      // Check collision with ground
      if (w.y >= groundY) {
        setIsGameOver(true);
        if (scoreRef.current > highScore) {
          setHighScore(scoreRef.current);
          localStorage.setItem("devos_offline_highscore_typing", scoreRef.current.toString());
        }
        break;
      }

      // Draw word
      ctx.font = "bold 20px monospace";
      
      // Check if this word is currently being typed (matches prefix)
      const isTarget = inputRef.current.length > 0 && w.text.startsWith(inputRef.current);
      
      if (isTarget) {
        // Draw typed part
        ctx.fillStyle = "#ffffff";
        ctx.fillText(inputRef.current, w.x, w.y);
        
        // Draw remaining part
        const typedWidth = ctx.measureText(inputRef.current).width;
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.5;
        ctx.fillText(w.text.substring(inputRef.current.length), w.x + typedWidth, w.y);
        ctx.globalAlpha = 1.0;
        
        // Draw indicator under the word
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(w.x, w.y + 5, typedWidth, 2);
      } else {
        ctx.fillStyle = w.color;
        ctx.fillText(w.text, w.x, w.y);
      }
    }

    // Draw current input at the bottom
    if (inputRef.current) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.fillText(inputRef.current, canvas.width / 2, canvas.height - 10);
      ctx.textAlign = "left"; // reset
    }

    if (!isGameOver) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
  };

  useEffect(() => {
    if (isPlaying && !isGameOver) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isGameOver]);

  if (!isOffline) return null; // Don't show anything if online

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
          <p className="text-white/50 max-w-md text-center max-h-[90vh] overflow-y-auto flex flex-col">
            Lost connection to DevOS servers. Test your typing skills while you wait!
          </p>
        </div>

        <div className="mt-20 w-full max-w-4xl flex flex-col items-center max-h-[90vh] overflow-y-auto flex flex-col">
          <div className="flex w-full justify-between px-6 mb-4 text-white/70 font-bold">
            <div className="flex items-center gap-2 text-2xl">
              <Trophy className="w-6 h-6 text-yellow-500" />
              HI {highScore.toString().padStart(5, '0')}
            </div>
            <div className="text-2xl text-blue-400">{score.toString().padStart(5, '0')}</div>
          </div>
          
          <div 
            className="relative w-full h-[400px] border-2 border-white/10 rounded-3xl bg-[#0f172a] overflow-hidden shadow-2xl" 
            onClick={() => !isPlaying && startGame()}
          >
            <canvas 
              ref={canvasRef}
              width={896} // max-w-4xl = 896px
              height={400}
              className="w-full h-full cursor-pointer"
            />
            
            {!isPlaying && !isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Keyboard className="w-20 h-20 text-blue-500 mb-6 animate-pulse" />
                <p className="text-white font-bold text-2xl bg-black/50 px-8 py-3 rounded-2xl backdrop-blur-md border border-white/10">
                  Type words before they crash!
                </p>
                <p className="text-white/50 mt-4 text-sm font-bold">Press SPACE to start</p>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
                <AlertTriangle className="w-20 h-20 text-red-500 mb-4 animate-bounce" />
                <h2 className="text-5xl font-black text-white mb-2 tracking-widest text-shadow-sm">CRASHED</h2>
                <div className="bg-white/10 px-8 py-4 rounded-2xl mb-8 border border-white/20 text-center">
                  <p className="text-white/60 uppercase tracking-widest text-xs font-bold mb-1">Final Score</p>
                  <p className="text-4xl font-bold text-blue-400">{score}</p>
                </div>
                <p className="text-white font-bold animate-pulse text-xl">
                  Press SPACE to retry
                </p>
              </div>
            )}
          </div>
          
          <p className="mt-8 text-white/40 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Waiting for network to reconnect...
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
