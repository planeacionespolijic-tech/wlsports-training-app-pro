const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const manageModalJSX = `
      <AnimatePresence>
        {showManageModal && manageSessionData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6 text-white">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-zinc-800">
              <h2 className="text-xl font-black uppercase text-[#D4AF37] mb-4">Gestionar Sesión</h2>
              <p className="text-sm text-zinc-400 mb-6 line-clamp-1">{manageSessionData.workout?.name}</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Estado de la sesión</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setManageStatus('Realizada')}
                      className={\`py-3 px-4 rounded-xl font-bold text-xs uppercase transition-all \${manageStatus === 'Realizada' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}\`}
                    >
                      Realizada
                    </button>
                    <button 
                      onClick={() => setManageStatus('No realizada')}
                      className={\`py-3 px-4 rounded-xl font-bold text-xs uppercase transition-all \${manageStatus === 'No realizada' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}\`}
                    >
                      No realizada
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Novedad / Nota (Opcional)</label>
                  <textarea
                    value={manageNotes}
                    onChange={(e) => setManageNotes(e.target.value)}
                    placeholder={manageStatus === 'Realizada' ? '¿Alguna observación?' : '¿Por qué no se realizó?'}
                    className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm min-h-[80px] outline-none focus:border-[#D4AF37] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowManageModal(false)} className="flex-1 py-4 font-bold text-xs uppercase bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={executeManageSession} disabled={loading} className="flex-1 py-4 font-black text-xs uppercase bg-[#D4AF37] text-black rounded-xl hover:bg-yellow-500 transition-colors shadow-lg disabled:opacity-50 flex justify-center items-center gap-2">
                  {loading ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
`;

code = code.replace('<AnimatePresence>\n        {showGlobalRoutinesModal && (', manageModalJSX + '        {showGlobalRoutinesModal && (');

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log("Added ManageSessionModal");
