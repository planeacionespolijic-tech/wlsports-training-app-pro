import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

export interface MenuButtonProps {
  key?: string | number;
  icon: LucideIcon;
  title: string;
  onTap: () => void;
}

export const MenuButton = ({ icon: Icon, title, onTap }: MenuButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onTap}
      className="flex flex-col items-center justify-center p-6 bg-zinc-900 border-2 border-[#D4AF37] rounded-2xl shadow-lg transition-colors hover:bg-zinc-800 group"
    >
      <div className="mb-4 text-[#D4AF37] group-hover:scale-110 transition-transform">
        <Icon size={40} />
      </div>
      <span className="text-white font-medium text-center text-sm uppercase tracking-wider">
        {title}
      </span>
    </motion.button>
  );
};
