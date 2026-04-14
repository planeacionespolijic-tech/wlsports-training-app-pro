import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, Save, Loader2, MessageSquare, Activity, Clock, Layers, Play, Pause, SkipForward, RotateCcw, Plus, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, increment, getDocs } from 'firebase/firestore';
import { awardSessionPoints } from '../services/gamificationService';
import { startLiveSession, updateLiveSession, endLiveSession } from '../services/liveSessionService';
import { motion, AnimatePresence } from 'motion/react';
import { TabataModule } from '../components/training/TabataModule';
import { ReactionModule } from '../components/training/ReactionModule';
import { Timer, Zap } from 'lucide-react';
import { updateUserSummary } from '../services/dataService';

interface SessionExecutionScreenProps {
  onBack: () => void;
  userId: string;
  workout: any;
  trainerId: string | null;
  isAdmin?: boolean;
}

export const SessionExecutionScreen = ({ onBack, userId, workout, trainerId, isAdmin }: SessionExecutionScreenProps) => {
  const [saving, setSaving] = useState(false);
  const [localWorkout, setLocalWorkout] = useState(workout);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [rpe, setRpe] = useState<number>(5);
  const [observations, setObservations] = useState('');
  const [adaptations, setAdaptations] = useState<{ [key: string]: string }>({});
  const [activeTool, setActiveTool] = useState<'tabata' | 'reaction' | null>(null);

  // States for adding exercises
  const [showAddExerciseModal, setShowAddExerciseModal] = useState<string | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [exerciseBank, setExerciseBank] = useState<any[]>([]);
  const [exName, setExName] = useState('');
  const [exSeries, setExSeries] = useState(3);
  const [exReps, setExReps] = useState('');
  const [exTime, setExTime] = useState(0);
  const [exLoad, setExLoad] = useState('');
  const [exRpe, setExRpe] = useState(0);

  useEffect(() => {
    const fetchExerciseBank = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'exerciseBank'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExerciseBank(data);
      } catch (error) {
        console.error("Error fetching exercise bank:", error);
      }
    };
    if (isAdmin) {
      fetchExerciseBank();
    }
  }, [isAdmin]);

  const handleAddExercise = (blockId: string) => {
    if (!exName) return;
    
    const newExercise = {
      id: Date.now().toString(),
      name: exName,
      series: exSeries,
      reps: exReps,
      timePerSeries: exTime,
      load: exLoad,
      rpe: exRpe,
      totalTime: exSeries * exTime
    };

    setLocalWorkout((prev: any) => {
      const newBlocks = prev.blocks.map((b: any) => {
        if (b.id === blockId) {
          return {
            ...b,
            exercises: [...(b.exercises || []), newExercise],
            totalTime: (b.totalTime || 0) + newExercise.totalTime
          };
        }
        return b;
      });
      
      return {
        ...prev,
        blocks: newBlocks
      };
    });

    setShowAddExerciseModal(null);
    setExName('');
    setExSeries(3);
    setExReps('');
    setExTime(0);
    setExLoad('');
    setExRpe(0);
  };

  // Initialize live session
  useEffect(() => {
    startLiveSession(userId, localWorkout);
    return () => {
      // End live session logic if needed
    };
  }, [userId, localWorkout]);

  const toggleExercise = (id: string) => {
    const newCompleted = completedExercises.includes(id)
      ? completedExercises.filter(i => i !== id)
      : [...completedExercises, id];
    
    setCompletedExercises(newCompleted);
    updateLiveSession(userId, { completedExercises: newCompleted });
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'history'), {
        userId,
        trainerId,
        workoutId: localWorkout.id || 'custom',
        workoutName: localWorkout.name,
        workoutDetails: {
          ...localWorkout,
          completedExercises,
          rpe,
          observations,
          adaptations
        },
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });

      // Award gamification points
      const result = await awardSessionPoints(userId, localWorkout.name);
      
      // Update user summary for optimized reads
      try {
        await updateUserSummary(userId, {
          lastWorkout: localWorkout.name,
          lastWorkoutDate: new Date().toISOString(),
          sessionsCompleted: 1,
          points: result?.newPoints || 0,
          level: result?.newLevel || 1,
          xp: result?.newXp || 0
        });
      } catch (e) {
        console.error('Error updating user summary:', e);
      }
      
      // End live session
      await endLiveSession(userId);
      
      let message = `¡Sesión guardada! Ganaste ${result?.pointsEarned} puntos.`;
      if (result?.leveledUp) {
        message += `\n\n¡FELICIDADES! Subiste al nivel ${result.newLevel}`;
      }
      
      alert(message);
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'history');
    } finally {
      setSaving(false);
    }
  };

  const renderExercise = (ex: any, blockId: string = 'default') => {
    const exId = ex.id || `${blockId}-${ex.name}`;
    const isCompleted = completedExercises.includes(exId);

    return (
      <motion.div 
        key={exId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 rounded-3xl border transition-all ${isCompleted ? 'bg-zinc-900/30 border-[#D4AF37]/50' : 'bg-zinc-900 border-zinc-800'}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={`font-bold text-lg ${isCompleted ? 'text-zinc-500 line-through' : 'text-white'}`}>
              {ex.name}
            </h3>
            <p className="text-sm text-zinc-500 font-medium">
              {ex.series} series {ex.reps && `x ${ex.reps} reps`} {ex.load && `@ ${ex.load}`} {ex.weight && `@ ${ex.weight}`}
              {ex.totalTime > 0 && ` | ${Math.floor(ex.totalTime / 60)}:${(ex.totalTime % 60).toString().padStart(2, '0')}`}
            </p>
          </div>
          <button 
            onClick={() => toggleExercise(exId)}
            className={`p-3 rounded-2xl transition-all ${isCompleted ? 'bg-[#D4AF37] text-black' : 'bg-black border border-zinc-800 text-zinc-700'}`}
          >
            <CheckCircle2 size={24} />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-zinc-800/50">
          <Activity size={14} className="text-zinc-600" />
          <input 
            type="text"
            placeholder="Adaptación (ej: bajé peso, dolió hombro...)"
            className="bg-transparent text-xs outline-none w-full text-zinc-400"
            value={adaptations[exId] || ''}
            onChange={(e) => setAdaptations({ ...adaptations, [exId]: e.target.value })}
          />
        </div>
      </motion.div>
    );
  };

  const CircuitPlayer = ({ block }: { block: any }) => {
    const [currentRound, setCurrentRound] = useState(1);
    const [currentItemIdx, setCurrentItemIdx] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const circuit = block.circuit;
    const currentItem = circuit.items[currentItemIdx];

    useEffect(() => {
      if (isActive && timeLeft > 0) {
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else if (timeLeft === 0 && isActive) {
        handleNext();
      }
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [isActive, timeLeft]);

    const handleStart = () => {
      setIsActive(true);
      if (timeLeft === 0) {
        setTimeLeft(currentItem.time || 30);
      }
    };

    const handlePause = () => {
      setIsActive(false);
    };

    const handleNext = () => {
      if (isResting) {
        // Finished rest, move to next exercise or next round
        setIsResting(false);
        const nextIdx = currentItemIdx + 1;
        if (nextIdx < circuit.items.length) {
          setCurrentItemIdx(nextIdx);
          setTimeLeft(circuit.items[nextIdx].time || 30);
        } else {
          // End of round
          if (currentRound < circuit.rounds) {
            setCurrentRound(prev => prev + 1);
            setCurrentItemIdx(0);
            setTimeLeft(circuit.items[0].time || 30);
          } else {
            // Circuit finished
            setIsActive(false);
            toggleExercise(block.id);
          }
        }
      } else {
        // Finished work, move to rest
        const isEndOfRound = currentItemIdx === circuit.items.length - 1;
        const isEndOfCircuit = isEndOfRound && currentRound === circuit.rounds;

        if (isEndOfCircuit) {
          setIsActive(false);
          toggleExercise(block.id);
        } else {
          setIsResting(true);
          setTimeLeft(isEndOfRound ? circuit.restBetweenRounds : circuit.restBetweenExercises);
        }
      }
    };

    const handleReset = () => {
      setIsActive(false);
      setCurrentRound(1);
      setCurrentItemIdx(0);
      setIsResting(false);
      setTimeLeft(circuit.items[0].time || 30);
    };

    const isCompleted = completedExercises.includes(block.id);

    return (
      <div className={`p-6 rounded-3xl border transition-all ${isCompleted ? 'bg-zinc-900/30 border-[#D4AF37]/50' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#D4AF37]/20 p-2 rounded-xl text-[#D4AF37]">
              <RotateCcw size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Circuito: {block.name}</h3>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                Ronda {currentRound} de {circuit.rounds} • {circuit.items.length} Ejercicios
              </p>
            </div>
          </div>
          <button 
            onClick={() => toggleExercise(block.id)}
            className={`p-3 rounded-2xl transition-all ${isCompleted ? 'bg-[#D4AF37] text-black' : 'bg-black border border-zinc-800 text-zinc-700'}`}
          >
            <CheckCircle2 size={24} />
          </button>
        </div>

        {!isCompleted && (
          <div className="space-y-6">
            <div className="bg-black/50 rounded-2xl p-6 border border-zinc-800 text-center relative overflow-hidden">
              {isResting && (
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
              )}
              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">
                  {isResting ? 'Descanso' : 'Trabajo'}
                </p>
                <h4 className="text-2xl font-black text-white mb-4">
                  {isResting ? (currentItemIdx === circuit.items.length - 1 ? 'Próxima Ronda' : 'Siguiente Ejercicio') : currentItem.name}
                </h4>
                <div className="text-6xl font-black text-[#D4AF37] tabular-nums mb-6">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>

                <div className="flex justify-center gap-4">
                  <button 
                    onClick={handleReset}
                    className="p-4 bg-zinc-800 text-white rounded-2xl hover:bg-zinc-700 transition-all"
                  >
                    <RotateCcw size={24} />
                  </button>
                  {isActive ? (
                    <button 
                      onClick={handlePause}
                      className="p-4 bg-zinc-800 text-white rounded-2xl hover:bg-zinc-700 transition-all"
                    >
                      <Pause size={24} />
                    </button>
                  ) : (
                    <button 
                      onClick={handleStart}
                      className="p-4 bg-[#D4AF37] text-black rounded-2xl hover:opacity-90 transition-all"
                    >
                      <Play size={24} />
                    </button>
                  )}
                  <button 
                    onClick={handleNext}
                    className="p-4 bg-zinc-800 text-white rounded-2xl hover:bg-zinc-700 transition-all"
                  >
                    <SkipForward size={24} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Secuencia del Circuito</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {circuit.items.map((item: any, idx: number) => (
                  <div 
                    key={item.id}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl border transition-all ${idx === currentItemIdx ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'bg-black border-zinc-800 text-zinc-500'}`}
                  >
                    <p className="text-[10px] font-black">{idx + 1}. {item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">{localWorkout.name}</h1>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest">
              <Clock size={10} />
              <span>{localWorkout.duration || 'N/A'}</span>
              <span className="mx-1">•</span>
              <span>Ejecución</span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleFinish}
          disabled={saving || completedExercises.length === 0}
          className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Finalizar
        </button>
      </header>

      {/* Quick Tools Bar */}
      <div className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 p-2 flex justify-center gap-4 sticky top-[73px] z-[5]">
        <button 
          onClick={() => setActiveTool('tabata')}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
        >
          <Timer size={14} />
          Tabata
        </button>
        <button 
          onClick={() => setActiveTool('reaction')}
          className="flex items-center gap-2 px-6 py-2 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20 font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/20 transition-all"
        >
          <Zap size={14} />
          Reacción
        </button>
      </div>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8 pb-20">
          {localWorkout.blocks && localWorkout.blocks.length > 0 ? (
            localWorkout.blocks.map((block: any) => (
              <div key={block.id} className="space-y-4">
                <div className="flex items-center gap-2 border-l-2 border-[#D4AF37] pl-3">
                  <Layers size={16} className="text-[#D4AF37]" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">{block.name}</h2>
                  <span className="ml-auto text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">
                    {Math.floor(block.totalTime / 60)}:{(block.totalTime % 60).toString().padStart(2, '0')}
                  </span>
                  {isAdmin && (
                    <button 
                      onClick={() => setShowAddExerciseModal(block.id)}
                      className="ml-2 bg-[#D4AF37]/10 text-[#D4AF37] p-1.5 rounded-lg hover:bg-[#D4AF37]/20 transition-colors"
                      title="Añadir ejercicio"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {block.type === 'circuit' ? (
                    <CircuitPlayer block={block} />
                  ) : (
                    block.exercises.map((ex: any) => renderExercise(ex, block.id))
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Ejercicios de la Sesión</h2>
              {localWorkout.exercises?.map((ex: any, idx: number) => renderExercise(ex, 'legacy'))}
            </div>
          )}

          <div className="space-y-6 pt-6 border-t border-zinc-800">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Esfuerzo Percibido (RPE)</h2>
                <span className="text-2xl font-black text-[#D4AF37]">{rpe}</span>
              </div>
              <input 
                type="range" min="1" max="10" value={rpe} onChange={e => setRpe(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                <span>Muy Fácil</span>
                <span>Máximo Esfuerzo</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <MessageSquare size={14} />
                Observaciones Post-Sesión
              </label>
              <textarea 
                value={observations}
                onChange={e => setObservations(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[100px] resize-none transition-all"
                placeholder="¿Cómo te sentiste hoy? ¿Alguna molestia?"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Overlays for Tools */}
      <AnimatePresence>
        {activeTool === 'tabata' && (
          <TabataModule onClose={() => setActiveTool(null)} />
        )}
        {activeTool === 'reaction' && (
          <ReactionModule onClose={() => setActiveTool(null)} userId={userId} />
        )}

        {/* Add Exercise Modal */}
        {showAddExerciseModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-800 p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">Añadir Ejercicio</h2>
                <button onClick={() => setShowAddExerciseModal(null)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Nombre del Ejercicio</label>
                  {exerciseBank.length > 0 && (
                    <button 
                      onClick={() => setShowBankModal(true)}
                      className="text-[10px] font-bold text-[#D4AF37] hover:text-white bg-[#D4AF37]/10 px-2 py-1 rounded"
                    >
                      Importar del Banco
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Nombre del ejercicio"
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                  value={exName}
                  onChange={(e) => setExName(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Series</label>
                    <input
                      type="number"
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-[#D4AF37] outline-none text-center"
                      value={exSeries}
                      onChange={(e) => setExSeries(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Reps / Info</label>
                    <input
                      type="text"
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-[#D4AF37] outline-none text-center"
                      value={exReps}
                      onChange={(e) => setExReps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Tiempo x Serie (seg)</label>
                    <input
                      type="number"
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-[#D4AF37] outline-none text-center"
                      value={exTime}
                      onChange={(e) => setExTime(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Carga (kg/lbs)</label>
                    <input
                      type="text"
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-[#D4AF37] outline-none text-center"
                      value={exLoad}
                      onChange={(e) => setExLoad(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => handleAddExercise(showAddExerciseModal)}
                  className="w-full mt-4 bg-[#D4AF37] text-black font-black py-4 rounded-2xl"
                >
                  Añadir Ejercicio
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Exercise Bank Modal */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-800 p-6 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black">Banco de Ejercicios</h2>
                <button onClick={() => setShowBankModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {exerciseBank.length === 0 ? (
                  <p className="text-zinc-500 text-sm italic text-center py-10">No hay ejercicios en tu banco.</p>
                ) : (
                  exerciseBank.map(ex => (
                    <div 
                      key={ex.id} 
                      className="bg-black border border-zinc-800 p-4 rounded-xl flex justify-between items-center hover:border-[#D4AF37]/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setExName(ex.name);
                        setExSeries(ex.series || 3);
                        setExReps(ex.reps || '');
                        setExTime(ex.timePerSeries || ex.time || 0);
                        setExLoad(ex.load || '');
                        setExRpe(ex.rpe || 0);
                        setShowBankModal(false);
                      }}
                    >
                      <div>
                        <p className="font-bold text-sm">{ex.name}</p>
                        {ex.muscleGroup && <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{ex.muscleGroup}</p>}
                      </div>
                      <Plus size={18} className="text-[#D4AF37]" />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
