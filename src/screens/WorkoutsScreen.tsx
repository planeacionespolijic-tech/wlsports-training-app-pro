import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Plus, Dumbbell, Loader2, Trash2, X, Play, Clock, ChevronDown, ChevronUp, Edit2, Check, Copy, RefreshCw, Share2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { suggestProgression } from '../services/intelligenceService';
import { Exercise, TrainingBlock, Workout } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface WorkoutsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
  userId: string;
  trainerId: string | null;
}

export const WorkoutsScreen = ({ onBack, onNavigate, userId, trainerId }: WorkoutsScreenProps) => {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  
  // Workout form state
  const [newName, setNewName] = useState('');
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Exercise form state (for adding/editing)
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exName, setExName] = useState('');
  const [exSeries, setExSeries] = useState(3);
  const [exReps, setExReps] = useState('');
  const [exTime, setExTime] = useState(0);
  const [exLoad, setExLoad] = useState('');
  const [exRpe, setExRpe] = useState(0);

  // Circuit form state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [circRounds, setCircRounds] = useState(3);
  const [circRestEx, setCircRestEx] = useState(30);
  const [circRestRound, setCircRestRound] = useState(60);
  const [circItems, setCircItems] = useState<any[]>([]);
  const [circExName, setCircExName] = useState('');
  const [circExTime, setCircExTime] = useState(30);
  const [circExReps, setCircExReps] = useState('');

  // Exercise Bank state
  const [exerciseBank, setExerciseBank] = useState<any[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankTargetBlockId, setBankTargetBlockId] = useState<string | null>(null);
  const [bankTargetType, setBankTargetType] = useState<'normal' | 'circuit' | null>(null);

  const fetchWorkouts = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const q = query(
        collection(db, 'workouts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkouts(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  useEffect(() => {
    const currentTrainerId = trainerId || userId;
    if (!currentTrainerId) return;

    const q = query(
      collection(db, 'exerciseBank'),
      where('trainerId', '==', currentTrainerId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExerciseBank(data);
    }, (error) => {
      console.error('Error fetching exercise bank:', error);
    });

    return () => unsubscribe();
  }, [trainerId, userId]);

  // Calculations
  const calculateExerciseTotalTime = (series: number, timePerSeries: number) => series * timePerSeries;
  
  const sessionTotalTime = useMemo(() => {
    return blocks.reduce((acc, block) => acc + block.totalTime, 0);
  }, [blocks]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addBlock = () => {
    const newBlock: TrainingBlock = {
      id: Date.now().toString(),
      name: `Bloque ${blocks.length + 1}`,
      type: 'normal',
      exercises: [],
      totalTime: 0
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const toggleBlockType = (id: string, type: 'normal' | 'circuit') => {
    setBlocks(blocks.map(b => b.id === id ? { 
      ...b, 
      type, 
      exercises: type === 'normal' ? [] : [],
      circuit: type === 'circuit' ? { rounds: 3, restBetweenExercises: 30, restBetweenRounds: 60, items: [] } : undefined,
      totalTime: 0
    } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const updateBlockName = (id: string, name: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, name } : b));
  };

  const addExerciseToBlock = (blockId: string) => {
    if (!exName) return;

    const totalTime = calculateExerciseTotalTime(exSeries, exTime);
    
    if (editingExerciseId) {
      setBlocks(blocks.map(b => {
        if (b.id === blockId) {
          const updatedExercises = b.exercises.map(ex => 
            ex.id === editingExerciseId 
              ? { ...ex, name: exName, series: exSeries, reps: exReps, timePerSeries: exTime, load: exLoad, rpe: exRpe, totalTime }
              : ex
          );
          const updatedTotalTime = updatedExercises.reduce((acc, ex) => acc + ex.totalTime, 0);
          return { ...b, exercises: updatedExercises, totalTime: updatedTotalTime };
        }
        return b;
      }));
      setEditingExerciseId(null);
    } else {
      const newExercise: Exercise = {
        id: Date.now().toString(),
        name: exName,
        series: exSeries,
        reps: exReps,
        timePerSeries: exTime,
        load: exLoad,
        rpe: exRpe,
        totalTime
      };

      setBlocks(blocks.map(b => {
        if (b.id === blockId) {
          const updatedExercises = [...b.exercises, newExercise];
          const updatedTotalTime = updatedExercises.reduce((acc, ex) => acc + ex.totalTime, 0);
          return { ...b, exercises: updatedExercises, totalTime: updatedTotalTime };
        }
        return b;
      }));
    }

    // Reset exercise form
    setExName('');
    setExSeries(3);
    setExReps('');
    setExTime(0);
    setExLoad('');
    setExRpe(0);
  };

  const startEditExercise = (ex: Exercise) => {
    setEditingExerciseId(ex.id);
    setExName(ex.name);
    setExSeries(ex.series);
    setExReps(ex.reps || '');
    setExTime(ex.timePerSeries || 0);
    setExLoad(ex.load || '');
    setExRpe(ex.rpe || 0);
  };

  const addExerciseToCircuit = (blockId: string) => {
    if (!circExName) return;

    if (editingItemId) {
      setBlocks(blocks.map(b => {
        if (b.id === blockId && b.type === 'circuit' && b.circuit) {
          const updatedItems = b.circuit.items.map(item => 
            item.id === editingItemId 
              ? { ...item, name: circExName, time: circExTime, reps: circExReps }
              : item
          );
          const updatedCircuit = { ...b.circuit, items: updatedItems };
          
          const workTime = updatedItems.reduce((acc, item) => acc + (item.time || 0), 0);
          const restExTime = Math.max(0, updatedItems.length - 1) * b.circuit.restBetweenExercises;
          const roundTime = workTime + restExTime;
          const totalTime = (roundTime * b.circuit.rounds) + (b.circuit.restBetweenRounds * (b.circuit.rounds - 1));
          
          return { ...b, circuit: updatedCircuit, totalTime };
        }
        return b;
      }));
      setEditingItemId(null);
    } else {
      const newItem = {
        id: Date.now().toString(),
        name: circExName,
        time: circExTime,
        reps: circExReps,
        order: 0
      };

      setBlocks(blocks.map(b => {
        if (b.id === blockId && b.type === 'circuit' && b.circuit) {
          const updatedItems = [...b.circuit.items, newItem].map((item, idx) => ({ ...item, order: idx }));
          const updatedCircuit = { ...b.circuit, items: updatedItems };
          
          const workTime = updatedItems.reduce((acc, item) => acc + (item.time || 0), 0);
          const restExTime = (updatedItems.length - 1) * b.circuit.restBetweenExercises;
          const roundTime = workTime + restExTime;
          const totalTime = (roundTime * b.circuit.rounds) + (b.circuit.restBetweenRounds * (b.circuit.rounds - 1));
          
          return { ...b, circuit: updatedCircuit, totalTime };
        }
        return b;
      }));
    }

    setCircExName('');
    setCircExTime(30);
    setCircExReps('');
  };

  const startEditCircuitItem = (item: any) => {
    setEditingItemId(item.id);
    setCircExName(item.name);
    setCircExTime(item.time || 0);
    setCircExReps(item.reps || '');
  };

  const updateCircuitConfig = (blockId: string, field: string, value: number) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId && b.type === 'circuit' && b.circuit) {
        const updatedCircuit = { ...b.circuit, [field]: value };
        
        // Recalculate total time
        const workTime = updatedCircuit.items.reduce((acc, item) => acc + (item.time || 0), 0);
        const restExTime = Math.max(0, updatedCircuit.items.length - 1) * updatedCircuit.restBetweenExercises;
        const roundTime = workTime + restExTime;
        const totalTime = (roundTime * updatedCircuit.rounds) + (updatedCircuit.restBetweenRounds * (updatedCircuit.rounds - 1));
        
        return { ...b, circuit: updatedCircuit, totalTime };
      }
      return b;
    }));
  };

  const removeExerciseFromCircuit = (blockId: string, itemId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId && b.type === 'circuit' && b.circuit) {
        const updatedItems = b.circuit.items.filter(i => i.id !== itemId).map((item, idx) => ({ ...item, order: idx }));
        const updatedCircuit = { ...b.circuit, items: updatedItems };
        
        const workTime = updatedItems.reduce((acc, item) => acc + (item.time || 0), 0);
        const restExTime = Math.max(0, updatedItems.length - 1) * b.circuit.restBetweenExercises;
        const roundTime = workTime + restExTime;
        const totalTime = (roundTime * b.circuit.rounds) + (b.circuit.restBetweenRounds * (b.circuit.rounds - 1));
        
        return { ...b, circuit: updatedCircuit, totalTime };
      }
      return b;
    }));
  };

  const removeExerciseFromBlock = (blockId: string, exerciseId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        const updatedExercises = b.exercises.filter(ex => ex.id !== exerciseId);
        const updatedTotalTime = updatedExercises.reduce((acc, ex) => acc + ex.totalTime, 0);
        return { ...b, exercises: updatedExercises, totalTime: updatedTotalTime };
      }
      return b;
    }));
  };

  const handleAddWorkout = async () => {
    if (!newName || blocks.length === 0) return;

    try {
      const workoutData = {
        name: newName,
        duration: formatTime(sessionTotalTime),
        totalTime: sessionTotalTime,
        blocks: blocks,
        userId: userId,
        trainerId: trainerId,
        updatedAt: serverTimestamp()
      };

      if (editingWorkoutId) {
        await updateDoc(doc(db, 'workouts', editingWorkoutId), workoutData);
      } else {
        await addDoc(collection(db, 'workouts'), {
          ...workoutData,
          createdAt: serverTimestamp()
        });
      }
      
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingWorkoutId ? OperationType.UPDATE : OperationType.CREATE, 'workouts');
    }
  };

  const handleDuplicate = async (workout: any) => {
    try {
      const { id, createdAt, updatedAt, ...rest } = workout;
      await addDoc(collection(db, 'workouts'), {
        ...rest,
        name: `${rest.name} (Copia)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workouts');
    }
  };

  const resetForm = () => {
    setNewName('');
    setBlocks([]);
    setIsAdding(false);
    setEditingWorkoutId(null);
    setActiveBlockId(null);
    setEditingExerciseId(null);
    setEditingItemId(null);
    setShowOverview(false);
  };

  const handleEdit = (workout: any) => {
    setNewName(workout.name);
    setBlocks(workout.blocks || []);
    setEditingWorkoutId(workout.id);
    setIsAdding(true);
    if (workout.blocks && workout.blocks.length > 0) {
      setActiveBlockId(workout.blocks[0].id);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este entrenamiento?')) {
      try {
        await deleteDoc(doc(db, 'workouts', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'workouts');
      }
    }
  };

  const [showAthletePicker, setShowAthletePicker] = useState(false);
  const [selectedWorkoutForSession, setSelectedWorkoutForSession] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);

  useEffect(() => {
    // Load Athletes for picker if in global mode
    if (trainerId === userId) {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'client'),
        orderBy('displayName', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [userId, trainerId]);

  const handleStartSession = async (workout: any) => {
    if (trainerId === userId) {
      // Global mode: Need to pick an athlete first
      setSelectedWorkoutForSession(workout);
      setShowAthletePicker(true);
      return;
    }
    
    // Athlete mode: Direct start
    const adjustedWorkout = await suggestProgression(userId, workout);
    onNavigate('ejecucion-sesion', adjustedWorkout || workout);
  };

  const handlePickAthleteAndStart = async (athleteId: string) => {
    if (!selectedWorkoutForSession) return;
    setShowAthletePicker(false);
    
    // Navigate to execution screen FOR THE PICKED ATHLETE
    onNavigate('ejecucion-directa', { 
      athleteId, 
      workout: selectedWorkoutForSession 
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (isAdding) {
                resetForm();
              } else {
                onBack();
              }
            }} 
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">{editingWorkoutId ? 'Editar Entrenamiento' : 'Entrenamientos'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isAdding && (
            <>
              <button 
                onClick={() => fetchWorkouts(true)}
                disabled={refreshing}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
              >
                <RefreshCw size={24} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={() => { resetForm(); setIsAdding(true); }}
                className="bg-[#D4AF37] text-black p-2 rounded-full hover:bg-[#B8962E] transition-colors"
              >
                <Plus size={24} />
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {isAdding ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-24">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h2 className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest">Información General</h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowOverview(!showOverview)}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors"
                  >
                    {showOverview ? 'Ocultar Resumen' : 'Ver Resumen'}
                  </button>
                  <div className="flex items-center gap-2 text-[#D4AF37] font-black">
                    <Clock size={16} />
                    <span>{formatTime(sessionTotalTime)}</span>
                  </div>
                </div>
              </div>
              <input
                type="text"
                placeholder="Nombre del entrenamiento (ej: Sesión Potencia)"
                className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none transition-all"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <AnimatePresence>
              {showOverview && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3"
                >
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Estructura de la Sesión</h3>
                  {blocks.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic">No hay bloques añadidos aún</p>
                  ) : (
                    <div className="space-y-2">
                      {blocks.map((b, idx) => (
                        <div key={b.id} className="flex items-start gap-2">
                          <span className="text-[#D4AF37] font-black text-xs mt-0.5">{idx + 1}.</span>
                          <div>
                            <p className="text-xs font-bold">{b.name} <span className="text-zinc-600 font-normal">({b.type === 'circuit' ? 'Circuito' : 'Normal'})</span></p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.type === 'normal' ? (
                                b.exercises.map(ex => (
                                  <span key={ex.id} className="text-[8px] bg-black/30 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500">
                                    {ex.name} <span className="text-zinc-700 ml-1">{ex.series}x{ex.reps || '0'}</span>
                                  </span>
                                ))
                              ) : (
                                b.circuit?.items.map(item => (
                                  <span key={item.id} className="text-[8px] bg-black/30 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500">
                                    {item.name} <span className="text-zinc-700 ml-1">{item.time ? `${item.time}s` : item.reps || '0'}</span>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest">Bloques de Sesión</h2>
                <button 
                  onClick={addBlock}
                  className="flex items-center gap-2 text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] px-4 py-2 rounded-full border border-[#D4AF37]/20"
                >
                  <Plus size={14} />
                  Añadir Bloque
                </button>
              </div>

              <div className="space-y-4">
                {blocks.map((block) => (
                  <div key={block.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
                    <div 
                      className="p-4 bg-zinc-800/30 flex items-center justify-between cursor-pointer"
                      onClick={() => setActiveBlockId(activeBlockId === block.id ? null : block.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input 
                          type="text"
                          value={block.name}
                          onChange={(e) => updateBlockName(block.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent font-bold text-lg outline-none focus:text-[#D4AF37] w-full"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-bold text-zinc-500 bg-black/50 px-3 py-1 rounded-full">
                          {formatTime(block.totalTime)}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                          className="text-zinc-600 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                        {activeBlockId === block.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {activeBlockId === block.id && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-4 border-t border-zinc-800">
                            {/* Block Type Toggle */}
                            <div className="flex bg-black/50 p-1 rounded-xl border border-zinc-800">
                              <button 
                                onClick={() => toggleBlockType(block.id, 'normal')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${block.type === 'normal' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}
                              >
                                Normal
                              </button>
                              <button 
                                onClick={() => toggleBlockType(block.id, 'circuit')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${block.type === 'circuit' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}
                              >
                                Circuito
                              </button>
                            </div>

                            {block.type === 'normal' ? (
                              <>
                                {block.exercises.map((ex) => (
                                  <div key={ex.id} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-zinc-800/50 group">
                                    <div className="flex-1 cursor-pointer" onClick={() => startEditExercise(ex)}>
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-sm group-hover:text-[#D4AF37] transition-colors">{ex.name}</p>
                                        <Edit2 size={12} className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                      <p className="text-[10px] text-zinc-500 uppercase font-bold">
                                        {ex.series} series {ex.reps && `x ${ex.reps} reps`} {ex.load && `@ ${ex.load}`} | {formatTime(ex.totalTime)}
                                      </p>
                                    </div>
                                    <button onClick={() => removeExerciseFromBlock(block.id, ex.id)} className="text-zinc-700 hover:text-red-500 ml-2">
                                      <X size={16} />
                                    </button>
                                  </div>
                                ))}

                                <div className={`p-4 rounded-2xl border space-y-4 transition-all ${editingExerciseId ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' : 'bg-black/50 border-dashed border-zinc-800'}`}>
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                                      {editingExerciseId ? 'Editando Ejercicio' : 'Nuevo Ejercicio'}
                                    </h4>
                                    <div className="flex items-center gap-3">
                                      {!editingExerciseId && exerciseBank.length > 0 && (
                                        <button 
                                          onClick={() => {
                                            setBankTargetBlockId(block.id);
                                            setBankTargetType('normal');
                                            setShowBankModal(true);
                                          }}
                                          className="text-[10px] font-bold text-[#D4AF37] hover:text-white bg-[#D4AF37]/10 px-2 py-1 rounded"
                                        >
                                          Importar del Banco
                                        </button>
                                      )}
                                      {editingExerciseId && (
                                        <button 
                                          onClick={() => {
                                            setEditingExerciseId(null);
                                            setExName('');
                                            setExSeries(3);
                                            setExReps('');
                                            setExTime(0);
                                            setExLoad('');
                                            setExRpe(0);
                                          }}
                                          className="text-[10px] font-bold text-zinc-500 hover:text-white"
                                        >
                                          Cancelar Edición
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Nombre del ejercicio"
                                    className="w-full bg-transparent border-b border-zinc-800 p-2 focus:border-[#D4AF37] outline-none text-sm"
                                    value={exName}
                                    onChange={(e) => setExName(e.target.value)}
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Series</label>
                                      <input
                                        type="number"
                                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center"
                                        value={exSeries}
                                        onChange={(e) => setExSeries(parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Reps / Info</label>
                                      <input
                                        type="text"
                                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center"
                                        value={exReps}
                                        onChange={(e) => setExReps(e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Tiempo x Serie (seg)</label>
                                      <input
                                        type="number"
                                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center"
                                        value={exTime}
                                        onChange={(e) => setExTime(parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Carga (kg/lbs)</label>
                                      <input
                                        type="text"
                                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center"
                                        value={exLoad}
                                        onChange={(e) => setExLoad(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between pt-2">
                                    <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                                      Tiempo Total: {formatTime(calculateExerciseTotalTime(exSeries, exTime))}
                                    </div>
                                    <button 
                                      onClick={() => addExerciseToBlock(block.id)}
                                      className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-2 rounded-lg"
                                    >
                                      {editingExerciseId ? 'Actualizar' : '+ Añadir Ejercicio'}
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="space-y-6">
                                {/* Circuit Config */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Rondas</label>
                                    <input
                                      type="number"
                                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center text-xs"
                                      value={block.circuit?.rounds}
                                      onChange={(e) => updateCircuitConfig(block.id, 'rounds', parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Desc. Ejerc. (s)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center text-xs"
                                      value={block.circuit?.restBetweenExercises}
                                      onChange={(e) => updateCircuitConfig(block.id, 'restBetweenExercises', parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Desc. Ronda (s)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center text-xs"
                                      value={block.circuit?.restBetweenRounds}
                                      onChange={(e) => updateCircuitConfig(block.id, 'restBetweenRounds', parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>

                                {/* Circuit Items */}
                                <div className="space-y-2">
                                  {block.circuit?.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-zinc-800/50 group">
                                      <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => startEditCircuitItem(item)}>
                                        <span className="w-5 h-5 bg-[#D4AF37] text-black text-[10px] font-black rounded-full flex items-center justify-center">
                                          {item.order + 1}
                                        </span>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm group-hover:text-[#D4AF37] transition-colors">{item.name}</p>
                                            <Edit2 size={12} className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                          <p className="text-[10px] text-zinc-500 uppercase font-bold">
                                            {item.time ? `${item.time}s` : item.reps || 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                      <button onClick={() => removeExerciseFromCircuit(block.id, item.id)} className="text-zinc-700 hover:text-red-500 ml-2">
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Add Circuit Item Form */}
                                <div className={`p-4 rounded-2xl border space-y-4 transition-all ${editingItemId ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' : 'bg-black/50 border-dashed border-zinc-800'}`}>
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                                      {editingItemId ? 'Editando Item de Circuito' : 'Nuevo Ejercicio en Circuito'}
                                    </h4>
                                    <div className="flex items-center gap-3">
                                      {!editingItemId && exerciseBank.length > 0 && (
                                        <button 
                                          onClick={() => {
                                            setBankTargetBlockId(block.id);
                                            setBankTargetType('circuit');
                                            setShowBankModal(true);
                                          }}
                                          className="text-[10px] font-bold text-[#D4AF37] hover:text-white bg-[#D4AF37]/10 px-2 py-1 rounded"
                                        >
                                          Importar del Banco
                                        </button>
                                      )}
                                      {editingItemId && (
                                        <button 
                                          onClick={() => {
                                            setEditingItemId(null);
                                            setCircExName('');
                                            setCircExTime(30);
                                            setCircExReps('');
                                          }}
                                          className="text-[10px] font-bold text-zinc-500 hover:text-white"
                                        >
                                          Cancelar Edición
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Nombre del ejercicio en circuito"
                                    className="w-full bg-transparent border-b border-zinc-800 p-2 focus:border-[#D4AF37] outline-none text-sm"
                                    value={circExName}
                                    onChange={(e) => setCircExName(e.target.value)}
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Tiempo (seg)</label>
                                      <input
                                        type="number"
                                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center"
                                        value={circExTime}
                                        onChange={(e) => setCircExTime(parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Reps (opcional)</label>
                                      <input
                                        type="text"
                                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg focus:border-[#D4AF37] outline-none text-center"
                                        value={circExReps}
                                        onChange={(e) => setCircExReps(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => addExerciseToCircuit(block.id)}
                                    className="w-full bg-[#D4AF37] text-black font-bold text-xs py-3 rounded-lg"
                                  >
                                    {editingItemId ? 'Actualizar Item' : '+ Añadir al Circuito'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-zinc-800 flex gap-3 z-20">
              <button 
                onClick={handleAddWorkout}
                disabled={!newName || blocks.length === 0}
                className="flex-1 bg-[#D4AF37] text-black font-bold py-4 rounded-2xl shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50"
              >
                {editingWorkoutId ? 'Actualizar Entrenamiento' : 'Guardar Entrenamiento'}
              </button>
              <button 
                onClick={resetForm}
                className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-2xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
              </div>
            ) : workouts.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 italic">
                No hay entrenamientos registrados
              </div>
            ) : (
              workouts.map((item) => (
                <div key={item.id} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 group relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="bg-zinc-800 p-3 rounded-xl text-[#D4AF37]">
                        <Dumbbell size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                          <Clock size={12} />
                          <span>{item.duration}</span>
                          <span className="mx-1">•</span>
                          <span>{item.blocks?.length || 0} Bloques</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}/?share=workout&id=${item.id}`;
                          navigator.clipboard.writeText(url);
                          alert('Enlace copiado al portapapeles');
                        }}
                        title="Compartir"
                        className="p-2 text-zinc-700 hover:text-[#D4AF37] transition-colors"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDuplicate(item)}
                        title="Duplicar"
                        className="p-2 text-zinc-700 hover:text-[#D4AF37] transition-colors"
                      >
                        <Copy size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 text-zinc-700 hover:text-[#D4AF37] transition-colors"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  
                  {item.blocks && item.blocks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                      {item.blocks.slice(0, 2).map((block: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{block.name}</span>
                            <span className="text-[10px] font-bold text-zinc-600">{formatTime(block.totalTime)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {block.exercises.slice(0, 3).map((ex: any, j: number) => (
                              <span key={j} className="text-[10px] bg-black/50 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400">
                                {ex.name}
                              </span>
                            ))}
                            {block.exercises.length > 3 && (
                              <span className="text-[10px] text-zinc-600">+{block.exercises.length - 3}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {item.blocks.length > 2 && (
                        <p className="text-[10px] text-[#D4AF37] font-bold">+{item.blocks.length - 2} bloques más</p>
                      )}
                    </div>
                  )}

                  <button 
                    onClick={() => handleStartSession(item)}
                    className="w-full mt-6 bg-zinc-800 hover:bg-[#D4AF37] hover:text-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Play size={18} />
                    Iniciar Sesión
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Exercise Bank Modal */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
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
                        if (bankTargetType === 'normal') {
                          setExName(ex.name);
                          setExSeries(ex.series || 3);
                          setExReps(ex.reps || '');
                          setExTime(ex.timePerSeries || ex.time || 0);
                          setExLoad(ex.load || '');
                          setExRpe(ex.rpe || 0);
                        } else {
                          setCircExName(ex.name);
                          setCircExTime(ex.timePerSeries || ex.time || 30);
                          setCircExReps(ex.reps || '');
                        }
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
      {/* Athlete Picker Modal */}
      <AnimatePresence>
        {showAthletePicker && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 20 }}
              className="bg-zinc-900 w-full max-w-sm rounded-[2.5rem] border border-zinc-800 p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">¿Para quién?</h2>
                <button onClick={() => setShowAthletePicker(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-4">Selecciona un atleta para iniciar la sesión</p>
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 mb-6">
                {athletes.length === 0 ? (
                  <p className="text-zinc-600 text-sm italic py-4">No tienes atletas registrados.</p>
                ) : (
                  athletes.map(athlete => (
                    <button
                      key={athlete.id}
                      onClick={() => handlePickAthleteAndStart(athlete.id)}
                      className="w-full p-4 bg-black border border-zinc-800 rounded-2xl flex items-center gap-4 hover:border-[#D4AF37] transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-[#D4AF37]">
                        {athlete.displayName?.[0] || 'A'}
                      </div>
                      <span className="font-bold text-sm">{athlete.displayName}</span>
                    </button>
                  ))
                )}
              </div>
              
              <button 
                onClick={() => setShowAthletePicker(false)}
                className="w-full bg-zinc-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
