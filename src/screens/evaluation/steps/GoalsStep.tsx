import React from 'react';
import { motion } from 'framer-motion';
import { EvaluationFormData } from '../../../services/evaluationEngine';

interface StepProps {
  formData: EvaluationFormData;
  updateData: (section: keyof EvaluationFormData | 'commitment', data: any) => void;
}

export const GoalsStep: React.FC<StepProps> = ({ formData, updateData }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Meta a 90 Días</label>
          <textarea 
            value={formData.goals.goal90Days}
            onChange={(e) => updateData('goals', { ...formData.goals, goal90Days: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors resize-none h-24"
            placeholder="¿Qué quieres haber logrado en 3 meses?"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Metas a Largo Plazo</label>
          <textarea 
            value={formData.goals.longTermGoals}
            onChange={(e) => updateData('goals', { ...formData.goals, longTermGoals: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors resize-none h-24"
            placeholder="Metas a mediano y largo plazo..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Prioridad Principal</label>
          <input 
            type="text" 
            value={formData.goals.priority}
            onChange={(e) => updateData('goals', { ...formData.goals, priority: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: Ganar fuerza, Perder peso, Mejorar velocidad..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Motivación Personal</label>
          <textarea 
            value={formData.goals.motivation}
            onChange={(e) => updateData('goals', { ...formData.goals, motivation: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors resize-none h-24"
            placeholder="¿Por qué es importante para ti este objetivo?"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Compromiso Final</label>
          <p className="text-[10px] text-zinc-500 italic mb-4 px-1">Escribe una frase que resuma tu compromiso contigo mismo.</p>
          <input 
            type="text" 
            value={formData.commitment}
            onChange={(e) => updateData('commitment', e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors font-bold text-[#D4AF37] italic"
            placeholder="Ej: 'No me detendré hasta lograrlo'"
          />
        </div>
      </div>
    </motion.div>
  );
};
