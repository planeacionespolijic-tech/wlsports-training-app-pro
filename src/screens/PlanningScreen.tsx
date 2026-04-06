import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Loader2, Trash2, CalendarClock, LayoutGrid, CheckCircle2, AlertCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface PlanningScreenProps {
  onBack: () => void;
  userId: string;
  isAdmin: boolean;
  trainerId: string | null;
}

interface TrainingPlan {
  id: string;
  title: string;
  objective: string;
  blocks: string[];
  startDate: string;
  endDate: string;
  createdAt: any;
}

export const PlanningScreen = ({ onBack, userId, isAdmin, trainerId }: PlanningScreenProps) => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [blocks, setBlocks] = useState<string[]>(['Adaptación', 'Desarrollo', 'Mantenimiento']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'trainingPlans'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TrainingPlan[];
      setPlans(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trainingPlans');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !objective) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'trainingPlans'), {
        userId,
        trainerId,
        title,
        objective,
        blocks,
        startDate,
        endDate,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setTitle('');
      setObjective('');
      setStartDate('');
      setEndDate('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trainingPlans');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('¿Eliminar este plan de entrenamiento?')) return;
    try {
      await deleteDoc(doc(db, 'trainingPlans', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'trainingPlans');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Planificación Inteligente</h1>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-[#D4AF37] text-black p-2 rounded-full hover:scale-105 transition-transform"
          >
            <Plus size={24} />
          </button>
        )}
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence>
          {showForm && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleSave}
              className="bg-zinc-900 p-6 rounded-2xl border border-[#D4AF37]/30 mb-8 overflow-hidden"
            >
              <h2 className="text-[#D4AF37] font-bold mb-4 uppercase text-xs tracking-widest">Nuevo Macro/Mesociclo</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Título del Plan</label>
                  <input 
                    type="text" value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    placeholder="Ej: Preparación Maratón, Fase Hipertrofia..." required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Objetivo Principal</label>
                  <textarea 
                    value={objective} onChange={e => setObjective(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-20 resize-none"
                    placeholder="Ej: Aumentar masa muscular 2kg, mejorar VO2 Max..." required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Fecha Inicio</label>
                    <input 
                      type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Fecha Fin</label>
                    <input 
                      type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Bloques de Entrenamiento</label>
                  <div className="flex flex-wrap gap-2">
                    {blocks.map((block, i) => (
                      <div key={i} className="bg-black border border-zinc-800 px-3 py-1 rounded-lg text-xs flex items-center gap-2">
                        {block}
                        <button type="button" onClick={() => setBlocks(blocks.filter((_, idx) => idx !== i))} className="text-red-500">×</button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => {
                        const b = prompt('Nombre del bloque:');
                        if (b) setBlocks([...blocks, b]);
                      }}
                      className="bg-zinc-800 px-3 py-1 rounded-lg text-xs font-bold"
                    >
                      + Añadir Bloque
                    </button>
                  </div>
                </div>

                <button 
                  disabled={saving}
                  className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Crear Planificación
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {plans.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 italic">
                No hay planes de entrenamiento registrados
              </div>
            ) : (
              plans.map((item) => (
                <div key={item.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
                  <div className="p-5 flex justify-between items-center bg-zinc-800/30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37]">
                        <CalendarClock size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{item.title}</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                          {item.startDate ? `${item.startDate} al ${item.endDate}` : 'Sin fechas definidas'}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">Objetivo Principal</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed">{item.objective}</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Estructura de Bloques</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {item.blocks?.map((block, i) => (
                          <div key={i} className="flex items-center gap-3 bg-black/50 p-3 rounded-xl border border-zinc-800">
                            <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                              {i + 1}
                            </div>
                            <span className="text-sm font-medium">{block}</span>
                            <CheckCircle2 size={16} className="ml-auto text-zinc-700" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
