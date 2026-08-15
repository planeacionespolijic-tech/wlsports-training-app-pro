const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const oldUI = `        ) : (
          <div className="space-y-4">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="text-[#D4AF37] animate-spin" size={32} /></div> :
            (Object.entries(groupedWorkouts) as [string, any[]][]).length === 0 ? <p className="text-center py-20 text-zinc-600 italic">No hay rutinas</p> :
            (Object.entries(groupedWorkouts) as [string, any[]][]).map(([monthYear, monthWorkouts]) => {
              const isExpanded = expandedGroups[monthYear];`;

const newUI = `        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl mb-2">
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
            </div>

            {activeTab === 'programados' && (
               <>
                 {loading ? <div className="flex justify-center py-20"><Loader2 className="text-[#D4AF37] animate-spin" size={32} /></div> :
                 (Object.entries(groupedWorkouts) as [string, any[]][]).length === 0 ? <p className="text-center py-20 text-zinc-600 italic">No hay rutinas programadas</p> :
                 (Object.entries(groupedWorkouts) as [string, any[]][]).map(([monthYear, monthWorkouts]) => {
                   const isExpanded = expandedGroups[monthYear];`;

code = code.replace(oldUI, newUI);
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log("Added tabs UI part 1");
