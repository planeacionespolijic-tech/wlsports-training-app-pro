import React from 'react';
import { motion } from 'framer-motion';
import { EvaluationFormData } from '../../../services/evaluationEngine';
import { CheckCircle2 } from 'lucide-react';

interface StepProps {
  formData: EvaluationFormData;
  updateData: (section: keyof EvaluationFormData, data: any) => void;
}

export const HabitsStep: React.FC<StepProps> = ({ formData, updateData }) => {
  const stressLevels = ['Bajo', 'Medio', 'Alto'];
  const nutritionQualities = ['Deficiente', 'Correcta', 'Excelente'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Horas de Sueño diarias</label>
          <div className="grid grid-cols-5 gap-2">
            {[5, 6, 7, 8, 9].map(h => (
              <button
                key={h}
                onClick={() => updateData('habits', { ...formData.habits, sleepHours: h.toString() })}
                className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                  formData.habits.sleepHours === h.toString()
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                {h}{h === 9 ? '+' : ''}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Nivel de Estrés Percibido</label>
          <div className="grid grid-cols-3 gap-2">
            {stressLevels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => updateData('habits', { ...formData.habits, stressLevel: lvl })}
                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  formData.habits.stressLevel === lvl 
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Estilo de Vida / Actividad Física</label>
          <textarea 
            value={formData.habits.lifestyle}
            onChange={(e) => updateData('habits', { ...formData.habits, lifestyle: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors resize-none h-24"
            placeholder="Sueño, nutrición, consumo de tabaco/alcohol..."
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Horas sentado al día (Trabajo/Estudio)</label>
          <input 
            type="number" 
            value={formData.habits.sittingHours}
            onChange={(e) => updateData('habits', { ...formData.habits, sittingHours: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: 8"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Calidad Nutricional</label>
          <div className="grid grid-cols-1 gap-2">
            {nutritionQualities.map((qual) => (
              <button
                key={qual}
                onClick={() => updateData('habits', { ...formData.habits, nutritionQuality: qual })}
                className={`py-4 px-6 rounded-2xl border text-left flex justify-between items-center transition-all ${
                  formData.habits.nutritionQuality === qual 
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{qual}</span>
                {formData.habits.nutritionQuality === qual && <CheckCircle2 size={16} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Hidratación Diaria (Litros aprox)</label>
          <input 
            type="text" 
            value={formData.habits.hydration}
            onChange={(e) => updateData('habits', { ...formData.habits, hydration: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: 2 litros"
          />
        </div>
      </div>
    </motion.div>
  );
};
