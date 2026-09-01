import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Zap, Target, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export const NeuroHubScreen = () => {
  const navigate = useNavigate();

  const tools = [
    { id: 'reaccion', title: 'Reacción Visual', description: 'Mejora tiempos de respuesta a estímulos visuales', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'stroop', title: 'Test de Stroop', description: 'Control inhibitorio y atención selectiva', icon: Target, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'schulte', title: 'Tabla de Schulte', description: 'Visión periférica y velocidad de lectura', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'simon', title: 'Memoria de Patrones', description: 'Memoria de trabajo espacial y secuencial', icon: Brain, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex items-center gap-4 mb-8 pt-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Centro <span className="text-[#D4AF37]">Neurocognitivo</span></h1>
          <p className="text-zinc-500 text-sm font-medium">Juegos para optimización cerebral</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={tool.id}
            onClick={() => navigate(`/${tool.id}`)}
            className="flex items-center gap-4 p-6 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-[#D4AF37]/50 transition-all group text-left"
          >
            <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${tool.bg} ${tool.color}`}>
              <tool.icon size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{tool.title}</h2>
              <p className="text-zinc-500 text-sm">{tool.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
