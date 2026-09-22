import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Zap, Target, Layers, Footprints, Sparkles, EyeOff, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export const NeuroHubScreen = () => {
  const navigate = useNavigate();

  const tools = [
    { 
      id: 'neurotracker', 
      title: 'NeuroTracker 3D-MOT', 
      description: 'Seguimiento de múltiples objetos en 3D para expandir el ancho de banda atencional y visión periférica', 
      icon: Brain, 
      color: 'text-[#D4AF37]', 
      bg: 'bg-[#D4AF37]/10',
      badge: 'Élite Premier League',
      featured: true
    },
    { 
      id: 'balon-reactivo', 
      title: 'Balón Reactivo & SO VISION™', 
      description: 'Simula balón en movimiento con fintas y auto-medición por visión artificial con cámara', 
      icon: Footprints, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      badge: 'SwitchedOn Training',
      featured: true
    },
    { 
      id: 'strobe-vision', 
      title: 'Strobe Vision Trainer', 
      description: 'Entrenamiento de oclusión visual estroboscópica para forzar la predicción de trayectorias (Estilo Senaptec)', 
      icon: EyeOff, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-500/10',
      badge: 'Senaptec Strobe',
      featured: true
    },
    { 
      id: 'homecourt-agility', 
      title: 'HomeCourt Agility AR', 
      description: 'Matriz de 4 conos y platillos virtuales proyectados en suelo con detección de pasos por cámara IA', 
      icon: Activity, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10',
      badge: 'HomeCourt Sports AR',
      featured: true
    },
    { 
      id: 'reaccion', 
      title: 'Reacción & Carrera a Platillos', 
      description: 'Ida y vuelta a conos de colores con toque en pantalla y selección interactiva', 
      icon: Zap, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10' 
    },
    { 
      id: 'stroop', 
      title: 'Test de Stroop', 
      description: 'Control inhibitorio y atención selectiva', 
      icon: Target, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10' 
    },
    { 
      id: 'schulte', 
      title: 'Tabla de Schulte', 
      description: 'Visión periférica y velocidad de lectura', 
      icon: Layers, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10' 
    },
    { 
      id: 'simon', 
      title: 'Memoria de Patrones', 
      description: 'Memoria de trabajo espacial y secuencial', 
      icon: Brain, 
      color: 'text-green-500', 
      bg: 'bg-green-500/10' 
    },
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
          <p className="text-zinc-500 text-sm font-medium">Entrenamiento cerebral, reactividad y agilidad motora</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={tool.id}
            onClick={() => navigate(`/${tool.id}`)}
            className={`flex items-center gap-4 p-6 bg-zinc-900 border rounded-3xl transition-all group text-left relative overflow-hidden ${
              tool.featured 
                ? 'border-[#D4AF37]/50 hover:border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.12)]' 
                : 'border-zinc-800 hover:border-[#D4AF37]/50'
            }`}
          >
            {tool.badge && (
              <span className="absolute top-3 right-4 text-[9px] font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30 flex items-center gap-1">
                <Sparkles size={10} /> {tool.badge}
              </span>
            )}
            <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${tool.bg} ${tool.color}`}>
              <tool.icon size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                {tool.title}
              </h2>
              <p className="text-zinc-500 text-sm mt-0.5">{tool.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
