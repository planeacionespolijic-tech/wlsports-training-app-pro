import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProgressHeaderProps {
  step: number;
  totalSteps: number;
  onBack: () => void;
  title: string;
  headerLabel?: string;
  showBack?: boolean;
  showProgressBar?: boolean;
  theme?: 'gold' | 'blue' | 'neutral';
  compact?: boolean;
  className?: string;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({ 
  step, 
  totalSteps, 
  onBack, 
  title, 
  headerLabel = "Evaluación Inicial 360°",
  showBack = true,
  showProgressBar = true,
  theme = 'gold',
  compact = false,
  className
}) => {
  const progress = Math.min(100, Math.max(0, (step / totalSteps) * 100));
  
  // Theme configuration
  const themeStyles = {
    gold: {
      text: 'text-[#D4AF37]',
      bg: 'bg-[#D4AF37]',
      border: 'border-[#D4AF37]/20',
      ring: '#D4AF37',
      accent: 'bg-[#D4AF37]/10'
    },
    blue: {
      text: 'text-blue-500',
      bg: 'bg-blue-500',
      border: 'border-blue-500/20',
      ring: '#3B82F6',
      accent: 'bg-blue-500/10'
    },
    neutral: {
      text: 'text-zinc-200',
      bg: 'bg-zinc-200',
      border: 'border-zinc-800',
      ring: '#E4E4E7',
      accent: 'bg-zinc-800'
    }
  };

  const currentTheme = themeStyles[theme];

  // SVG Circle Progress Constants
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn(
      "sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-zinc-900 transition-all duration-300",
      compact ? "py-2" : "py-4",
      className
    )}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back Button */}
          <div className="flex-shrink-0 w-10">
            <AnimatePresence>
              {showBack && (
                <motion.button 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={onBack} 
                  aria-label="Volver"
                  className="p-2.5 hover:bg-zinc-800/50 text-zinc-400 hover:text-white rounded-full transition-all group focus:outline-none focus:ring-2 focus:ring-zinc-700 active:scale-90"
                >
                  <ArrowLeft size={20} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Center: Title & Info */}
          <div className="flex-1 text-center min-w-0">
            <motion.h1 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm sm:text-base font-black tracking-tight uppercase leading-tight truncate px-2"
            >
              {headerLabel}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5 truncate"
            >
              {title}
            </motion.p>
          </div>

          {/* Right: Circular Progress Ring */}
          <div className="flex-shrink-0 relative flex items-center justify-center w-12 h-12">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="24"
                cy="24"
                r={radius}
                stroke="currentColor"
                strokeWidth="2.5"
                fill="transparent"
                className="text-zinc-800"
              />
              {/* Progress Circle */}
              <motion.circle
                cx="24"
                cy="24"
                r={radius}
                stroke={currentTheme.ring}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-[10px] font-black", currentTheme.text)}>
                {Math.round(progress)}<span className="text-[7px] ml-0.5">%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Progress Bar (Optional) */}
      <AnimatePresence>
        {showProgressBar && (
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            className="absolute bottom-0 left-0 w-full h-[1px] bg-zinc-800"
          >
            <motion.div 
              className={cn("h-full", currentTheme.bg)}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 40, damping: 20 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
