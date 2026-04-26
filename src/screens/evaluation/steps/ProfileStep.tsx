import React from 'react';
import { motion } from 'framer-motion';
import { EvaluationFormData } from '../../../services/evaluationEngine';

interface StepProps {
  formData: EvaluationFormData;
  updateData: (section: keyof EvaluationFormData, data: any) => void;
}

export const ProfileStep: React.FC<StepProps> = ({ formData, updateData }) => {
  const lateralities = ['Derecha', 'Izquierda', 'Mixta'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Nombre Completo</label>
          <input 
            type="text" 
            value={formData.profile.name}
            onChange={(e) => updateData('profile', { ...formData.profile, name: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: Juan Pérez"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Edad</label>
          <input 
            type="number" 
            value={formData.profile.age}
            onChange={(e) => updateData('profile', { ...formData.profile, age: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: 25"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Deporte</label>
            <input 
              type="text" 
              value={formData.profile.sport}
              onChange={(e) => updateData('profile', { ...formData.profile, sport: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
              placeholder="Ej: Fútbol"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Posición / Disciplina</label>
            <input 
              type="text" 
              value={formData.profile.position}
              onChange={(e) => updateData('profile', { ...formData.profile, position: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
              placeholder="Ej: Delantero"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Lateralidad</label>
          <div className="grid grid-cols-3 gap-2">
            {lateralities.map((lat) => (
              <button
                key={lat}
                onClick={() => updateData('profile', { ...formData.profile, laterality: lat })}
                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  formData.profile.laterality === lat 
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {lat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Referente / Inspiración</label>
          <input 
            type="text" 
            value={formData.profile.inspiration}
            onChange={(e) => updateData('profile', { ...formData.profile, inspiration: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: Cristiano Ronaldo"
          />
        </div>
      </div>
    </motion.div>
  );
};
