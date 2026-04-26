import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Heart, Zap, Map, Target, 
  ChevronRight, ChevronLeft, Loader2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInitialEvaluation } from '../../hooks/useInitialEvaluation';
import { validateStep } from '../../services/validationRules';

// Components
import { ProgressHeader } from '../../components/evaluation/ProgressHeader';
import { EvaluationResult } from '../../components/evaluation/EvaluationResult';

// Steps
import { ProfileStep } from './steps/ProfileStep';
import { HealthStep } from './steps/HealthStep';
import { HabitsStep } from './steps/HabitsStep';
import { EnvironmentStep } from './steps/EnvironmentStep';
import { GoalsStep } from './steps/GoalsStep';

const STEPS = [
  { id: 1, title: 'Perfil General', icon: User, component: ProfileStep, label: 'Información básica' },
  { id: 2, title: 'Salud y Seguridad', icon: Heart, component: HealthStep, label: 'Antecedentes médicos' },
  { id: 3, title: 'Hábitos y Contexto', icon: Zap, component: HabitsStep, label: 'Estilo de vida' },
  { id: 4, title: 'Entorno Deportivo', icon: Map, component: EnvironmentStep, label: 'Contexto de entrenamiento' },
  { id: 5, title: 'Objetivos y Compromiso', icon: Target, component: GoalsStep, label: 'Metas a alcanzar' },
];

export const InitialEvaluationScreen = ({ userId: propUserId }: { userId?: string }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const userId = propUserId || id || user?.uid;
  const {
    formData,
    loading,
    submitting,
    finished,
    evaluationResult,
    updateData,
    submitEvaluation,
    setFinished
  } = useInitialEvaluation(userId);

  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNext = () => {
    const validation = validateStep(step, formData);
    if (!validation.isValid) {
      setValidationError(validation.message || 'Por favor completa los campos obligatorios');
      return;
    }
    setValidationError(null);
    if (step < STEPS.length) {
      setStep(s => s + 1);
      window.scrollTo(0, 0);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (step > 1) {
      setStep(s => s - 1);
      window.scrollTo(0, 0);
    } else {
      navigate(-1);
    }
  };

  const handleFinish = async () => {
    const success = await submitEvaluation();
    if (success) {
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="text-[#D4AF37] animate-spin mb-4" size={48} />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Cargando expediente 360°...</p>
      </div>
    );
  }

  if (finished && evaluationResult) {
    return (
      <div className="min-h-screen bg-black text-white p-6 pb-12">
        <EvaluationResult 
          result={evaluationResult} 
          onBack={() => navigate(-1)} 
        />
      </div>
    );
  }

  const CurrentStepComponent = STEPS[step - 1].component;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <ProgressHeader 
        step={step} 
        totalSteps={STEPS.length} 
        onBack={() => navigate(-1)} 
        title={STEPS[step - 1].title}
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {/* Step Hero Section */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-[1.25rem] border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.05)]">
              {React.createElement(STEPS[step - 1].icon, { size: 28 })}
            </div>
            <div>
              <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] mb-0.5">Bloque {step} de {STEPS.length}</p>
              <h2 className="text-2xl font-black tracking-tight leading-none">{STEPS[step - 1].title}</h2>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <div key={step}>
              <CurrentStepComponent 
                formData={formData} 
                updateData={updateData} 
              />
            </div>
          </AnimatePresence>

          {validationError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"
            >
              <AlertCircle size={18} />
              <p className="text-xs font-bold uppercase tracking-widest">{validationError}</p>
            </motion.div>
          )}

          {/* Spacer for sticky footer */}
          <div className="h-32" />
        </div>
      </main>

      <footer className="p-6 border-t border-zinc-800 bg-black/80 backdrop-blur-md fixed bottom-0 left-0 right-0 z-30">
        <div className="max-w-lg mx-auto flex gap-4">
          <button 
            onClick={handleBack}
            className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors uppercase tracking-widest text-[10px]"
          >
            <ChevronLeft size={18} /> {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>
          
          <button 
            onClick={handleNext}
            disabled={submitting}
            className="flex-[2] bg-[#D4AF37] text-black font-black py-4 rounded-2xl shadow-xl shadow-[#D4AF37]/10 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {step === STEPS.length ? 'Finalizar Evaluación' : 'Siguiente'} 
                {step !== STEPS.length && <ChevronRight size={18} />}
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};
