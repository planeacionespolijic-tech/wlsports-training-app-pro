import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, ClipboardList } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';

interface AnamnesisScreenProps {
  onBack: () => void;
  userId: string;
  isAdmin: boolean;
  trainerId: string | null;
}

export const AnamnesisScreen = ({ onBack, userId, isAdmin, trainerId }: AnamnesisScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    medicalHistory: '',
    injuries: '',
    medications: '',
    habits: '',
    goals: ''
  });

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'anamnesis'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setData({
          medicalHistory: docData.medicalHistory || '',
          injuries: docData.injuries || '',
          medications: docData.medications || '',
          habits: docData.habits || '',
          goals: docData.goals || ''
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'anamnesis');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      // Use userId as doc ID for simplicity (one anamnesis per user)
      await setDoc(doc(db, 'anamnesis', userId), {
        ...data,
        userId,
        trainerId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Anamnesis actualizada correctamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'anamnesis');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-[#D4AF37] animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Anamnesis</h1>
        </div>
        {isAdmin && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Guardar
          </button>
        )}
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37]">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Historial y Antecedentes</h2>
              <p className="text-xs text-zinc-500">Información médica y deportiva relevante</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Antecedentes Médicos</label>
              <textarea 
                value={data.medicalHistory}
                onChange={e => setData({...data, medicalHistory: e.target.value})}
                readOnly={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[100px] resize-none transition-all"
                placeholder="Enfermedades crónicas, cirugías, alergias..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Lesiones Previas</label>
              <textarea 
                value={data.injuries}
                onChange={e => setData({...data, injuries: e.target.value})}
                readOnly={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[100px] resize-none transition-all"
                placeholder="Fracturas, esguinces, cirugías ortopédicas..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Medicamentos / Suplementos</label>
              <textarea 
                value={data.medications}
                onChange={e => setData({...data, medications: e.target.value})}
                readOnly={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[100px] resize-none transition-all"
                placeholder="Uso actual de fármacos o suplementación deportiva..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Hábitos de Vida</label>
              <textarea 
                value={data.habits}
                onChange={e => setData({...data, habits: e.target.value})}
                readOnly={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[100px] resize-none transition-all"
                placeholder="Sueño, nutrición, consumo de tabaco/alcohol..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Objetivos Deportivos</label>
              <textarea 
                value={data.goals}
                onChange={e => setData({...data, goals: e.target.value})}
                readOnly={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[100px] resize-none transition-all"
                placeholder="Metas a corto, mediano y largo plazo..."
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
