import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = [
  { name: 'ROJO', hex: '#EF4444' },
  { name: 'AZUL', hex: '#3B82F6' },
  { name: 'VERDE', hex: '#10B981' },
  { name: 'AMARILLO', hex: '#F59E0B' },
];

export const StroopScreen = () => {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [currentWord, setCurrentWord] = useState(COLORS[0]);
  const [currentColor, setCurrentColor] = useState(COLORS[1]);
  const [timeLeft, setTimeLeft] = useState(30);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateStimulus = () => {
    const word = COLORS[Math.floor(Math.random() * COLORS.length)];
    // Sometimes word and color match, sometimes they don't
    const isMatch = Math.random() > 0.6;
    let color = word;
    if (!isMatch) {
      let availableColors = COLORS.filter(c => c.hex !== word.hex);
      color = availableColors[Math.floor(Math.random() * availableColors.length)];
    }
    setCurrentWord(word);
    setCurrentColor(color);
  };

  const startGame = () => {
    setIsActive(true);
    setIsFinished(false);
    setScore(0);
    setErrors(0);
    setTimeLeft(30);
    generateStimulus();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsActive(false);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setIsFinished(false);
    setTimeLeft(30);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleColorPick = (hex: string) => {
    if (!isActive) return;
    
    // User must pick the COLOR of the text, not the word itself
    if (hex === currentColor.hex) {
      setScore(s => s + 1);
    } else {
      setErrors(e => e + 1);
      // Small penalty? Or just count errors.
    }
    generateStimulus();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-6 pt-10 border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Test de <span className="text-red-500">Stroop</span></h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mt-1">Control Inhibitorio</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {!isActive && !isFinished && (
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
            <Target size={48} className="text-red-500 mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4">¿Cómo jugar?</h2>
            <p className="text-zinc-400 mb-8">
              Selecciona el botón que corresponda al <strong>COLOR DE LA TINTA</strong> en la que está escrita la palabra, ignorando lo que la palabra dice. Tienes 30 segundos.
            </p>
            <button
              onClick={startGame}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Play size={20} /> Iniciar Test
            </button>
          </div>
        )}

        {isActive && (
          <div className="w-full max-w-md flex flex-col h-full">
            <div className="flex justify-between items-center mb-12">
              <div className="bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800 text-center">
                <span className="block text-xs font-bold text-zinc-500 uppercase">Tiempo</span>
                <span className="text-2xl font-black text-white">{timeLeft}s</span>
              </div>
              <div className="bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800 text-center">
                <span className="block text-xs font-bold text-zinc-500 uppercase">Aciertos</span>
                <span className="text-2xl font-black text-green-500">{score}</span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentWord.name}-${currentColor.hex}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-6xl md:text-8xl font-black tracking-tighter uppercase"
                  style={{ color: currentColor.hex }}
                >
                  {currentWord.name}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-12 pb-8">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleColorPick(c.hex)}
                  className="py-6 rounded-2xl font-black text-xl uppercase tracking-widest text-white border-b-4 active:border-b-0 active:translate-y-1 transition-all"
                  style={{ 
                    backgroundColor: c.hex,
                    borderColor: 'rgba(0,0,0,0.3)'
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isFinished && (
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
            <h2 className="text-3xl font-black mb-2 text-white">¡Test Finalizado!</h2>
            <div className="flex justify-center gap-6 my-8">
              <div>
                <span className="block text-4xl font-black text-green-500 mb-1">{score}</span>
                <span className="text-xs font-bold text-zinc-500 uppercase">Aciertos</span>
              </div>
              <div>
                <span className="block text-4xl font-black text-red-500 mb-1">{errors}</span>
                <span className="text-xs font-bold text-zinc-500 uppercase">Errores</span>
              </div>
              <div>
                <span className="block text-4xl font-black text-[#D4AF37] mb-1">
                  {score > 0 ? Math.round((score / (score + errors)) * 100) : 0}%
                </span>
                <span className="text-xs font-bold text-zinc-500 uppercase">Precisión</span>
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
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
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
