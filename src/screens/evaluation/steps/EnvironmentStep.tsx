import React from 'react';
import { motion } from 'framer-motion';
import { EvaluationFormData } from '../../../services/evaluationEngine';

interface StepProps {
  formData: EvaluationFormData;
  updateData: (section: keyof EvaluationFormData, data: any) => void;
}

export const EnvironmentStep: React.FC<StepProps> = ({ formData, updateData }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Tipo de Superficie</label>
          <input 
            type="text" 
            value={formData.environment.surfaceType}
            onChange={(e) => updateData('environment', { ...formData.environment, surfaceType: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: Césped artificial, Cemento, Parqué..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Calzado Principal</label>
          <input 
            type="text" 
            value={formData.environment.footwear}
            onChange={(e) => updateData('environment', { ...formData.environment, footwear: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: Botas de tacos, Zapatillas running..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Material Disponible</label>
          <textarea 
            value={formData.environment.material}
            onChange={(e) => updateData('environment', { ...formData.environment, material: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors resize-none h-24"
            placeholder="Gomas, mancuernas, gimnasio completo, peso corporal..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Frecuencia Semanal (Días de entreno)</label>
          <div className="grid grid-cols-7 gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <button
                key={d}
                onClick={() => updateData('environment', { ...formData.environment, weeklyFrequency: d.toString() })}
                className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                  formData.environment.weeklyFrequency === d.toString()
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
