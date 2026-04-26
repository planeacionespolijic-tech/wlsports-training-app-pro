import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Save, Loader2, Trash2, History, Activity, Zap } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

interface TestsScreenProps {
  onBack: () => void;
  userId: string;
  isAdmin: boolean;
  trainerId: string | null;
}

interface TestResult {
  id: string;
  type: 'physical' | 'technical';
  name: string;
  value: string;
  unit: string;
  notes?: string;
  createdAt: any;
}

export const TestsScreen = ({ 
  onBack: propOnBack, 
  userId: propUserId, 
  isAdmin: propIsAdmin, 
  trainerId: propTrainerId 
}: Partial<TestsScreenProps>) => {
  const navigate = useNavigate();
  const { user, userProfile, isTrainer: authIsTrainer } = useAuth();
  
  // Context determination
  const userId = propUserId || user?.uid || '';
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsTrainer;
  const trainerId = propTrainerId || (authIsTrainer ? user?.uid : userProfile?.trainerId) || null;
  const onBack = propOnBack || (() => navigate(-1));
  const [tests, setTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [type, setType] = useState<'physical' | 'technical'>('physical');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'tests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestResult[];
      setTests(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tests');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'tests'), {
        userId,
        trainerId,
        type,
        name,
        value,
        unit,
        notes,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setName('');
      setValue('');
      setUnit('');
      setNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tests');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('¿Eliminar este resultado de prueba?')) return;
    try {
      await deleteDoc(doc(db, 'tests', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tests');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Pruebas Periódicas</h1>
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
              <h2 className="text-[#D4AF37] font-bold mb-4 uppercase text-xs tracking-widest">Nueva Prueba</h2>
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-black rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setType('physical')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'physical' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                  >
                    Física
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('technical')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'technical' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                  >
                    Técnica
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Nombre de la Prueba</label>
                  <input 
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                    placeholder="Ej: Salto Vertical, Control de Balón..." required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Resultado</label>
                    <input 
                      type="text" value={value} onChange={e => setValue(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                      placeholder="Ej: 45, 12.5..." required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Unidad</label>
                    <input 
                      type="text" value={unit} onChange={e => setUnit(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                      placeholder="Ej: cm, seg, reps..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Observaciones</label>
                  <textarea 
                    value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-20 resize-none"
                    placeholder="Detalles sobre la ejecución..."
                  />
                </div>

                <button 
                  disabled={saving}
                  className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Guardar Resultado
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
          <div className="space-y-4">
            {tests.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 italic">
                No hay pruebas registradas
              </div>
            ) : (
              tests.map((item) => (
                <div key={item.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div className="p-4 flex justify-between items-center bg-zinc-800/30">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.type === 'physical' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {item.type === 'physical' ? <Activity size={16} /> : <Zap size={16} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{item.name}</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                          {item.createdAt?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-[#D4AF37]">{item.value}</span>
                      <span className="text-xs text-zinc-500 ml-1 font-bold">{item.unit}</span>
                    </div>
                    {item.notes && (
                      <div className="max-w-[60%] text-[10px] text-zinc-400 italic text-right">
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
