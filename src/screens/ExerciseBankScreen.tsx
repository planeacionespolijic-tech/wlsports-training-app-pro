import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Dumbbell, Video, Trash2, Edit2, Loader2, X, Play, Zap } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ConfirmationModal } from '../components/ConfirmationModal';

import { EXERCISE_CATEGORIES } from '../lib/exerciseSeed';

interface ExerciseBankScreenProps {
  onBack: () => void;
  userId?: string;
  userProfile?: any;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  description: string;
  videoUrl: string;
  trainerId: string;
}

const CATEGORIES = EXERCISE_CATEGORIES;

export const ExerciseBankScreen = ({ onBack }: ExerciseBankScreenProps) => {
  const { user, userProfile, isTrainer } = useAuth();
  const userId = user?.uid;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncProBank = async () => {
    if (!userId) return;
    const { SEED_EXERCISES } = await import('../lib/exerciseSeed');
    setIsSyncing(true);
    try {
      const batchSize = 10;
      for (let i = 0; i < SEED_EXERCISES.length; i += batchSize) {
        const chunk = SEED_EXERCISES.slice(i, i + batchSize);
        await Promise.all(chunk.map(async (ex) => {
          const existing = exercises.find(e => e.name === ex.name);
          const catIndex = parseInt(ex.moment?.slice(1)) - 1;
          const muscleGroup = EXERCISE_CATEGORIES[catIndex] || EXERCISE_CATEGORIES[2];

          if (!existing) {
            await addDoc(collection(db, 'exerciseBank'), {
              ...ex,
              trainerId: userId,
              muscleGroup,
              createdAt: serverTimestamp()
            });
          } else {
            // Update description if it's different or the exercise was previously seeded with old description
            await updateDoc(doc(db, 'exerciseBank', existing.id), {
              description: ex.description,
              muscleGroup: muscleGroup // Ensure category is correct too
            });
          }
        }));
      }
      alert('Banco Pro Sincronizado con éxito');
    } catch (err) {
      console.error('Error syncing bank:', err);
      alert('Error sincronizando banco');
    } finally {
      setIsSyncing(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: CATEGORIES[0],
    description: '',
    videoUrl: ''
  });

  useEffect(() => {
    if (!userId && userProfile?.role !== 'superadmin') return;

    let q;
    
    if (userProfile?.role === 'superadmin') {
      q = query(
        collection(db, 'exerciseBank'),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'exerciseBank'),
        where('trainerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
      setExercises(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'exerciseBank');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingExercise) {
        await updateDoc(doc(db, 'exerciseBank', editingExercise.id), {
          ...formData
        });
      } else {
        await addDoc(collection(db, 'exerciseBank'), {
          ...formData,
          trainerId: userId,
          createdAt: serverTimestamp()
        });
      }
      handleCloseModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'exerciseBank');
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<{id: string, name: string} | null>(null);

  const handleDelete = async (id: string, name: string) => {
    setExerciseToDelete({ id, name });
  };

  const confirmDelete = async () => {
    if (!exerciseToDelete) return;
    
    setDeletingId(exerciseToDelete.id);
    try {
      await deleteDoc(doc(db, 'exerciseBank', exerciseToDelete.id));
      setExerciseToDelete(null);
    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      alert('Error al eliminar: ' + (error.message || 'Sin permisos'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name || '',
      muscleGroup: exercise.muscleGroup || CATEGORIES[0],
      description: exercise.description || '',
      videoUrl: exercise.videoUrl || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExercise(null);
    setFormData({ name: '', muscleGroup: CATEGORIES[0], description: '', videoUrl: '' });
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || ex.muscleGroup === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-3">
              Banco de Ejercicios
              {!loading && exercises.length > 0 && (
                <span className="bg-[#D4AF37] text-black text-[10px] px-2 py-0.5 rounded-full font-black">
                  {exercises.length}
                </span>
              )}
            </h1>
            <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Gestión de Biblioteca</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTrainer && (
            <>
              <button 
                onClick={handleSyncProBank} 
                disabled={isSyncing}
                className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              >
                {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                Sync Pro 100
              </button>
            </>
          )}
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text"
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 text-xs font-black uppercase tracking-widest outline-none focus:border-[#D4AF37] appearance-none cursor-pointer"
            >
              <option value="all">Todas las Categorías</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cargando Biblioteca...</p>
            </div>
          ) : exercises.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-[2.5rem] text-center space-y-6">
              <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto">
                <Dumbbell className="text-zinc-600" size={40} />
              </div>
              <div>
                <h2 className="text-xl font-black mb-2">Biblioteca Vacía</h2>
                <p className="text-zinc-500 text-sm max-w-xs mx-auto">Configura tu base de datos con los 100 ejercicios de élite gamificados del sistema WL Sports.</p>
              </div>
              <button 
                onClick={handleSyncProBank}
                disabled={isSyncing}
                className="bg-[#D4AF37] text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto disabled:opacity-50 shadow-xl shadow-[#D4AF37]/10"
              >
                {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                Cargar Banco Pro (100+)
              </button>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-[2.5rem] text-center space-y-4">
              <Search className="mx-auto text-zinc-800" size={48} />
              <p className="text-zinc-600 italic text-sm">No se encontraron resultados para "{searchQuery}"</p>
              <button 
                onClick={() => {setSearchQuery(''); setSelectedCategory('all');}}
                className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map(exercise => (
                <div key={exercise.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 hover:border-[#D4AF37]/50 transition-colors group flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-[#D4AF37]/10 p-2.5 rounded-xl">
                      <Dumbbell className="text-[#D4AF37]" size={20} />
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(exercise);
                        }} 
                        className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-colors" 
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(exercise.id, exercise.name);
                        }} 
                        disabled={deletingId === exercise.id}
                        className="p-2 text-zinc-400 hover:text-red-500 bg-zinc-800 rounded-lg transition-colors disabled:opacity-50" 
                        title="Eliminar"
                      >
                        {deletingId === exercise.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1 line-clamp-1">{exercise.name}</h3>
                  {exercise.muscleGroup && (
                    <span className="inline-block bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-3 self-start">
                      {exercise.muscleGroup}
                    </span>
                  )}
                  <p className="text-[11px] text-zinc-500 line-clamp-3 mb-4 flex-1 leading-relaxed">
                    {(exercise as any).desc || exercise.description || 'Sin descripción'}
                  </p>
                  <div className="flex gap-2">
                    {exercise.videoUrl && (
                      <a 
                        href={exercise.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 bg-black border border-zinc-800 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:border-[#D4AF37] transition-colors mt-auto"
                      >
                        <Play size={14} /> Ver
                      </a>
                    )}
                    <span className="text-[7px] font-black text-zinc-600 bg-zinc-800/50 px-2 py-2 rounded flex items-center">
                      {(exercise as any).moment || 'EX'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        <ConfirmationModal 
          isOpen={!!exerciseToDelete}
          onClose={() => setExerciseToDelete(null)}
          onConfirm={confirmDelete}
          title="Eliminar Ejercicio"
          message={`¿Estás seguro de que deseas eliminar "${exerciseToDelete?.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          isLoading={!!deletingId}
          variant="danger"
        />

        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-800 p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">{editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h2>
                <button onClick={handleCloseModal} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre del Ejercicio *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]" 
                    placeholder="Ej: Sentadilla Libre" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Categoría</label>
                  <select 
                    value={formData.muscleGroup} 
                    onChange={(e) => setFormData({ ...formData, muscleGroup: e.target.value })} 
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] appearance-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option key="OTRO" value="OTRO">OTRO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Descripción / Notas</label>
                  <textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] min-h-[100px] resize-none" 
                    placeholder="Instrucciones de técnica, puntos clave..." 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">URL del Video (Opcional)</label>
                  <div className="relative">
                    <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="url" 
                      value={formData.videoUrl} 
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} 
                      className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-sm outline-none focus:border-[#D4AF37]" 
                      placeholder="https://youtube.com/..." 
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl mt-4">
                  {editingExercise ? 'Guardar Cambios' : 'Crear Ejercicio'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
