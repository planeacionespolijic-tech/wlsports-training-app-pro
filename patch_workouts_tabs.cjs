const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetState = `  const [activeTab, setActiveTab] = useState<'programados' | 'historial'>('programados');`;
const newState = `  const [activeTab, setActiveTab] = useState<'planes' | 'programados' | 'historial'>('planes');`;
code = code.replace(targetState, newState);

const targetTabsUI = `            <div className="flex gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl mb-2">
              <button
                onClick={() => setActiveTab('programados')}
                className={\`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all \${activeTab === 'programados' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}\`}
              >
                Programados
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={\`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all \${activeTab === 'historial' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}\`}
              >
                Historial
              </button>
            </div>`;

const newTabsUI = `            <div className="flex gap-1 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl mb-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
              <button
                onClick={() => setActiveTab('planes')}
                className={\`flex-1 min-w-fit px-3 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-lg transition-all \${activeTab === 'planes' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}\`}
              >
                Planes
              </button>
              <button
                onClick={() => setActiveTab('programados')}
                className={\`flex-1 min-w-fit px-3 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-lg transition-all \${activeTab === 'programados' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}\`}
              >
                Programados
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={\`flex-1 min-w-fit px-3 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-lg transition-all \${activeTab === 'historial' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}\`}
              >
                Historial
              </button>
            </div>`;
code = code.replace(targetTabsUI, newTabsUI);

// Check if we need to rename the header
const targetHeader = `(isViewingAthlete ? 'Entrenamientos de Atleta' : 'Mis Entrenamientos')}`;
const newHeader = `(isViewingAthlete ? 'Plan de Trabajo' : 'Plan de Trabajo')}`;
code = code.replace(targetHeader, newHeader);

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('patched tabs and header');
