import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export const SchulteScreen = () => {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [expectedNext, setExpectedNext] = useState(1);
  const [timeMs, setTimeMs] = useState(0);
  const [gridSize, setGridSize] = useState(5); // 5x5
  const [mistakes, setMistakes] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateGrid = () => {
    const total = gridSize * gridSize;
    const nums = Array.from({ length: total }, (_, i) => i + 1);
    // Fisher-Yates shuffle
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setNumbers(nums);
  };

  const startGame = () => {
    setIsActive(true);
    setIsFinished(false);
    setExpectedNext(1);
    setTimeMs(0);
    setMistakes(0);
    generateGrid();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeMs(prev => prev + 10);
    }, 10);
  };

  const stopGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setIsFinished(false);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    return totalSeconds.toFixed(2);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleNumberClick = (num: number) => {
    if (!isActive) return;
    
    if (num === expectedNext) {
      if (num === gridSize * gridSize) {
        // Finished!
        if (timerRef.current) clearInterval(timerRef.current);
        setIsActive(false);
        setIsFinished(true);
      } else {
        setExpectedNext(prev => prev + 1);
      }
    } else {
      // Wrong number clicked
      setMistakes(m => m + 1);
      // Could flash red or give visual feedback
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-6 pt-10 border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Tabla de <span className="text-blue-500">Schulte</span></h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mt-1">Visión Periférica</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {!isActive && !isFinished && (
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
            <Layers size={48} className="text-blue-500 mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4">¿Cómo jugar?</h2>
            <p className="text-zinc-400 mb-8">
              Encuentra y presiona los números en orden ascendente (del 1 al {gridSize * gridSize}) lo más rápido posible. Mantén la mirada en el centro de la cuadrícula.
            </p>
            <button
              onClick={startGame}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Play size={20} /> Iniciar Búsqueda
            </button>
          </div>
        )}

        {isActive && (
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-8">
              <div className="bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800 text-center">
                <span className="block text-xs font-bold text-zinc-500 uppercase">Tiempo</span>
                <span className="text-2xl font-black text-white">{formatTime(timeMs)}s</span>
              </div>
              <div className="bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800 text-center">
                <span className="block text-xs font-bold text-zinc-500 uppercase">Siguiente</span>
                <span className="text-2xl font-black text-blue-500">{expectedNext}</span>
              </div>
            </div>

            <div 
              className="grid gap-2 w-full aspect-square max-w-[400px]"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {numbers.map((num, idx) => {
                const isPassed = num < expectedNext;
                return (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleNumberClick(num)}
                    className={`
                      flex items-center justify-center text-2xl font-black rounded-xl transition-colors
                      ${isPassed 
                        ? 'bg-zinc-900/50 text-zinc-600 border border-zinc-800/50' 
                        : 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 hover:border-blue-500'}
                    `}
                  >
                    {num}
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {isFinished && (
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
            <h2 className="text-3xl font-black mb-2 text-white">¡Completado!</h2>
            <div className="flex justify-center gap-6 my-8">
              <div>
                <span className="block text-4xl font-black text-blue-500 mb-1">{formatTime(timeMs)}s</span>
                <span className="text-xs font-bold text-zinc-500 uppercase">Tiempo Total</span>
              </div>
              <div>
                <span className="block text-4xl font-black text-red-500 mb-1">{mistakes}</span>
                <span className="text-xs font-bold text-zinc-500 uppercase">Errores</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={stopGame}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-colors"
              >
                Volver
              </button>
              <button
                onClick={startGame}
                className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw size={20} /> Reintentar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
