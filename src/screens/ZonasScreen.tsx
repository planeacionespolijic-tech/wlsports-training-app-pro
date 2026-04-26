import { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Info, Heart, Save, Loader2, Check, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface ZonasScreenProps {
  onBack: () => void;
  userId: string;
  trainerId: string | null;
}

export const ZonasScreen = ({ onBack, userId, trainerId }: ZonasScreenProps) => {
  const [age, setAge] = useState<string>('');
  const [restingHR, setRestingHR] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists() && userDoc.data().hrZones) {
          const data = userDoc.data();
          setResults({
            maxHR: data.maxHR,
            restingNum: data.restingHR,
            zones: data.hrZones
          });
          setAge(data.age?.toString() || '');
          setRestingHR(data.restingHR?.toString() || '');
        }
      } catch (error) {
        console.error("Error loading zones", error);
      }
    };
    loadProfile();
  }, [userId]);

  const calculateZones = () => {
    const ageNum = parseInt(age);
    const restingNum = parseInt(restingHR) || 60;

    if (!ageNum) return;

    // Karvonen Formula
    const maxHR = 220 - ageNum;
    const heartRateReserve = maxHR - restingNum;

    const zones = [
      { level: 1, name: 'Recuperación', range: '50-60%', min: Math.round(restingNum + heartRateReserve * 0.5), max: Math.round(restingNum + heartRateReserve * 0.6), color: 'bg-emerald-500', desc: 'Ideal para calentamiento y recuperación activa.' },
      { level: 2, name: 'Quema de Grasa', range: '60-70%', min: Math.round(restingNum + heartRateReserve * 0.6), max: Math.round(restingNum + heartRateReserve * 0.7), color: 'bg-yellow-500', desc: 'Mejora la resistencia básica y quema grasas.' },
      { level: 3, name: 'Aeróbica', range: '70-80%', min: Math.round(restingNum + heartRateReserve * 0.7), max: Math.round(restingNum + heartRateReserve * 0.8), color: 'bg-orange-500', desc: 'Mejora la capacidad aeróbica y cardiovascular.' },
      { level: 4, name: 'Anaeróbica', range: '80-90%', min: Math.round(restingNum + heartRateReserve * 0.8), max: Math.round(restingNum + heartRateReserve * 0.9), color: 'bg-red-500', desc: 'Mejora el umbral de lactato y velocidad.' },
      { level: 5, name: 'Máximo Esfuerzo', range: '90-100%', min: Math.round(restingNum + heartRateReserve * 0.9), max: maxHR, color: 'bg-purple-600', desc: 'Entrenamiento de intervalos de alta intensidad.' },
    ];

    setResults({ maxHR, restingNum, zones });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!results) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        hrZones: results.zones,
        maxHR: results.maxHR,
        restingHR: results.restingNum,
        age: parseInt(age)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center gap-4 sticky top-0 bg-black z-10">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Zonas Cardíacas</h1>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#D4AF37]/10 rounded-2xl">
              <Calculator className="text-[#D4AF37]" size={24} />
            </div>
            <div>
              <h2 className="font-bold">Calculadora Karvonen</h2>
              <p className="text-xs text-zinc-500">Precisión basada en frecuencia basal</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Edad del Deportista</label>
              <input 
                type="number" value={age} onChange={e => setAge(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none text-lg font-bold"
                placeholder="Ej: 25"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Frecuencia en Reposo (BPM)</label>
              <input 
                type="number" value={restingHR} onChange={e => setRestingHR(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none text-lg font-bold"
                placeholder="Ej: 60"
              />
            </div>
            <button 
              onClick={calculateZones}
              className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-2xl mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Heart size={20} />
              Calcular Zonas
            </button>
          </div>
        </div>

        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">FC Máxima</p>
                <p className="text-2xl font-black text-[#D4AF37]">{results.maxHR}</p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">FC Reposo</p>
                <p className="text-2xl font-black text-zinc-400">{results.restingNum}</p>
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 ml-1">Distribución de Zonas</h3>
            
            {results.zones.map((zone: any) => (
              <div key={zone.level} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex gap-4 items-start">
                <div className={`w-1 h-12 rounded-full ${zone.color} shrink-0`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-sm">Zona {zone.level}: {zone.name}</h4>
                    <span className="text-xs font-black text-zinc-400">{zone.range}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed">{zone.desc}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black">{zone.min} - {zone.max}</span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">BPM</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 space-y-4 mt-8">
              <div className="flex gap-3 items-center text-[#D4AF37]">
                <Info size={18} />
                <h4 className="font-bold text-sm">¿Para qué sirven las zonas?</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Las zonas cardíacas son brújulas de intensidad. Te permiten entrenar de forma inteligente:
              </p>
              <ul className="space-y-2">
                <li className="text-[10px] text-zinc-500"><strong className="text-zinc-300">Precisión:</strong> Evitas el "entrenamiento basura" (entrenar siempre a la misma intensidad media).</li>
                <li className="text-[10px] text-zinc-500"><strong className="text-zinc-300">Adaptación:</strong> Cada zona dispara beneficios biológicos diferentes (quemar grasa vs. potencia máxima).</li>
                <li className="text-[10px] text-zinc-500"><strong className="text-zinc-300">Seguridad:</strong> Limita el esfuerzo en días de recuperación para evitar el sobreentrenamiento.</li>
              </ul>
              <div className="pt-2 border-t border-zinc-800/50">
                <p className="text-[9px] text-zinc-600 italic">
                  * La fórmula de Karvonen es el estándar de oro en coaching élite porque usa tu "Reserva Cardíaca", adaptándose a tu nivel de condición física real.
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button 
                onClick={calculateZones}
                className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                Recalcular
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 ${saved ? 'bg-green-500' : 'bg-[#D4AF37]'} text-black font-bold py-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2`}
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : saved ? (
                  <Check size={20} />
                ) : (
                  <Save size={20} />
                )}
                {saved ? 'Guardado' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};
