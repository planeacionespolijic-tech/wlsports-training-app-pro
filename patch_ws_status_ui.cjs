const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetUI = `              <div className="space-y-1.5">
                <label className="text-[8px] uppercase text-zinc-500 ml-2">Objetivo de la sesión</label>
                <textarea 
                  placeholder="Ej: Mejora de la potencia aeróbica y técnica de pase..." 
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none resize-none h-20" 
                  value={newObjective} 
                  onChange={(e) => setNewObjective(e.target.value)} 
                />
              </div>`;

const replaceUI = `              <div className="space-y-1.5">
                <label className="text-[8px] uppercase text-zinc-500 ml-2">Objetivo de la sesión</label>
                <textarea 
                  placeholder="Ej: Mejora de la potencia aeróbica y técnica de pase..." 
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none resize-none h-20" 
                  value={newObjective} 
                  onChange={(e) => setNewObjective(e.target.value)} 
                />
              </div>

              {(editingCollection === 'sessions' || editingCollection === 'history') && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest">Estado en Historial</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setSessionStatus('Realizada')}
                      className={\`py-3 px-4 rounded-xl font-bold text-xs uppercase transition-all \${sessionStatus === 'Realizada' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}\`}
                    >
                      Realizada
                    </button>
                    <button 
                      onClick={() => setSessionStatus('No realizada')}
                      className={\`py-3 px-4 rounded-xl font-bold text-xs uppercase transition-all \${sessionStatus === 'No realizada' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}\`}
                    >
                      No realizada
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] uppercase text-zinc-500 ml-2">Novedad / Nota (Opcional)</label>
                    <textarea 
                      placeholder={sessionStatus === 'Realizada' ? '¿Alguna observación?' : '¿Por qué no se realizó?'}
                      className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none resize-none h-20" 
                      value={sessionNotes} 
                      onChange={(e) => setSessionNotes(e.target.value)} 
                    />
                  </div>
                </div>
              )}`;

if (code.includes(targetUI)) {
  code = code.replace(targetUI, replaceUI);
  console.log('patched form UI');
} else {
  console.log('targetUI not found');
}
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
