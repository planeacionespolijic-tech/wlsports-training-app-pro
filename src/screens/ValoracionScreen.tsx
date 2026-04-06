import * as React from 'react';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, History, Loader2, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface ValoracionScreenProps {
  onBack: () => void;
  userId: string;
  isAdmin: boolean;
  trainerId: string | null;
}

interface Assessment {
  id: string;
  weight: number;
  height: number;
  bodyFat: number;
  muscleMass: number;
  vo2max?: number;
  notes?: string;
  createdAt: any;
}

export const ValoracionScreen = ({ onBack, userId, isAdmin, trainerId }: ValoracionScreenProps) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [vo2max, setVo2max] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'assessments'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assessment[];
      setAssessments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assessments');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !height) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'assessments'), {
        userId,
        trainerId,
        weight: parseFloat(weight),
        height: parseFloat(height),
        bodyFat: parseFloat(bodyFat) || 0,
        muscleMass: parseFloat(muscleMass) || 0,
        vo2max: parseFloat(vo2max) || 0,
        notes,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setWeight('');
      setHeight('');
      setBodyFat('');
      setMuscleMass('');
      setVo2max('');
      setNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assessments');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('¿Estás seguro de eliminar esta valoración?')) return;
    try {
      await deleteDoc(doc(db, 'assessments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'assessments');
    }
  };

  const calculateBMI = (w: number, h: number) => {
    const heightInMeters = h / 100;
    return (w / (heightInMeters * heightInMeters)).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Valoración Física</h1>
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
              <h2 className="text-[#D4AF37] font-bold mb-4 uppercase text-xs tracking-widest">Nueva Valoración</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Peso (kg)</label>
                  <input 
                    type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    placeholder="70.5" required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Estatura (cm)</label>
                  <input 
                    type="number" value={height} onChange={e => setHeight(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    placeholder="175" required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">% Grasa</label>
                  <input 
                    type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    placeholder="15.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Masa Muscular (kg)</label>
                  <input 
                    type="number" step="0.1" value={muscleMass} onChange={e => setMuscleMass(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    placeholder="35.2"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">VO2 Max (ml/kg/min)</label>
                  <input 
                    type="number" step="0.1" value={vo2max} onChange={e => setVo2max(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    placeholder="45.5"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Notas Adicionales</label>
                  <textarea 
                    value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-24 resize-none"
                    placeholder="Observaciones sobre la condición física..."
                  />
                </div>
              </div>
              <button 
                disabled={saving}
                className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl mt-6 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Guardar Valoración
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {assessments.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 italic">
                No hay valoraciones registradas
              </div>
            ) : (
              assessments.map((item) => (
                <div key={item.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div className="p-4 bg-zinc-800/50 border-b border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[#D4AF37]">
                      <History size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {item.createdAt?.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Peso</p>
                        <p className="text-xl font-black">{item.weight}<span className="text-xs text-zinc-500 ml-1">kg</span></p>
                      </div>
                      <div className="text-center border-x border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">IMC</p>
                        <p className="text-xl font-black">{calculateBMI(item.weight, item.height)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Grasa</p>
                        <p className="text-xl font-black">{item.bodyFat}<span className="text-xs text-zinc-500 ml-1">%</span></p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Masa Muscular</p>
                        <p className="font-bold">{item.muscleMass} kg</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">VO2 Max</p>
                        <p className="font-bold">{item.vo2max} ml/kg/min</p>
                      </div>
                    </div>
                    {item.notes && (
                      <div className="mt-4 p-3 bg-black/30 rounded-xl text-xs text-zinc-400 italic">
                        {item.notes}
                      </div>
                    )}
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
