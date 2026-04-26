import React from 'react';
import { motion } from 'framer-motion';
import { EvaluationFormData } from '../../../services/evaluationEngine';

interface StepProps {
  formData: EvaluationFormData;
  updateData: (section: keyof EvaluationFormData, data: any) => void;
}

export const HealthStep: React.FC<StepProps> = ({ formData, updateData }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Antecedentes Médicos</label>
          <textarea 
            value={formData.health.medicalHistory}
            onChange={(e) => updateData('health', { ...formData.health, medicalHistory: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors resize-none h-24"
            placeholder="Enfermedades crónicas, cirugías, alergias..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Lesiones Previas</label>
          <textarea 
            value={formData.health.injuries}
            onChange={(e) => updateData('health', { ...formData.health, injuries: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors resize-none h-24"
            placeholder="Describe lesiones importantes que hayas tenido..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Medicación Actual</label>
          <input 
            type="text" 
            value={formData.health.medication}
            onChange={(e) => updateData('health', { ...formData.health, medication: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Medicamentos que tomes con frecuencia..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Enfermedades / Alertas Médicas</label>
          <textarea 
            value={formData.health.illnesses}
            onChange={(e) => updateData('health', { ...formData.health, illnesses: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors resize-none h-24"
            placeholder="Asma, problemas cardíacos, alergias..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Restricciones Físicas</label>
          <input 
            type="text" 
            value={formData.health.restrictions}
            onChange={(e) => updateData('health', { ...formData.health, restrictions: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: No puedo saltar por dolor de rodilla..."
          />
        </div>
      </div>
    </motion.div>
  );
};
