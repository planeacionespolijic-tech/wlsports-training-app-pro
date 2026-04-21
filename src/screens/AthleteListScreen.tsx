import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { User, Plus, Search, Baby, Dumbbell, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Athlete {
  id: string;
  displayName: string;
  email: string;
  type: 'adult' | 'child';
  level: number;
  points: number;
}

interface AthleteListScreenProps {
  onSelectAthlete: (athlete: Athlete) => void;
}

export const AthleteListScreen = ({ onSelectAthlete }: AthleteListScreenProps) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newType, setNewType] = useState<'adult' | 'child'>('adult');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Athlete))
        .filter(a => a.id !== auth.currentUser?.uid); // Excluir al entrenador por UID
      setAthletes(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { uid } = auth.currentUser || {};
      await addDoc(collection(db, 'users'), {
        displayName: newName,
        email: newEmail || null, // Email opcional
        type: newType,
        role: 'client',
        level: 1,
        xp: 0,
        points: 0,
        streak: 0,
        trainerId: uid,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const filteredAthletes = athletes.filter(a => 
    a.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '??';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Mis Atletas</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Gestión de Alumnos</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#D4AF37] text-black p-3 rounded-2xl hover:scale-105 transition-transform"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text"
          placeholder="Buscar atleta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-[#D4AF37] outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAthletes.map((athlete) => (
            <motion.button
              key={athlete.id}
              whileHover={{ x: 5 }}
              onClick={() => onSelectAthlete(athlete)}
              className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl flex items-center gap-4 text-left group transition-all hover:border-[#D4AF37]/30"
            >
              {athlete.photoURL ? (
                <img 
                  src={athlete.photoURL} 
                  alt={athlete.displayName} 
                  className="w-14 h-14 rounded-full object-cover border-2 border-zinc-800 shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  className="w-14 h-14 rounded-full border-2 border-zinc-800 flex items-center justify-center text-sm font-black bg-black"
                  style={{ color: athlete.type === 'child' ? '#3B82F6' : '#D4AF37' }}
                >
                  {getInitials(athlete.displayName)}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg leading-tight">{athlete.displayName}</h3>
                <p className="text-xs text-zinc-500">{athlete.email}</p>
              </div>
              <div className="text-right mr-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Nivel {athlete.level || 1}</span>
                <div className="flex items-center gap-1 text-zinc-600">
                  <ChevronRight size={16} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Modal para agregar atleta */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] w-full max-w-md space-y-6"
            >
              <h2 className="text-xl font-black uppercase">Nuevo Atleta</h2>
              <form onSubmit={handleAddAthlete} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Nombre Completo</label>
                  <input 
                    required value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Email (Opcional)</label>
                  <input 
                    type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Tipo de Perfil</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setNewType('adult')}
                      className={`py-3 rounded-xl font-bold text-xs transition-all ${newType === 'adult' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}
                    >
                      ADULTO
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewType('child')}
                      className={`py-3 rounded-xl font-bold text-xs transition-all ${newType === 'child' ? 'bg-blue-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}
                    >
                      NIÑO
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-2xl"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#D4AF37] text-black font-bold py-4 rounded-2xl"
                  >
                    AGREGAR
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
