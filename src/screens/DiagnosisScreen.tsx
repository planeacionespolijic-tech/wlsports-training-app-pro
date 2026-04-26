import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Brain, Save, Loader2, AlertCircle, Sparkles, Zap } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { analyzeProgress } from '../services/intelligenceService';
import { motion } from 'motion/react';

interface DiagnosisScreenProps {
  onBack: () => void;
  userId: string;
  isAdmin: boolean;
  trainerId: string | null;
}

interface Diagnosis {
  id: string;
  limitations: string;
  focus: string;
  recommendations: string;
  createdAt: any;
  source?: string;
}

export const DiagnosisScreen = ({ 
  onBack: propOnBack, 
  userId: propUserId, 
  isAdmin: propIsAdmin, 
  trainerId: propTrainerId 
}: Partial<DiagnosisScreenProps>) => {
  const navigate = useNavigate();
  const { user, userProfile, isTrainer: authIsTrainer } = useAuth();
  
  // Context determination
  const userId = propUserId || user?.uid || '';
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsTrainer;
  const trainerId = propTrainerId || (authIsTrainer ? user?.uid : userProfile?.trainerId) || null;
  const onBack = propOnBack || (() => navigate(-1));
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Form state for manual edit/new
  const [limitations, setLimitations] = useState('');
  const [focus, setFocus] = useState('');
  const [recommendations, setRecommendations] = useState('');

  useEffect(() => {
    const fetchAiAnalysis = async () => {
      setAnalyzing(true);
      const analysis = await analyzeProgress(userId);
      setAiAnalysis(analysis);
      setAnalyzing(false);
    };
    fetchAiAnalysis();

    const q = query(
      collection(db, 'diagnoses'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() as Diagnosis;
        setDiagnosis({ ...data, id: doc.id });
        setLimitations(data.limitations || '');
        setFocus(data.focus || '');
        setRecommendations(data.recommendations || '');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'diagnoses');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSave = async () => {
    if (!isAdmin) return;
    setGenerating(true);
    try {
      await addDoc(collection(db, 'diagnoses'), {
        userId,
        trainerId,
        limitations,
        focus,
        recommendations,
        createdAt: serverTimestamp(),
      });
      alert('Diagnóstico guardado correctamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'diagnoses');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Diagnóstico Inteligente</h1>
        </div>
        {isAdmin && (
          <button 
            onClick={handleSave}
            disabled={generating}
            className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Guardar
          </button>
        )}
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* AI Analysis Section */}
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
              <Brain size={20} />
              <h2 className="text-xs font-black uppercase tracking-widest">Análisis Inteligente (IA)</h2>
            </div>
            
            {analyzing ? (
              <div className="flex items-center gap-3 text-zinc-500 text-sm italic">
                <Loader2 className="animate-spin" size={16} />
                Analizando datos de rendimiento...
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/50 p-3 rounded-2xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Estado</p>
                    <p className={`text-sm font-black ${aiAnalysis.status === 'Estancado' ? 'text-orange-500' : 'text-emerald-500'}`}>
                      {aiAnalysis.status}
                    </p>
                  </div>
                  <div className="bg-black/50 p-3 rounded-2xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Riesgo Lesión</p>
                    <p className={`text-sm font-black ${aiAnalysis.riskLevel === 'Bajo' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {aiAnalysis.riskLevel}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {aiAnalysis.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex gap-3 text-xs text-zinc-400 bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                      <Zap size={14} className="text-[#D4AF37] shrink-0" />
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-zinc-600 text-xs italic">No hay suficientes datos para un análisis completo.</p>
            )}
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-[#D4AF37]/20 flex flex-col gap-4">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37] shrink-0">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-lg">Análisis de Capacidades</h2>
                  {diagnosis?.source === 'initial_evaluation' && (
                    <span className="bg-[#D4AF37] text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      Generado por 360°
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Este módulo integra los resultados de la evaluación inicial, valoración física y tests para generar un enfoque de entrenamiento optimizado.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Limitaciones Detectadas</label>
              <textarea 
                value={limitations}
                onChange={e => setLimitations(e.target.value)}
                readOnly={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[100px] resize-none transition-all"
                placeholder="Ej: Acortamiento de isquiotibiales, baja resistencia aeróbica..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Enfoque de Entrenamiento Sugerido</label>
              <textarea 
                value={focus}
                onChange={e => setFocus(e.target.value)}
                readOnly={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[100px] resize-none transition-all"
                placeholder="Ej: Fase de adaptación anatómica, énfasis en movilidad articular..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Recomendaciones del Especialista</label>
              <textarea 
                value={recommendations}
                onChange={e => setRecommendations(e.target.value)}
                readOnly={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none min-h-[120px] resize-none transition-all"
                placeholder="Ej: Realizar 3 sesiones semanales, priorizar técnica sobre carga..."
              />
            </div>
          </div>

          {!diagnosis && !isAdmin && (
            <div className="text-center py-20 text-zinc-600 italic flex flex-col items-center gap-4">
              <AlertCircle size={48} className="opacity-20" />
              <p>Aún no se ha generado un diagnóstico para este atleta.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
