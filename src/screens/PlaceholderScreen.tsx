import { ArrowLeft } from 'lucide-react';

interface PlaceholderScreenProps {
  title: string;
  onBack: () => void;
}

export const PlaceholderScreen = ({ title, onBack }: PlaceholderScreenProps) => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{title}</h1>
      </header>
      <main className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-8 opacity-20" />
          <h2 className="text-2xl font-light text-zinc-400 uppercase tracking-[0.2em]">
            {title}
          </h2>
          <p className="text-zinc-600 italic">Próximamente disponible</p>
        </div>
      </main>
    </div>
  );
};
