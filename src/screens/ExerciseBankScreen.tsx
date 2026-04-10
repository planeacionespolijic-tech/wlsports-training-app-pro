import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Dumbbell, Video, Trash2, Edit2, Loader2, X, Play } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface ExerciseBankScreenProps {
  onBack: () => void;
  userId: string;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  description: string;
  videoUrl: string;
  trainerId: string;
}

export const ExerciseBankScreen = ({ onBack, userId }: ExerciseBankScreenProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: '',
    description: '',
    videoUrl: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, 'exerciseBank'),
      where('trainerId', '==', userId),
      orderBy('createdAt', 'desc')
    );

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este ejercicio?')) return;
    try {
      await deleteDoc(doc(db, 'exerciseBank', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'exerciseBank');
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name || '',
      muscleGroup: exercise.muscleGroup || '',
      description: exercise.description || '',
      videoUrl: exercise.videoUrl || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExercise(null);
    setFormData({ name: '', muscleGroup: '', description: '', videoUrl: '' });
  };

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Banco de Ejercicios</h1>
            <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Gestión de Biblioteca</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus size={16} /> Nuevo
        </button>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nombre o grupo muscular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-3xl text-center">
              <Dumbbell className="mx-auto text-zinc-800 mb-4" size={48} />
              <p className="text-zinc-600 italic text-sm">No se encontraron ejercicios.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map(exercise => (
                <div key={exercise.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 hover:border-[#D4AF37]/50 transition-colors group flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-[#D4AF37]/10 p-2.5 rounded-xl">
                      <Dumbbell className="text-[#D4AF37]" size={20} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(exercise)} className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(exercise.id)} className="p-1.5 text-zinc-400 hover:text-red-500 bg-zinc-800 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1 line-clamp-1">{exercise.name}</h3>
                  {exercise.muscleGroup && (
                    <span className="inline-block bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-3 self-start">
                      {exercise.muscleGroup}
                    </span>
                  )}
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-4 flex-1">
                    {exercise.description || 'Sin descripción'}
                  </p>
                  {exercise.videoUrl && (
                    <a 
                      href={exercise.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-black border border-zinc-800 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors mt-auto"
                    >
                      <Play size={14} /> Ver Video
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-800 p-8 shadow-2xl"
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
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Grupo Muscular</label>
                  <input 
                    type="text" 
                    value={formData.muscleGroup} 
                    onChange={(e) => setFormData({ ...formData, muscleGroup: e.target.value })} 
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]" 
                    placeholder="Ej: Piernas, Pecho, Espalda..." 
                  />
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
