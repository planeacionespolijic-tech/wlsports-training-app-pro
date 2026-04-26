import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Dumbbell, Loader2, Trash2, X, Play, Clock, ChevronDown, ChevronUp, Edit2, Copy, RefreshCw, Share2, Search } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { suggestProgression } from '../services/intelligenceService';
import { Exercise, TrainingBlock } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export const WorkoutsScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  
  // Resolve context
  const targetUserId = id || location.state?.athleteId || user?.uid || '';
  const isViewingAthlete = !!id || !!location.state?.athleteId;
  const trainerId = userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' ? user?.uid : (userProfile?.trainerId || null);

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [exNotes, setExNotes] = useState('');

  // Circuit form state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [circExName, setCircExName] = useState('');
  const [circExTime, setCircExTime] = useState(30);
  const [circExReps, setCircExReps] = useState('');

  // Exercise Bank state
  const [exerciseBank, setExerciseBank] = useState<any[]>([]);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankSelectedCategory, setBankSelectedCategory] = useState<string>('all');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankTargetBlockId, setBankTargetBlockId] = useState<string | null>(null);
  const [bankTargetType, setBankTargetType] = useState<'normal' | 'circuit' | null>(null);

  const CATEGORIES = [
    "ACTIVACIÓN BIOSENSORIAL",
    "FASE DE ALTA INTENSIDAD - H.I.T.",
    "DINÁMICA ESPECÍFICA DE JUEGO",
    "EL DESAFÍO DEL COACH",
    "PROTOCOLO DE RECUPERACIÓN"
  ];

  const filteredBank = useMemo(() => {
    return exerciseBank.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(bankSearchQuery.toLowerCase()) ||
        (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(bankSearchQuery.toLowerCase()));
      
      const matchesCategory = bankSelectedCategory === 'all' || ex.muscleGroup === bankSelectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [exerciseBank, bankSearchQuery, bankSelectedCategory]);

  useEffect(() => {
    if (!targetUserId) return;
    
    setLoading(true);
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', targetUserId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkouts(data);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [targetUserId]);

  useEffect(() => {
    const currentTrainerId = trainerId || targetUserId;
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
  }, [trainerId, targetUserId]);

  const calculateExerciseTotalTime = (series: number, timePerSeries: number) => series * timePerSeries;
  
  const sessionTotalTime = useMemo(() => {
    return blocks.reduce((acc, block) => acc + (block.totalTime || 0), 0);
  }, [blocks]);

  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addBlock = (name?: string) => {
    const newBlock: TrainingBlock = {
      id: Date.now().toString(),
      name: name || `Bloque ${blocks.length + 1}`,
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
      exercises: [],
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
              ? { ...ex, name: exName, series: exSeries, reps: exReps, timePerSeries: exTime, load: exLoad, rpe: exRpe, notes: exNotes, totalTime }
              : ex
          );
          const updatedTotalTime = updatedExercises.reduce((acc, ex) => acc + (ex.totalTime || 0), 0);
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
        notes: exNotes,
        totalTime
      };

      setBlocks(blocks.map(b => {
        if (b.id === blockId) {
          const updatedExercises = [...b.exercises, newExercise];
          const updatedTotalTime = updatedExercises.reduce((acc, ex) => acc + (ex.totalTime || 0), 0);
          return { ...b, exercises: updatedExercises, totalTime: updatedTotalTime };
        }
        return b;
      }));
    }

    setExName('');
    setExSeries(3);
    setExReps('');
    setExTime(0);
    setExLoad('');
    setExRpe(0);
    setExNotes('');
  };

  const startEditExercise = (ex: Exercise) => {
    setEditingExerciseId(ex.id);
    setExName(ex.name);
    setExSeries(ex.series || 3);
    setExReps(ex.reps || '');
    setExTime(ex.timePerSeries || 0);
    setExLoad(ex.load || '');
    setExRpe(ex.rpe || 0);
    setExNotes(ex.notes || '');
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
          const restExTime = Math.max(0, updatedItems.length - 1) * b.circuit.restBetweenExercises;
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
        const updatedTotalTime = updatedExercises.reduce((acc, ex) => acc + (ex.totalTime || 0), 0);
        return { ...b, exercises: updatedExercises, totalTime: updatedTotalTime };
      }
      return b;
    }));
  };

  const handleAddWorkout = async () => {
    if (!newName || blocks.length === 0) {
      alert('Por favor agrega un nombre y al menos un bloque de ejercicios.');
      return;
    }
    
    setSaving(true);
    try {
      const workoutData = {
        name: newName,
        duration: formatTime(sessionTotalTime),
        totalTime: sessionTotalTime,
        blocks: blocks,
        userId: targetUserId || user?.uid,
        trainerId: trainerId || user?.uid,
        updatedAt: serverTimestamp()
      };

      if (!workoutData.userId) throw new Error('No se pudo identificar al usuario destino.');

      if (editingWorkoutId) {
        await updateDoc(doc(db, 'workouts', editingWorkoutId), workoutData);
      } else {
        await addDoc(collection(db, 'workouts'), {
          ...workoutData,
          createdAt: serverTimestamp()
        });
      }
      
      alert(editingWorkoutId ? 'Entrenamiento actualizado' : 'Entrenamiento guardado con éxito');
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingWorkoutId ? OperationType.UPDATE : OperationType.CREATE, 'workouts');
    } finally {
      setSaving(false);
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
        console.log('Attempting to delete workout:', id);
        await deleteDoc(doc(db, 'workouts', id));
        alert('Entrenamiento eliminado correctamente');
      } catch (error: any) {
        console.error('Full delete error:', error);
        alert(`Error al eliminar: ${error.message || 'Sin permisos suficientes'}`);
        handleFirestoreError(error, OperationType.DELETE, 'workouts');
      }
    }
  };

  const [showAthletePicker, setShowAthletePicker] = useState(false);
  const [selectedWorkoutForSession, setSelectedWorkoutForSession] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);

  useEffect(() => {
    if (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin') {
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
  }, [userProfile]);

  const handleStartSession = async (workout: any) => {
    if (!isViewingAthlete && (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin')) {
      setSelectedWorkoutForSession(workout);
      setShowAthletePicker(true);
      return;
    }
    const adjustedWorkout = await suggestProgression(targetUserId, workout);
    navigate(`/ejecucion-sesion`, { state: adjustedWorkout || workout });
  };

  const handlePickAthleteAndStart = async (athleteId: string) => {
    if (!selectedWorkoutForSession) return;
    setShowAthletePicker(false);
    navigate(`/ejecucion-sesion`, { 
      state: {
        ...selectedWorkoutForSession,
        athleteId
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => isAdding ? resetForm() : navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">
            {isAdding ? (editingWorkoutId ? 'Editar Entrenamiento' : 'Nuevo Entrenamiento') : 
            (isViewingAthlete ? `Entrenamientos de ${location.state?.athlete?.displayName || 'Atleta'}` : 'Mis Entrenamientos')}
          </h1>
        </div>
        {!isAdding && (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin') && (
          <div className="flex items-center gap-2">
            <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-[#D4AF37] text-black p-2 rounded-xl hover:bg-[#B8962E] transition-colors">
              <Plus size={24} />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {isAdding ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h2 className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest">Información General</h2>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowOverview(!showOverview)} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors">{showOverview ? 'Ocultar Resumen' : 'Ver Resumen'}</button>
                  <div className="flex items-center gap-2 text-[#D4AF37] font-black"><Clock size={16} /><span>{formatTime(sessionTotalTime)}</span></div>
                </div>
              </div>
              <input type="text" placeholder="Nombre del entrenamiento" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none transition-all" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>

            <AnimatePresence>
              {showOverview && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Esquema</h3>
                  {blocks.length === 0 ? <p className="text-xs text-zinc-600 italic">Sin categorías añadidas</p> : (
                    <div className="space-y-2">
                      {blocks.map((b, idx) => (
                        <div key={b.id} className="flex items-start gap-2">
                          <span className="text-[#D4AF37] font-black text-xs mt-0.5">{idx + 1}.</span>
                          <div>
                            <p className="text-xs font-bold">{b.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.exercises?.map(ex => <span key={ex.id} className="text-[8px] bg-black/30 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500">{ex.name}</span>)}
                              {b.circuit?.items?.map(item => <span key={item.id} className="text-[8px] bg-black/30 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500">{item.name}</span>)}
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
              <div className="flex flex-col gap-4">
                <h2 className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest">Estructura de la Sesión</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORIES.map((cat, idx) => {
                    const isAdded = blocks.some(b => b.name === cat);
                    return (
                      <button 
                        key={cat}
                        onClick={() => addBlock(cat)} 
                        disabled={isAdded}
                        className={`flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl border transition-all ${
                          isAdded 
                          ? 'bg-zinc-800/20 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' 
                          : 'bg-[#D4AF37]/5 text-[#D4AF37] border-[#D4AF37]/20 hover:bg-[#D4AF37]/10'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="opacity-50">{idx + 1}.</span>
                          {cat}
                        </span>
                        {!isAdded && <Plus size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                {blocks.length > 0 && <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Categorías Añadidas</h3>}
                {blocks.map((block) => (
                  <div key={block.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 bg-zinc-800/30 flex items-center justify-between cursor-pointer" onClick={() => setActiveBlockId(activeBlockId === block.id ? null : block.id)}>
                      <input type="text" value={block.name} onChange={(e) => updateBlockName(block.id, e.target.value)} onClick={(e) => e.stopPropagation()} className="bg-transparent font-bold text-lg outline-none focus:text-[#D4AF37] w-full" />
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-bold text-zinc-500 bg-black/50 px-3 py-1 rounded-full">{formatTime(block.totalTime || 0)}</div>
                        <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="text-zinc-600 hover:text-red-500"><Trash2 size={18} /></button>
                        {activeBlockId === block.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    <AnimatePresence>
                      {activeBlockId === block.id && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="p-4 space-y-4 border-t border-zinc-800">
                            <div className="flex bg-black/50 p-1 rounded-xl border border-zinc-800">
                              <button onClick={() => toggleBlockType(block.id, 'normal')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg ${block.type === 'normal' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}>Normal</button>
                              <button onClick={() => toggleBlockType(block.id, 'circuit')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg ${block.type === 'circuit' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}>Circuito</button>
                            </div>
                            {block.type === 'normal' ? (
                              <>
                                {block.exercises?.map((ex) => (
                                  <div key={ex.id} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-zinc-800/50 group">
                                    <div className="flex-1 cursor-pointer" onClick={() => startEditExercise(ex)}>
                                      <p className="font-bold text-sm group-hover:text-[#D4AF37]">{ex.name}</p>
                                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{ex.series} series | {formatTime(ex.totalTime || 0)}</p>
                                      {ex.notes && <p className="text-[10px] text-zinc-600 italic line-clamp-1">{ex.notes}</p>}
                                    </div>
                                    <button onClick={() => removeExerciseFromBlock(block.id, ex.id)} className="text-zinc-700 hover:text-red-500 ml-2"><X size={16} /></button>
                                  </div>
                                ))}
                                <div className={`p-4 rounded-2xl border space-y-4 ${editingExerciseId ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' : 'bg-black/50 border-dashed border-zinc-800'}`}>
                                  <div className="flex flex-col gap-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">{editingExerciseId ? 'Editando' : 'Nuevo Ejercicio'}</h4>
                                    <button 
                                      onClick={() => { setBankTargetBlockId(block.id); setBankTargetType('normal'); setShowBankModal(true); }} 
                                      className="flex items-center justify-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all group"
                                    >
                                      <Search size={14} className="group-hover:scale-110 transition-transform" />
                                      Elegir de Biblioteca
                                    </button>
                                  </div>
                                  <input type="text" placeholder="Nombre" className="w-full bg-transparent border-b border-zinc-800 p-2 text-sm outline-none" value={exName} onChange={(e) => setExName(e.target.value)} />
                                  <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Series" className="bg-zinc-900 p-2 rounded-lg text-center" value={exSeries} onChange={(e) => setExSeries(parseInt(e.target.value) || 0)} />
                                    <input type="text" placeholder="Reps" className="bg-zinc-900 p-2 rounded-lg text-center" value={exReps} onChange={(e) => setExReps(e.target.value)} />
                                    <input type="number" placeholder="Segundos" className="bg-zinc-900 p-2 rounded-lg text-center" value={exTime} onChange={(e) => setExTime(parseInt(e.target.value) || 0)} />
                                    <input type="text" placeholder="Carga" className="bg-zinc-900 p-2 rounded-lg text-center" value={exLoad} onChange={(e) => setExLoad(e.target.value)} />
                                  </div>
                                  <textarea placeholder="Notas / Instrucciones" className="w-full bg-zinc-900 p-2 rounded-lg text-sm resize-none" rows={2} value={exNotes} onChange={(e) => setExNotes(e.target.value)} />
                                  <button onClick={() => addExerciseToBlock(block.id)} className="w-full bg-[#D4AF37] text-black font-bold py-2 rounded-lg">{editingExerciseId ? 'Actualizar' : 'Añadir'}</button>
                                </div>
                              </>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                  <input type="number" className="bg-zinc-900 p-2 rounded-lg text-center text-xs" value={block.circuit?.rounds} onChange={(e) => updateCircuitConfig(block.id, 'rounds', parseInt(e.target.value) || 0)} />
                                  <input type="number" className="bg-zinc-900 p-2 rounded-lg text-center text-xs" value={block.circuit?.restBetweenExercises} onChange={(e) => updateCircuitConfig(block.id, 'restBetweenExercises', parseInt(e.target.value) || 0)} />
                                  <input type="number" className="bg-zinc-900 p-2 rounded-lg text-center text-xs" value={block.circuit?.restBetweenRounds} onChange={(e) => updateCircuitConfig(block.id, 'restBetweenRounds', parseInt(e.target.value) || 0)} />
                                </div>
                                {block.circuit?.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-zinc-800/50 group">
                                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => startEditCircuitItem(item)}>
                                      <span className="w-5 h-5 bg-[#D4AF37] text-black text-[10px] font-black rounded-full flex items-center justify-center">{item.order + 1}</span>
                                      <p className="font-bold text-sm group-hover:text-[#D4AF37]">{item.name}</p>
                                    </div>
                                    <button onClick={() => removeExerciseFromCircuit(block.id, item.id)} className="text-zinc-700 hover:text-red-500"><X size={16} /></button>
                                  </div>
                                ))}
                                <div className={`p-4 rounded-2xl border space-y-4 ${editingItemId ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' : 'bg-black/50 border-dashed border-zinc-800'}`}>
                                  <button 
                                    onClick={() => { setBankTargetBlockId(block.id); setBankTargetType('circuit'); setShowBankModal(true); }} 
                                    className="w-full flex items-center justify-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all group"
                                  >
                                    <Search size={14} className="group-hover:scale-110 transition-transform" />
                                    Elegir de Biblioteca
                                  </button>
                                  <input type="text" placeholder="Nombre" className="w-full bg-transparent border-b border-zinc-800 p-2 text-sm outline-none" value={circExName} onChange={(e) => setCircExName(e.target.value)} />
                                  <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Tiempo" className="bg-zinc-900 p-2 rounded-lg text-center" value={circExTime} onChange={(e) => setCircExTime(parseInt(e.target.value) || 0)} />
                                    <input type="text" placeholder="Reps" className="bg-zinc-900 p-2 rounded-lg text-center" value={circExReps} onChange={(e) => setCircExReps(e.target.value)} />
                                  </div>
                                  <button onClick={() => addExerciseToCircuit(block.id)} className="w-full bg-[#D4AF37] text-black font-bold py-2 rounded-lg">Añadir</button>
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
                disabled={saving || !newName || blocks.length === 0} 
                className="flex-1 bg-[#D4AF37] text-black font-bold py-4 rounded-2xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : null}
                {editingWorkoutId ? 'Actualizar' : 'Guardar Entrenamiento'}
              </button>
              <button onClick={resetForm} disabled={saving} className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-2xl disabled:opacity-50">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="text-[#D4AF37] animate-spin" size={32} /></div> :
            workouts.length === 0 ? <div className="text-center py-20 text-zinc-600 italic">No hay registros</div> :
            workouts.map((item) => (
              <div key={item.id} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="bg-zinc-800 p-3 rounded-xl text-[#D4AF37]"><Dumbbell size={24} /></div>
                    <div>
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold">
                        <Clock size={12} /><span>{item.duration || '0:00'}</span>
                        <span className="mx-1">•</span><span>{item.blocks?.length || 0} Fases</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?share=workout&id=${item.id}`); alert('Enlace copiado'); }} className="p-2 text-zinc-700 hover:text-[#D4AF37]"><Share2 size={18} /></button>
                    {(userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' || item.userId === user?.uid) && (
                      <>
                        <button onClick={() => handleEdit(item)} className="p-2 text-zinc-700 hover:text-[#D4AF37]"><Edit2 size={20} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-700 hover:text-red-500"><Trash2 size={20} /></button>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => handleStartSession(item)} className="w-full mt-6 bg-zinc-800 hover:bg-[#D4AF37] hover:text-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"><Play size={18} />Iniciar Sesión</button>
              </div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-800 p-6 flex flex-col max-h-[85vh] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black">Biblioteca</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Selecciona un ejercicio</p>
                </div>
                <button onClick={() => { setShowBankModal(false); setBankSearchQuery(''); }} className="text-zinc-500 hover:text-white transition-colors p-2">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar ejercicio..."
                    className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-[#D4AF37] transition-all"
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <select 
                  value={bankSelectedCategory}
                  onChange={(e) => setBankSelectedCategory(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-3 px-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#D4AF37] appearance-none cursor-pointer"
                >
                  <option value="all">Todas las Categorías</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filteredBank.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell className="mx-auto text-zinc-800 mb-4 opacity-20" size={48} />
                    <p className="text-zinc-500 text-xs italic">No se encontraron resultados</p>
                  </div>
                ) : filteredBank.map(ex => (
                  <div 
                    key={ex.id} 
                    className="bg-black border border-zinc-800 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:border-[#D4AF37] hover:bg-zinc-900/50 transition-all group" 
                    onClick={() => {
                      if (bankTargetType === 'normal') { 
                        setExName(ex.name); 
                        setExNotes(ex.description || '');
                        // Preserve defaults or existing values if they don't exist in bank
                        setExSeries(ex.series || exSeries || 3); 
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
                      setBankSearchQuery('');
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-bold text-sm group-hover:text-[#D4AF37] transition-colors">{ex.name}</p>
                      {ex.muscleGroup && (
                        <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{ex.muscleGroup}</span>
                      )}
                    </div>
                    <div className="bg-[#D4AF37] text-black p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                      <Plus size={16} />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <button 
                  onClick={() => navigate('/exercise-bank')} 
                  className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                >
                  Gestionar Biblioteca Completa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAthletePicker && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-zinc-900 w-full max-w-sm rounded-[2.5rem] border border-zinc-800 p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black">¿Para quién?</h2><button onClick={() => setShowAthletePicker(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button></div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto mb-6">
                {athletes.map(athlete => (
                  <button key={athlete.id} onClick={() => handlePickAthleteAndStart(athlete.id)} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl flex items-center gap-4 hover:border-[#D4AF37]">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-[#D4AF37]">{athlete.displayName?.[0] || 'A'}</div>
                    <span className="font-bold text-sm">{athlete.displayName}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAthletePicker(false)} className="w-full bg-zinc-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest">Cancelar</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
