import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Baby, Save, Loader2, Trash2, Trophy, Star, Target, Activity, Zap } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface KidsModuleScreenProps {
  onBack: () => void;
  userId: string;
  isAdmin: boolean;
  trainerId: string | null;
}

interface MotorEvaluation {
  id: string;
  coordination: number;
  balance: number;
  agility: number;
  strength: number;
  notes?: string;
  createdAt: any;
}

const LEVELS = [
  { id: 'explorador', label: 'Explorador', color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'aventurero', label: 'Aventurero', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'atleta', label: 'Atleta', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'pro', label: 'Pro', color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' }
];

export const KidsModuleScreen = ({ 
  onBack: propOnBack, 
  userId: propUserId, 
  isAdmin: propIsAdmin, 
  trainerId: propTrainerId 
}: Partial<KidsModuleScreenProps>) => {
  const navigate = useNavigate();
  const { user, userProfile, isTrainer: authIsTrainer } = useAuth();
  
  // Context determination
  const userId = propUserId || user?.uid || '';
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsTrainer;
  const trainerId = propTrainerId || (authIsTrainer ? user?.uid : userProfile?.trainerId) || null;
  const onBack = propOnBack || (() => navigate(-1));
  const [evaluations, setEvaluations] = useState<MotorEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [coordination, setCoordination] = useState(5);
  const [balance, setBalance] = useState(5);
  const [agility, setAgility] = useState(5);
  const [strength, setStrength] = useState(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'motorEvaluations'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MotorEvaluation[];
      setEvaluations(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'motorEvaluations');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'motorEvaluations'), {
        userId,
        trainerId,
        coordination,
        balance,
        agility,
        strength,
        notes,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'motorEvaluations');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('¿Eliminar esta evaluación motriz?')) return;
    try {
      await deleteDoc(doc(db, 'motorEvaluations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'motorEvaluations');
    }
  };

  const currentLevel = evaluations.length > 0 ? 
    LEVELS[Math.min(Math.floor(evaluations.length / 2), LEVELS.length - 1)] : 
    LEVELS[0];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Módulo Especial Niños</h1>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-[#D4AF37] text-black p-2 rounded-full hover:scale-105 transition-transform"
          >
            <Baby size={24} />
          </button>
        )}
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Gamification Header */}
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 flex items-center gap-6 shadow-2xl">
            <div className={`w-24 h-24 rounded-full ${currentLevel.bg} flex items-center justify-center border-2 border-zinc-800 relative`}>
              <Trophy size={48} className={currentLevel.color} />
              <div className="absolute -bottom-2 bg-black border border-zinc-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Nivel {evaluations.length}
              </div>
            </div>
            <div>
              <h2 className={`text-2xl font-black uppercase tracking-tighter ${currentLevel.color}`}>
                {currentLevel.label}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                ¡Sigue entrenando para desbloquear el siguiente nivel!
              </p>
              <div className="flex gap-1 mt-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} fill={s <= evaluations.length ? '#D4AF37' : 'none'} className={s <= evaluations.length ? 'text-[#D4AF37]' : 'text-zinc-800'} />
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleSave}
                className="bg-zinc-900 p-6 rounded-3xl border border-[#D4AF37]/30 mb-8 overflow-hidden"
              >
                <h2 className="text-[#D4AF37] font-bold mb-6 uppercase text-xs tracking-widest">Nueva Evaluación Motriz</h2>
                <div className="space-y-6">
                  {[
                    { label: 'Coordinación', value: coordination, setter: setCoordination, icon: Target },
                    { label: 'Equilibrio', value: balance, setter: setBalance, icon: Activity },
                    { label: 'Agilidad', value: agility, setter: setAgility, icon: Zap },
                    { label: 'Fuerza', value: strength, setter: setStrength, icon: Trophy }
                  ].map((attr) => (
                    <div key={attr.label} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                          <attr.icon size={14} />
                          {attr.label}
                        </div>
                        <span className="text-xs font-black text-[#D4AF37]">{attr.value}/10</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" value={attr.value} onChange={e => attr.setter(parseInt(e.target.value))}
                        className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                      />
                    </div>
                  ))}

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Observaciones para Padres</label>
                    <textarea 
                      value={notes} onChange={e => setNotes(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-20 resize-none"
                      placeholder="Comentarios sobre el desarrollo..."
                    />
                  </div>

                  <button 
                    disabled={saving}
                    className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Guardar Evaluación
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
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Historial de Desarrollo</h3>
              {evaluations.length === 0 ? (
                <div className="text-center py-10 text-zinc-600 italic">
                  No hay evaluaciones registradas
                </div>
              ) : (
                evaluations.map((item) => (
                  <div key={item.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        {item.createdAt?.toDate().toLocaleDateString()}
                      </span>
                      {isAdmin && (
                        <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/50 p-3 rounded-2xl border border-zinc-800/50">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Coordinación</p>
                        <p className="text-lg font-black text-[#D4AF37]">{item.coordination}/10</p>
                      </div>
                      <div className="bg-black/50 p-3 rounded-2xl border border-zinc-800/50">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Equilibrio</p>
                        <p className="text-lg font-black text-blue-500">{item.balance}/10</p>
                      </div>
                      <div className="bg-black/50 p-3 rounded-2xl border border-zinc-800/50">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Agilidad</p>
                        <p className="text-lg font-black text-purple-500">{item.agility}/10</p>
                      </div>
                      <div className="bg-black/50 p-3 rounded-2xl border border-zinc-800/50">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Fuerza</p>
                        <p className="text-lg font-black text-green-500">{item.strength}/10</p>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="p-4 bg-black/30 rounded-2xl border border-zinc-800 italic text-xs text-zinc-400">
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
