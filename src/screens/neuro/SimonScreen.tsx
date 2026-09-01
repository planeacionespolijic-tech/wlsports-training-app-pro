import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BLOCKS = [
  { id: 0, color: 'bg-red-500', active: 'bg-red-400', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.8)]' },
  { id: 1, color: 'bg-blue-500', active: 'bg-blue-400', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.8)]' },
  { id: 2, color: 'bg-green-500', active: 'bg-green-400', glow: 'shadow-[0_0_30px_rgba(16,185,129,0.8)]' },
  { id: 3, color: 'bg-yellow-500', active: 'bg-yellow-400', glow: 'shadow-[0_0_30px_rgba(234,179,8,0.8)]' },
];

export const SimonScreen = () => {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userStep, setUserStep] = useState(0);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const startGame = () => {
    setIsActive(true);
    setIsFinished(false);
    setSequence([]);
    setScore(0);
    setUserStep(0);
    nextLevel([]);
  };

  const nextLevel = (currentSeq: number[]) => {
    const nextBlock = Math.floor(Math.random() * 4);
    const newSeq = [...currentSeq, nextBlock];
    setSequence(newSeq);
    setUserStep(0);
    playSequence(newSeq);
  };

  const playSequence = async (seq: number[]) => {
    setIsShowingSequence(true);
    // Wait a bit before starting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (let i = 0; i < seq.length; i++) {
      setActiveBlock(seq[i]);
      // play sound here if needed
      await new Promise(resolve => setTimeout(resolve, 500));
      setActiveBlock(null);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsShowingSequence(false);
  };

  const handleBlockClick = (blockId: number) => {
    if (!isActive || isShowingSequence) return;

    setActiveBlock(blockId);
    setTimeout(() => setActiveBlock(null), 200);

    const expected = sequence[userStep];
    if (blockId === expected) {
      if (userStep === sequence.length - 1) {
        // Completed this level!
        setScore(s => s + 1);
        setIsShowingSequence(true); // lock inputs
        setTimeout(() => {
          nextLevel(sequence);
        }, 1000);
      } else {
        setUserStep(s => s + 1);
      }
    } else {
      // Wrong! Game Over
      setIsActive(false);
      setIsFinished(true);
    }
  };

  const stopGame = () => {
    setIsActive(false);
    setIsFinished(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-6 pt-10 border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Memoria de <span className="text-green-500">Patrones</span></h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mt-1">Memoria Espacial</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {!isActive && !isFinished && (
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
            <Brain size={48} className="text-green-500 mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4">¿Cómo jugar?</h2>
            <p className="text-zinc-400 mb-8">
              Observa la secuencia de colores que se ilumina y repítela en el mismo orden. Cada ronda se añadirá un color más.
            </p>
            <button
              onClick={startGame}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Play size={20} /> Iniciar Secuencia
            </button>
          </div>
        )}

        {isActive && (
          <div className="w-full max-w-md flex flex-col items-center h-full">
            <div className="flex justify-between items-center w-full mb-12">
              <div className="bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800 text-center">
                <span className="block text-xs font-bold text-zinc-500 uppercase">Ronda</span>
                <span className="text-2xl font-black text-white">{sequence.length}</span>
              </div>
              <div className="bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800 text-center">
                <span className="block text-xs font-bold text-zinc-500 uppercase">Estado</span>
                <span className={`text-sm font-black uppercase tracking-widest mt-2 block ${isShowingSequence ? 'text-yellow-500' : 'text-green-500'}`}>
                  {isShowingSequence ? 'Observa...' : '¡Tu turno!'}
                </span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center w-full">
              <div className="grid grid-cols-2 gap-4 w-full max-w-[300px] aspect-square">
                {BLOCKS.map((block) => (
                  <motion.button
                    key={block.id}
                    whileTap={!isShowingSequence ? { scale: 0.95 } : {}}
                    onClick={() => handleBlockClick(block.id)}
                    className={`
                      rounded-3xl transition-all duration-200
                      ${activeBlock === block.id ? `${block.active} ${block.glow} scale-105` : `${block.color} opacity-50`}
                    `}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {isFinished && (
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
            <h2 className="text-3xl font-black mb-2 text-white">¡Fin del Juego!</h2>
            <div className="flex justify-center gap-6 my-8">
              <div>
                <span className="block text-6xl font-black text-green-500 mb-1">{score}</span>
                <span className="text-xs font-bold text-zinc-500 uppercase">Rondas Completadas</span>
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
                className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
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
