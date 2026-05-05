import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Dumbbell, Loader2, Trash2, X, Play, Clock, ChevronDown, ChevronUp, Edit2, Copy, Share2, Search, Zap } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { suggestProgression } from '../services/intelligenceService';
import { Exercise, TrainingBlock } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { SEED_EXERCISES, EXERCISE_CATEGORIES } from '../lib/exerciseSeed';
import { useAuth } from '../context/AuthContext';

export const WorkoutsScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  
  // Resolve context
  const targetUserId = id || location.state?.athleteId || user?.uid || '';
  const isViewingAthlete = !!id || !!location.state?.athleteId;
  const trainerId = userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' ? user?.uid : (userProfile?.trainerId || null) || null;

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showGlobalRoutinesModal, setShowGlobalRoutinesModal] = useState(false);
  const [globalRoutines, setGlobalRoutines] = useState<any[]>([]);
  const [loadingGlobalRoutines, setLoadingGlobalRoutines] = useState(false);
  const [routineSearch, setRoutineSearch] = useState('');
  
  // Workout form state
  const [newName, setNewName] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Exercise form state (for adding/editing)
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exName, setExName] = useState('');
  const [exSeries, setExSeries] = useState(3);
  const [exReps, setExReps] = useState('');
  const [exTime, setExTime] = useState(0);
  const [exLoadType, setExLoadType] = useState<'autocarga' | 'externa'>('autocarga');
  const [exLoadValue, setExLoadValue] = useState('');
  const [exRestSeries, setExRestSeries] = useState(60);
  const [exRestExercise, setExRestExercise] = useState(60);
  const [exNotes, setExNotes] = useState('');

  // Circuit form state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [circExName, setCircExName] = useState('');
  const [circExTime, setCircExTime] = useState(30);
  const [circExReps, setCircExReps] = useState('');
  const [circExLoad, setCircExLoad] = useState('');
  const [circExRpe, setCircExRpe] = useState(0);
  const [circExRest, setCircExRest] = useState(30);

  // Exercise Bank state
  const [exerciseBank, setExerciseBank] = useState<any[]>([]);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankSelectedCategory, setBankSelectedCategory] = useState<string>('all');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankTargetBlockId, setBankTargetBlockId] = useState<string | null>(null);
  const [bankTargetType, setBankTargetType] = useState<'normal' | 'circuit' | null>(null);
  const [isSyncingBank, setIsSyncingBank] = useState(false);

  const handleSyncProBank = async () => {
    if (!trainerId && !user?.uid) return;
    setIsSyncingBank(true);
    try {
      const currentTrainerId = trainerId || user?.uid;
      const batchSize = 10;
      for (let i = 0; i < SEED_EXERCISES.length; i += batchSize) {
        const chunk = SEED_EXERCISES.slice(i, i + batchSize);
        await Promise.all(chunk.map(async (ex) => {
          const existing = exerciseBank.find(e => e.name === ex.name);
          const catIndex = parseInt(ex.moment?.slice(1)) - 1;
          const muscleGroup = EXERCISE_CATEGORIES[catIndex] || EXERCISE_CATEGORIES[2];

          if (!existing) {
            await addDoc(collection(db, 'exerciseBank'), {
              ...ex,
              trainerId: currentTrainerId,
              muscleGroup,
              createdAt: serverTimestamp()
            });
          } else {
            // Update description if it's different or just explicitly sync it
            await updateDoc(doc(db, 'exerciseBank', existing.id), {
              description: ex.description,
              muscleGroup: muscleGroup
            });
          }
        }));
      }
      alert('Banco Pro Sincronizado con éxito');
    } catch (err) {
      console.error('Error syncing bank:', err);
      alert('Error sincronizando banco');
    } finally {
      setIsSyncingBank(false);
    }
  };

  const CATEGORIES = EXERCISE_CATEGORIES;

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
    const q = query(collection(db, 'workouts'), where('userId', '==', targetUserId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkouts(data);
      
      // Auto-set session name for new session
      if (!editingWorkoutId && !newName) {
        const sessionCount = data.length + 1;
        setNewName(`Sesión #${sessionCount}`);
      }
      
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [targetUserId, editingWorkoutId]);

  useEffect(() => {
    const currentTrainerId = trainerId || targetUserId;
    if (!currentTrainerId) return;
    const q = query(collection(db, 'exerciseBank'), where('trainerId', '==', currentTrainerId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExerciseBank(data);
    }, (error) => {
      console.error('Error fetching exercise bank:', error);
    });
    return () => unsubscribe();
  }, [trainerId, targetUserId]);

  useEffect(() => {
    if (showGlobalRoutinesModal && trainerId) {
      const fetchGlobalRoutines = async () => {
        setLoadingGlobalRoutines(true);
        try {
          const q = query(collection(db, 'workouts'), where('userId', '==', trainerId), orderBy('createdAt', 'desc'));
          const snap = await getDocs(q);
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setGlobalRoutines(data);
        } catch (err) {
          console.error("Error fetching global routines", err);
        } finally {
          setLoadingGlobalRoutines(false);
        }
      };
      fetchGlobalRoutines();
    }
  }, [showGlobalRoutinesModal, trainerId]);

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
    const moment = name ? name.split(':')[0].trim() : `M${blocks.length + 1}`;
    const newBlock: TrainingBlock = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Bloque ${blocks.length + 1}`,
      type: 'normal',
      exercises: [],
      totalTime: 0,
      moment: moment as any
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const toggleBlockType = (id: string, type: 'normal' | 'circuit') => {
    setBlocks(blocks.map(b => {
      if (b.id !== id) return b;
      const updatedBlock: any = { ...b, type, exercises: [], totalTime: 0 };
      if (type === 'circuit') {
        updatedBlock.circuit = { rounds: 3, restBetweenExercises: 30, restBetweenRounds: 60, items: [] };
      } else {
        delete updatedBlock.circuit;
      }
      return updatedBlock;
    }));
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
    const blockMoment = blocks.find(b => b.id === blockId)?.moment;
    
    if (editingExerciseId) {
      setBlocks(blocks.map(b => {
        if (b.id === blockId) {
          const updatedExercises = b.exercises.map(ex => 
            ex.id === editingExerciseId 
              ? { ...ex, name: exName, series: exSeries, reps: exReps, timePerSeries: exTime, loadType: exLoadType, loadValue: exLoadValue, restBetweenSeries: `${exRestSeries}s`, restBetweenExercises: `${exRestExercise}s`, notes: exNotes, totalTime, moment: blockMoment }
              : ex
          );
          return { ...b, exercises: updatedExercises, totalTime: updatedExercises.reduce((acc, ex) => acc + (ex.totalTime || 0), 0) };
        }
        return b;
      }));
      setEditingExerciseId(null);
    } else {
      const newExercise: Exercise = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: exName,
        series: exSeries,
        reps: exReps,
        timePerSeries: exTime,
        moment: blockMoment as any,
        loadType: exLoadType,
        loadValue: exLoadValue,
        restBetweenSeries: `${exRestSeries}s`,
        restBetweenExercises: `${exRestExercise}s`,
        notes: exNotes,
        totalTime
      };
      setBlocks(blocks.map(b => {
        if (b.id === blockId) {
          const updatedExercises = [...b.exercises, newExercise];
          return { ...b, exercises: updatedExercises, totalTime: updatedExercises.reduce((acc, ex) => acc + (ex.totalTime || 0), 0) };
        }
        return b;
      }));
    }
    setExName('');
    setExSeries(3);
    setExReps('');
    setExTime(0);
    setExLoadType('autocarga');
    setExLoadValue('');
    setExRestSeries(60);
    setExRestExercise(60);
    setExNotes('');
  };

  const startEditExercise = (ex: Exercise) => {
    setEditingExerciseId(ex.id);
    setExName(ex.name);
    setExSeries(typeof ex.series === 'number' ? ex.series : parseInt(ex.series as string) || 3);
    setExReps(ex.reps || '');
    setExTime(typeof ex.timePerSeries === 'number' ? ex.timePerSeries : parseInt(ex.timePerSeries as string) || 0);
    setExLoadType(ex.loadType || 'autocarga');
    setExLoadValue(ex.loadValue || '');
    setExRestSeries(parseInt(ex.restBetweenSeries || '60') || 60);
    setExRestExercise(parseInt(ex.restBetweenExercises || '60') || 60);
    setExNotes(ex.notes || '');
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

  const addExerciseToCircuit = (blockId: string) => {
    if (!circExName) return;
    const blockMoment = blocks.find(b => b.id === blockId)?.moment;

    if (editingItemId) {
      setBlocks(blocks.map(b => {
        if (b.id === blockId && b.type === 'circuit' && b.circuit) {
          const updatedItems = b.circuit.items.map(item => 
            item.id === editingItemId 
              ? { ...item, name: circExName, time: circExTime, reps: circExReps, load: circExLoad, rpe: circExRpe, rest: circExRest, moment: blockMoment }
              : item
          );
          const workTime = updatedItems.reduce((acc, item) => acc + (item.time || 0), 0);
          const restExTime = Math.max(0, updatedItems.length - 1) * b.circuit.restBetweenExercises;
          const roundTime = workTime + restExTime;
          const totalTime = (roundTime * b.circuit.rounds) + (b.circuit.restBetweenRounds * (b.circuit.rounds - 1));
          return { ...b, circuit: { ...b.circuit, items: updatedItems }, totalTime };
        }
        return b;
      }));
      setEditingItemId(null);
    } else {
      const newItem = { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name: circExName, time: circExTime, reps: circExReps, load: circExLoad, rpe: circExRpe, rest: circExRest, moment: blockMoment, order: 0 };
      setBlocks(blocks.map(b => {
        if (b.id === blockId && b.type === 'circuit' && b.circuit) {
          const updatedItems = [...b.circuit.items, newItem].map((item, idx) => ({ ...item, order: idx }));
          const workTime = updatedItems.reduce((acc, item) => acc + (item.time || 0), 0);
          const restExTime = Math.max(0, updatedItems.length - 1) * b.circuit.restBetweenExercises;
          const roundTime = workTime + restExTime;
          const totalTime = (roundTime * b.circuit.rounds) + (b.circuit.restBetweenRounds * (b.circuit.rounds - 1));
          return { ...b, circuit: { ...b.circuit, items: updatedItems }, totalTime };
        }
        return b;
      }));
    }
    setCircExName('');
    setCircExTime(30);
    setCircExReps('');
    setCircExLoad('');
    setCircExRpe(0);
    setCircExRest(30);
  };

  const startEditCircuitItem = (item: any) => {
    setEditingItemId(item.id);
    setCircExName(item.name);
    setCircExTime(item.time ?? 30);
    setCircExReps(item.reps || '');
    setCircExLoad(item.load || '');
    setCircExRpe(item.rpe ?? 0);
    setCircExRest(item.rest ?? 30);
  };

  const applyTabataPreset = (blockId: string) => {
    // Update local form state for the next exercise to be added
    setCircExTime(20);
    setCircExRest(10);

    setBlocks(blocks.map(b => {
      if (b.id === blockId && b.type === 'circuit' && b.circuit) {
        const updatedCircuit = { 
          ...b.circuit, 
          rounds: 8, 
          restBetweenExercises: 10, 
          restBetweenRounds: 60 
        };
        // Apply 20s to all items in the circuit
        const updatedItems = updatedCircuit.items.map(item => ({ ...item, time: 20 }));
        updatedCircuit.items = updatedItems;
        
        const workTime = updatedItems.reduce((acc, item) => acc + (item.time || 0), 0);
        const restExTime = Math.max(0, updatedItems.length - 1) * updatedCircuit.restBetweenExercises;
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
        const workTime = updatedItems.reduce((acc, item) => acc + (item.time || 0), 0);
        const restExTime = Math.max(0, updatedItems.length - 1) * b.circuit.restBetweenExercises;
        const roundTime = workTime + restExTime;
        const totalTime = (roundTime * b.circuit.rounds) + (b.circuit.restBetweenRounds * (b.circuit.rounds - 1));
        return { ...b, circuit: { ...b.circuit, items: updatedItems }, totalTime };
      }
      return b;
    }));
  };

  const removeExerciseFromBlock = (blockId: string, exerciseId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        const updatedExercises = b.exercises.filter(ex => ex.id !== exerciseId);
        return { ...b, exercises: updatedExercises, totalTime: updatedExercises.reduce((acc, ex) => acc + (ex.totalTime || 0), 0) };
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
      const currentUserId = targetUserId || user?.uid;
      const currentTrainerId = trainerId || user?.uid;

      if (!currentUserId) {
        throw new Error('No se pudo identificar al usuario/atleta.');
      }

      // Cleanup undefined values and prepare blocks
      const cleanedBlocks = blocks.map(block => {
        const b = { ...block };
        if (b.type !== 'circuit') {
          delete (b as any).circuit;
        }
        return b;
      });

      const workoutData: any = {
        name: newName.trim(),
        objective: newObjective.trim(),
        date: sessionDate,
        sessionNumber: workouts.length + 1,
        duration: formatTime(sessionTotalTime),
        totalTime: sessionTotalTime,
        blocks: cleanedBlocks,
        userId: currentUserId,
        trainerId: currentTrainerId || null,
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

      alert(editingWorkoutId ? 'Entrenamiento actualizado' : 'Entrenamiento guardado con éxito');
      resetForm();
    } catch (error: any) {
      console.error('Error saving workout:', error);
      const errorMessage = error.message || 'Error desconocido al guardar';
      alert(`No se pudo guardar: ${errorMessage}`);
      
      try {
        handleFirestoreError(error, editingWorkoutId ? OperationType.UPDATE : OperationType.CREATE, 'workouts');
      } catch (e) {
        // Error already logged and reported to user
      }
    } finally {
      setSaving(false);
    }
  };

  const loadStandardStructure = () => {
    CATEGORIES.forEach(cat => {
      if (!blocks.some(b => b.name === cat)) {
        addBlock(cat);
      }
    });
  };

  const resetForm = () => {
    setNewName('');
    setNewObjective('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setBlocks([]);
    setIsAdding(false);
    setEditingWorkoutId(null);
    setActiveBlockId(null);
    setEditingExerciseId(null);
  };

  const normalizeMoments = () => {
    setBlocks(prev => prev.map(block => {
      const match = block.name.match(/^M([1-5]):/);
      if (match) {
        const momentNum = match[1];
        const newCat = EXERCISE_CATEGORIES.find(c => c.startsWith(`M${momentNum}:`));
        if (newCat) {
          return { ...block, name: newCat };
        }
      }
      return block;
    }));
    alert('Nombres de momentos actualizados a la nueva versión.');
  };

  const handleEdit = (workout: any) => {
    setNewName(workout.name);
    setNewObjective(workout.objective || '');
    setSessionDate(workout.date || new Date().toISOString().split('T')[0]);
    setBlocks(workout.blocks || []);
    setEditingWorkoutId(workout.id);
    setIsAdding(true);
    if (workout.blocks?.length > 0) setActiveBlockId(workout.blocks[0].id);
  };

  const handleImportGlobalRoutine = (routine: any) => {
    setNewName(routine.name);
    setBlocks(routine.blocks || []);
    if (routine.blocks?.length > 0) setActiveBlockId(routine.blocks[0].id);
    setShowGlobalRoutinesModal(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro?')) {
      try {
        await deleteDoc(doc(db, 'workouts', id));
        alert('Eliminado');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'workouts');
      }
    }
  };

  const [showAthletePicker, setShowAthletePicker] = useState(false);
  const [selectedWorkoutForSession, setSelectedWorkoutForSession] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);

  useEffect(() => {
    if (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin') {
      const q = query(collection(db, 'users'), where('role', '==', 'client'), orderBy('displayName', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
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

  const handlePickAthleteAndStart = (athleteId: string) => {
    if (!selectedWorkoutForSession) return;
    setShowAthletePicker(false);
    navigate(`/ejecucion-sesion`, { state: { ...selectedWorkoutForSession, athleteId } });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => isAdding ? resetForm() : navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold">
            {isAdding ? (editingWorkoutId ? 'Editar Entrenamiento' : 'Nuevo Entrenamiento') : 
            (isViewingAthlete ? 'Entrenamientos de Atleta' : 'Mis Entrenamientos')}
          </h1>
        </div>
        {!isAdding && (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin') && (
          <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-[#D4AF37] text-black p-2 rounded-xl"><Plus size={24} /></button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {isAdding ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h2 className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest text-[10px]">Información General</h2>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowGlobalRoutinesModal(true)} className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded-full border border-[#D4AF37]/20"><Copy size={12} /> Global</button>
                  <button onClick={() => setShowOverview(!showOverview)} className="text-[10px] font-black uppercase text-zinc-500">{showOverview ? 'Cerrar' : 'Resumen'}</button>
                  <div className="flex items-center gap-2 text-[#D4AF37] font-black"><Clock size={16} /><span>{formatTime(sessionTotalTime)}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] uppercase text-zinc-500 ml-2">Nombre de Sesión</label>
                  <input type="text" placeholder="Sesión #..." className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] uppercase text-zinc-500 ml-2">Fecha</label>
                  <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none text-white appearance-none" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase text-zinc-500 ml-2">Objetivo de la sesión</label>
                <textarea 
                  placeholder="Ej: Mejora de la potencia aeróbica y técnica de pase..." 
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none resize-none h-20" 
                  value={newObjective} 
                  onChange={(e) => setNewObjective(e.target.value)} 
                />
              </div>
            </div>

            <AnimatePresence>
              {showOverview && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-3">Esquema</h3>
                  {blocks.length === 0 ? <p className="text-xs text-zinc-600 italic">Sin categorías</p> : (
                    <div className="space-y-2">
                      {blocks.map((b, idx) => (
                        <div key={b.id} className="text-xs flex gap-2">
                          <span className="text-[#D4AF37] font-black">{idx + 1}.</span>
                          <span className="font-bold">{b.name}</span>
                          <span className="text-zinc-500">({b.exercises?.length || b.circuit?.items.length || 0} Ej.)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <h2 className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest text-[10px]">Estructura</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button 
                    onClick={loadStandardStructure} 
                    className="sm:col-span-2 w-full bg-amber-500/10 text-amber-500 border border-amber-500/20 p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-500/20 transition-all flex items-center justify-center gap-3 mb-2"
                  >
                    <Zap size={16} fill="currentColor" /> Autocargar Estructura (M1-M5)
                  </button>
                  <button 
                    onClick={normalizeMoments} 
                    className="sm:col-span-2 w-full bg-zinc-800 text-zinc-400 border border-zinc-700 p-3 rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 mb-2"
                  >
                    Normalizar Sesión Antigua
                  </button>
                  {CATEGORIES.map((cat, idx) => {
                    const isAdded = blocks.some(b => b.name === cat);
                    return (
                      <button key={cat} onClick={() => addBlock(cat)} disabled={isAdded} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-[10px] uppercase font-black tracking-widest transition-all ${isAdded ? 'bg-zinc-800/20 border-zinc-800 text-zinc-600' : 'bg-[#D4AF37]/5 text-[#D4AF37] border-[#D4AF37]/20 hover:bg-[#D4AF37]/10'}`}>
                        <span>{idx + 1}. {cat}</span>
                        {!isAdded && <Plus size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                {blocks.map((block) => (
                  <div key={block.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 bg-zinc-800/30 flex items-center justify-between cursor-pointer" onClick={() => setActiveBlockId(activeBlockId === block.id ? null : block.id)}>
                      <input type="text" value={block.name} onChange={(e) => updateBlockName(block.id, e.target.value)} onClick={(e) => e.stopPropagation()} className="bg-transparent font-bold text-lg outline-none focus:text-[#D4AF37] w-full" />
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-zinc-500 bg-black/50 px-3 py-1 rounded-full">{formatTime(block.totalTime || 0)}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="text-zinc-600 hover:text-red-500"><Trash2 size={18} /></button>
                        {activeBlockId === block.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    <AnimatePresence>
                      {activeBlockId === block.id && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-zinc-800">
                          <div className="p-4 space-y-4">
                            <div className="flex bg-black/50 p-1 rounded-xl border border-zinc-800">
                              <button onClick={() => toggleBlockType(block.id, 'normal')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${block.type === 'normal' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}>Normal</button>
                              <button onClick={() => toggleBlockType(block.id, 'circuit')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${block.type === 'circuit' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}>Circuito</button>
                            </div>
                            
                            {block.type === 'normal' ? (
                              <div className="space-y-4">
                                 {block.exercises?.map((ex) => (
                                  <div key={ex.id} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-zinc-800 group" onClick={() => startEditExercise(ex)}>
                                    <div className="flex-1">
                                      <p className="font-bold text-sm group-hover:text-[#D4AF37]">{ex.name}</p>
                                      <div className="flex gap-2 text-[9px] text-zinc-500 font-black uppercase mt-0.5">
                                        <span>{ex.series} series</span>
                                        <span>•</span>
                                        <span>{ex.reps || ex.timePerSeries + 's'}</span>
                                        <span>•</span>
                                        <span className={ex.loadType === 'externa' ? 'text-amber-500' : ''}>
                                          {ex.loadType === 'externa' ? `${ex.loadValue || '?'}` : 'Autocarga'}
                                        </span>
                                      </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeExerciseFromBlock(block.id, ex.id); }} className="text-zinc-700 hover:text-red-500"><X size={16} /></button>
                                  </div>
                                ))}
                                
                                <button 
                                  onClick={() => { setBankTargetBlockId(block.id); setBankTargetType('normal'); setShowBankModal(true); }}
                                  className="w-full py-3 border border-dashed border-[#D4AF37]/30 text-[#D4AF37] rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                  <Search size={14} /> Importar de Biblioteca
                                </button>

                                 <div className="p-4 rounded-2xl border border-dashed border-zinc-800 space-y-4">
                                  <div className="flex gap-2">
                                    <input type="text" placeholder="Nombre del ejercicio" className="flex-1 bg-transparent border-b border-zinc-800 p-2 text-sm outline-none" value={exName} onChange={(e) => setExName(e.target.value)} />
                                    <button onClick={() => { setBankTargetBlockId(block.id); setBankTargetType('normal'); setShowBankModal(true); }} className="p-2 text-zinc-500 hover:text-[#D4AF37]"><Search size={18} /></button>
                                  </div>
                                  
                                  <div className="flex bg-black/40 p-1 rounded-xl border border-zinc-800">
                                    <button onClick={() => setExLoadType('autocarga')} className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${exLoadType === 'autocarga' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}>Autocarga</button>
                                    <button onClick={() => setExLoadType('externa')} className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${exLoadType === 'externa' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}>Carga Externa</button>
                                  </div>

                                  <div className="grid grid-cols-2 xs:grid-cols-4 gap-3">
                                    <div className="flex flex-col">
                                      <label className="text-[8px] uppercase text-zinc-500 ml-1 mb-1">Series</label>
                                      <input type="number" className="bg-zinc-950 p-2 rounded-lg text-center font-bold text-sm border border-zinc-900" value={exSeries ?? 3} onChange={(e) => setExSeries(parseInt(e.target.value) || 1)} />
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-[8px] uppercase text-zinc-500 ml-1 mb-1">Reps/Tiempo</label>
                                      <input type="text" placeholder="10 ó 30s" className="bg-zinc-950 p-2 rounded-lg text-center font-bold text-sm border border-zinc-900" value={exReps || ''} onChange={(e) => setExReps(e.target.value)} />
                                    </div>
                                    {exLoadType === 'externa' && (
                                      <div className="flex flex-col">
                                        <label className="text-[8px] uppercase text-zinc-500 ml-1 mb-1">Kg / Lbs</label>
                                        <input type="text" placeholder="Ej: 20kg" className="bg-zinc-950 p-2 rounded-lg text-center font-bold text-[#D4AF37] text-sm border border-zinc-900" value={exLoadValue || ''} onChange={(e) => setExLoadValue(e.target.value)} />
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <label className="text-[8px] uppercase text-zinc-500 ml-1 mb-1">D. Serie (s)</label>
                                      <input type="number" className="bg-zinc-950 p-2 rounded-lg text-center font-bold text-sm border border-zinc-900" value={exRestSeries ?? 60} onChange={(e) => setExRestSeries(parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-[8px] uppercase text-zinc-500 ml-1 mb-1">D. Ejerc. (s)</label>
                                      <input type="number" className="bg-zinc-950 p-2 rounded-lg text-center font-bold text-sm border border-zinc-900" value={exRestExercise ?? 60} onChange={(e) => setExRestExercise(parseInt(e.target.value) || 0)} />
                                    </div>
                                  </div>
                                  
                                  <textarea 
                                    placeholder="Observación opcional..." 
                                    className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-[10px] outline-none focus:border-[#D4AF37] resize-none h-16" 
                                    value={exNotes} 
                                    onChange={(e) => setExNotes(e.target.value)} 
                                  />
                                  
                                  <button onClick={() => addExerciseToBlock(block.id)} className="w-full bg-[#D4AF37] text-black font-black uppercase text-[10px] py-3.5 rounded-xl hover:shadow-[0_0_20px_-5px_rgba(212,175,55,0.4)] transition-all active:scale-95">{editingExerciseId ? 'Actualizar Ejercicio' : 'Añadir Ejercicio'}</button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div className="bg-black/40 rounded-2xl border border-zinc-800 overflow-hidden">
                                  <div className="bg-zinc-800/50 px-4 py-2.5 flex items-center justify-between border-b border-zinc-800">
                                    <div className="flex items-center gap-2">
                                      <Zap size={14} className="text-orange-500" />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Configuración del Circuito</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => {
                                          if (!block.circuit?.items?.length) return alert('Agregue ejercicios al circuito primero');
                                          navigate('/ejecucion-circuito', { state: { circuit: block.circuit, workoutName: block.name } });
                                        }}
                                        className="bg-emerald-500 text-black px-3 py-1.5 rounded-full hover:bg-emerald-400 transition-all text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5"
                                      >
                                        <Play size={10} fill="black" />
                                        INICIAR YA
                                      </button>
                                      <button 
                                        onClick={() => applyTabataPreset(block.id)}
                                        className="group bg-gradient-to-r from-orange-500/20 to-red-500/10 text-orange-400 px-3 py-1.5 rounded-full border border-orange-500/30 hover:border-orange-500 transition-all text-[9px] font-black uppercase tracking-tighter flex items-center gap-2 active:scale-95"
                                      >
                                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                        PRESET TABATA
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 divide-x divide-zinc-800">
                                    <div className="p-4 flex flex-col items-center">
                                      <label className="text-[8px] uppercase text-zinc-500 mb-1">Rondas</label>
                                      <input 
                                        type="number" 
                                        className="bg-transparent text-center font-black text-xl text-orange-500 outline-none w-full" 
                                        value={block.circuit?.rounds ?? 3} 
                                        onChange={(e) => updateCircuitConfig(block.id, 'rounds', parseInt(e.target.value) || 1)} 
                                      />
                                    </div>
                                    <div className="p-4 flex flex-col items-center">
                                      <label className="text-[8px] uppercase text-zinc-500 mb-1">D. Ej. (s)</label>
                                      <input 
                                        type="number" 
                                        className="bg-transparent text-center font-black text-xl text-white outline-none w-full" 
                                        value={block.circuit?.restBetweenExercises ?? 30} 
                                        onChange={(e) => updateCircuitConfig(block.id, 'restBetweenExercises', parseInt(e.target.value) || 0)} 
                                      />
                                    </div>
                                    <div className="p-4 flex flex-col items-center">
                                      <label className="text-[8px] uppercase text-zinc-500 mb-1">D. Rd. (s)</label>
                                      <input 
                                        type="number" 
                                        className="bg-transparent text-center font-black text-xl text-white outline-none w-full" 
                                        value={block.circuit?.restBetweenRounds ?? 60} 
                                        onChange={(e) => updateCircuitConfig(block.id, 'restBetweenRounds', parseInt(e.target.value) || 0)} 
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Orden de ejecución</h4>
                                    <span className="text-[10px] font-medium text-zinc-600">{block.circuit?.items.length || 0} EJERCICIOS</span>
                                  </div>

                                  <button 
                                    onClick={() => { setBankTargetBlockId(block.id); setBankTargetType('circuit'); setShowBankModal(true); }}
                                    className="w-full py-3 border border-dashed border-orange-500/30 text-orange-500 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-500/5 hover:bg-orange-500/10 flex items-center justify-center gap-2 transition-all active:scale-95"
                                  >
                                    <Search size={14} /> Importar de Biblioteca
                                  </button>

                                  <div className="space-y-2">
                                    {block.circuit?.items.map((item, idx) => (
                                      <div 
                                        key={item.id} 
                                        className="flex items-center gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 hover:border-orange-500/30 transition-colors group" 
                                        onClick={() => startEditCircuitItem(item)}
                                      >
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-zinc-700">
                                          {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                          <p className="font-bold text-sm text-zinc-200 group-hover:text-orange-400 transition-colors">{item.name}</p>
                                          <div className="flex gap-3 text-[9px] font-black uppercase tracking-tighter text-zinc-500 mt-0.5">
                                            <span>Trabajo: {item.time}s</span>
                                            <span>Descanso: {item.rest || 0}s</span>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); removeExerciseFromCircuit(block.id, item.id); }} 
                                          className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mt-6 bg-zinc-900/40 p-4 rounded-3xl border border-dashed border-zinc-800 space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400 mb-1">
                                      <Plus size={12} className="text-orange-500" />
                                      <span>Añadir al circuito</span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <div className="flex-1 relative">
                                        <input 
                                          type="text" 
                                          placeholder="Nombre del ejercicio..." 
                                          className="w-full bg-black/40 border border-zinc-800 p-3 pl-4 rounded-xl text-sm outline-none focus:border-orange-500/50" 
                                          value={circExName} 
                                          onChange={(e) => setCircExName(e.target.value)} 
                                        />
                                        <button 
                                          onClick={() => { setBankTargetBlockId(block.id); setBankTargetType('circuit'); setShowBankModal(true); }} 
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-orange-500"
                                        >
                                          <Search size={18} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="flex flex-col">
                                        <label className="text-[8px] uppercase text-zinc-500 ml-1 mb-1">Trabajo (s)</label>
                                        <input type="number" className="bg-black/60 p-2.5 rounded-xl text-center text-sm font-bold border border-zinc-800 focus:border-orange-500/50 outline-none" value={circExTime ?? 30} onChange={(e) => setCircExTime(parseInt(e.target.value) || 0)} />
                                      </div>
                                      <div className="flex flex-col">
                                        <label className="text-[8px] uppercase text-zinc-500 ml-1 mb-1">Descanso (s)</label>
                                        <input type="number" className="bg-black/60 p-2.5 rounded-xl text-center text-sm font-bold border border-zinc-800 focus:border-orange-500/50 outline-none" value={circExRest ?? 30} onChange={(e) => setCircExRest(parseInt(e.target.value) || 0)} />
                                      </div>
                                    </div>

                                    <button 
                                      onClick={() => addExerciseToCircuit(block.id)} 
                                      disabled={!circExName}
                                      className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:hover:bg-orange-600 text-black font-black uppercase text-[10px] tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-900/10"
                                    >
                                      {editingItemId ? 'Actualizar Ejercicio' : 'Insertar en Circuito'}
                                    </button>
                                  </div>
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
              <button disabled={saving || !newName || blocks.length === 0} onClick={handleAddWorkout} className="flex-1 bg-[#D4AF37] text-black font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                {saving && <Loader2 className="animate-spin" size={18} />}
                {editingWorkoutId ? 'Actualizar' : 'Guardar'}
              </button>
              <button onClick={resetForm} className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-2xl">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="text-[#D4AF37] animate-spin" size={32} /></div> :
            workouts.length === 0 ? <p className="text-center py-20 text-zinc-600 italic">No hay rutinas</p> :
            workouts.map((item) => (
              <div key={item.id} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-zinc-800 p-3 rounded-xl text-[#D4AF37]"><Dumbbell size={24} /></div>
                    <div>
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <p className="text-xs text-zinc-500 font-bold">{item.duration} • {item.blocks?.length || 0} Fases</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(item)} className="p-2 text-zinc-600 hover:text-[#D4AF37]"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-600 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>
                <button onClick={() => handleStartSession(item)} className="w-full bg-zinc-800 hover:bg-[#D4AF37] hover:text-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"><Play size={18} /> Iniciar</button>
              </div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-white">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 w-full max-w-lg rounded-3xl p-6 flex flex-col max-h-[80vh]">
              <div className="flex justify-between mb-4">
                <div className="flex flex-col">
                  <h2 className="font-black uppercase text-sm tracking-widest text-[#D4AF37]">Biblioteca Elite ({exerciseBank.length})</h2>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">100 Ejercicios Gamificados</p>
                </div>
                <div className="flex items-center gap-3">
                  {(userProfile?.role === 'trainer' || userProfile?.role === 'superadmin') && (
                    <button 
                      onClick={handleSyncProBank} 
                      disabled={isSyncingBank}
                      className="text-[8px] font-black uppercase bg-[#D4AF37] text-black px-2 py-1 rounded-full flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSyncingBank ? <Loader2 className="animate-spin" size={10} /> : <Zap size={10} />}
                      Sync Pro
                    </button>
                  )}
                  <button onClick={() => setShowBankModal(false)} className="p-2 bg-black rounded-full"><X size={20}/></button>
                </div>
              </div>
              <input type="text" placeholder="Buscar ejercicio o momento..." className="w-full bg-black border border-zinc-800 p-3 rounded-xl mb-3 outline-none focus:border-[#D4AF37] transition-all" value={bankSearchQuery} onChange={(e) => setBankSearchQuery(e.target.value)} />
              
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
                <button 
                  onClick={() => setBankSelectedCategory('all')}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all ${bankSelectedCategory === 'all' ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'bg-black border-zinc-800 text-zinc-500'}`}
                >
                  TODOS
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setBankSelectedCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all ${bankSelectedCategory === cat ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'bg-black border-zinc-800 text-zinc-500'}`}
                  >
                    {cat.split(':')[0]}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto space-y-2 flex-1 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {exerciseBank.length === 0 && !isSyncingBank && (
                   <div className="text-center py-10 border border-dashed border-zinc-800 rounded-3xl bg-black/20">
                      <Zap size={32} className="mx-auto mb-3 text-[#D4AF37]" strokeWidth={1} />
                      <p className="text-xs font-bold text-zinc-400 mb-4 px-6">Tu banco de ejercicios está vacío. ¿Deseas cargar los 100 ejercicios del sistema gamificado?</p>
                      <button 
                        onClick={handleSyncProBank}
                        className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                      >
                        Sincronizar Banco Élite
                      </button>
                   </div>
                )}
                {filteredBank.map(ex => (
                  <div key={ex.id} className="p-4 bg-black border border-zinc-800 rounded-2xl flex justify-between items-center group cursor-pointer hover:border-[#D4AF37] transition-all" onClick={() => {
                    if (bankTargetType === 'normal') {
                      const newEx: Exercise = {
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name: ex.name,
                        series: 3,
                        reps: '',
                        timePerSeries: ex.time || 0,
                        load: '',
                        rpe: 0,
                        rest: ex.rest || 60,
                        notes: ex.desc || ex.description || '',
                        totalTime: calculateExerciseTotalTime(3, ex.time || 0)
                      };
                      setBlocks(blocks.map(b => {
                        if (b.id === bankTargetBlockId) {
                          const updatedExercises = [...b.exercises, newEx];
                          return { ...b, exercises: updatedExercises, totalTime: updatedExercises.reduce((acc, e) => acc + (e.totalTime || 0), 0) };
                        }
                        return b;
                      }));
                    } else {
                      const newItem = { 
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
                        name: ex.name, 
                        time: ex.time || 30, 
                        reps: '', 
                        load: '', 
                        rpe: 0, 
                        rest: ex.rest || 30, 
                        order: 0 
                      };
                      setBlocks(blocks.map(b => {
                        if (b.id === bankTargetBlockId && b.type === 'circuit' && b.circuit) {
                          const updatedItems = [...b.circuit.items, newItem].map((item, idx) => ({ ...item, order: idx }));
                          const workTime = updatedItems.reduce((acc, item) => acc + (item.time || 0), 0);
                          const restExTime = Math.max(0, updatedItems.length - 1) * b.circuit.restBetweenExercises;
                          const roundTime = workTime + restExTime;
                          const totalTime = (roundTime * b.circuit.rounds) + (b.circuit.restBetweenRounds * (b.circuit.rounds - 1));
                          return { ...b, circuit: { ...b.circuit, items: updatedItems }, totalTime };
                        }
                        return b;
                      }));
                    }
                    setShowBankModal(false);
                  }}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {ex.env === 'field' || ex.env === 'all' ? <span className="text-[10px]">🟢</span> : ex.env === 'restricted' ? <span className="text-[10px]">🟡</span> : <span className="text-[10px]">🔴</span>}
                        <span className="font-bold text-sm">{ex.name}</span>
                      </div>
                      <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter mt-1">{ex.muscleGroup}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[7px] font-black bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded uppercase">{ex.moment || 'M3'}</span>
                       <Plus size={16} className="text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
                {filteredBank.length === 0 && (
                  <div className="text-center py-10 opacity-30">
                    <Search size={40} className="mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No se encontraron resultados</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlobalRoutinesModal && (
          <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900 w-full max-w-lg rounded-3xl p-6 flex flex-col max-h-[80vh]">
              <div className="flex justify-between mb-6">
                <h2 className="text-xl font-bold">Importar Global</h2>
                <button onClick={() => setShowGlobalRoutinesModal(false)}><X size={24} /></button>
              </div>
              <div className="overflow-y-auto space-y-3">
                {loadingGlobalRoutines ? <Loader2 className="animate-spin mx-auto"/> :
                globalRoutines.map(r => (
                  <button key={r.id} onClick={() => handleImportGlobalRoutine(r)} className="w-full text-left p-4 bg-black border border-zinc-800 rounded-2xl hover:border-[#D4AF37]">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-xs text-zinc-500">{r.blocks?.length || 0} Bloques</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAthletePicker && (
          <div className="fixed inset-0 bg-black/90 z-[130] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-4">Seleccionar Atleta</h2>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto mb-6">
                {athletes.map(a => (
                  <button key={a.id} onClick={() => handlePickAthleteAndStart(a.id)} className="w-full text-left p-4 bg-black border border-zinc-800 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-[#D4AF37]">{a.displayName?.[0]}</div>
                    <span className="font-bold">{a.displayName}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAthletePicker(false)} className="w-full py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest text-zinc-500">Cancelar</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
