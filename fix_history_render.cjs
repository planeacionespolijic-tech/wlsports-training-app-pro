const fs = require('fs');
let code = fs.readFileSync('src/screens/HistoryScreen.tsx', 'utf8');

const oldMap = `                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-zinc-800 p-3 rounded-xl text-zinc-400">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold">{item.workoutName}</h3>
                        <p className="text-zinc-500 text-xs">{item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">`;

const newMap = `                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-zinc-800 p-3 rounded-xl text-[#D4AF37]">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <h3 className="font-bold text-sm">{item.workoutName}</h3>
                           {item.status === 'Realizada' && <span className="bg-green-500/10 text-green-500 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">✓ OK</span>}
                           {item.status === 'No realizada' && <span className="bg-red-500/10 text-red-500 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">✕ Novedad</span>}
                        </div>
                        <p className="text-zinc-400 text-xs mt-0.5">{item.date} {item.xpGained ? \`• +\${item.xpGained} XP\` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">`;

code = code.replace(oldMap, newMap);

const oldExp = `                  {expandedId === item.id && item.workoutDetails?.blocks?.length > 0 && (
                    <div className="px-4 pb-4 border-t border-zinc-800 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-2 font-bold">Detalles de la sesión</h4>`;

const newExp = `                  {expandedId === item.id && (
                    <div className="px-4 pb-4 border-t border-zinc-800 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      {item.notes && (
                        <div className="mb-4 bg-black/50 p-3 rounded-xl border border-zinc-800">
                           <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500 mb-1">Novedades / Notas</p>
                           <p className="text-xs text-zinc-300 italic">"{item.notes}"</p>
                        </div>
                      )}
                      {item.workoutDetails?.blocks?.length > 0 && (
                       <>
                        <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-2 font-bold">Fases de la sesión</h4>`;

code = code.replace(oldExp, newExp);

// Don't forget to close the fragment
const oldExpClose = `                        ))}
                      </div>
                    </div>
                  )}`;

const newExpClose = `                        ))}
                      </div>
                       </>
                      )}
                    </div>
                  )}`;

code = code.replace(oldExpClose, newExpClose);

fs.writeFileSync('src/screens/HistoryScreen.tsx', code);
console.log("Fixed HistoryScreen rendering");
