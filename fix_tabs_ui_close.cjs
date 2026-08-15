const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const oldMapClose = `              );
            })
          }
        </div>
        )}
      </main>`;

const newMapClose = `              );
            })
          }
               </>
            )}

            {activeTab === 'historial' && (
               <>
                 {loadingHistory ? <div className="flex justify-center py-20"><Loader2 className="text-[#D4AF37] animate-spin" size={32} /></div> :
                 (Object.entries(groupedHistory) as [string, any[]][]).length === 0 ? <p className="text-center py-20 text-zinc-600 italic">No hay registros en el historial</p> :
                 (Object.entries(groupedHistory) as [string, any[]][]).map(([monthYear, monthHistory]) => {
                   const isExpanded = expandedHistoryGroups[monthYear];
                   return (
                     <div key={monthYear} className="space-y-4">
                       <div 
                         className="flex items-center gap-3 px-2 cursor-pointer group select-none"
                         onClick={() => toggleHistoryGroup(monthYear)}
                       >
                         <Calendar size={14} className={isExpanded ? "text-[#D4AF37]" : "text-zinc-600 group-hover:text-zinc-400"} />
                         <h2 className={\`text-[10px] font-black uppercase tracking-[0.2em] transition-colors \${isExpanded ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'}\`}>
                           {monthYear} <span className="text-zinc-700 ml-2">({monthHistory.length})</span>
                         </h2>
                         <div className="h-[1px] flex-1 bg-zinc-800/50"></div>
                         {isExpanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
                       </div>
                       
                       <AnimatePresence>
                         {isExpanded && (
                           <motion.div 
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: 'auto' }}
                             exit={{ opacity: 0, height: 0 }}
                             transition={{ duration: 0.3, ease: "circOut" }}
                             className="overflow-hidden"
                           >
                             <div className="grid grid-cols-1 gap-4 pb-6">
                               {monthHistory.map((item) => (
                                 <div key={item.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                                   <div 
                                     className="p-4 flex items-center justify-between cursor-pointer"
                                     onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
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
                                     <div className="flex items-center gap-3">
                                       {(userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' || targetUserId === user?.uid) && (
                                         <button 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             handleDeleteHistory(item.id, item.collection);
                                           }}
                                           className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                                         >
                                           <Trash2 size={18} />
                                         </button>
                                       )}
                                       {(item.workoutDetails?.blocks?.length > 0 || item.notes) && (
                                         <div className="text-zinc-600">
                                           {expandedHistoryId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                   {expandedHistoryId === item.id && (
                                     <div className="px-4 pb-4 border-t border-zinc-800 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                       {item.notes && (
                                         <div className="mb-4 bg-black/50 p-3 rounded-xl border border-zinc-800">
                                            <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500 mb-1">Novedades / Notas</p>
                                            <p className="text-xs text-zinc-300 italic">"{item.notes}"</p>
                                         </div>
                                       )}
                                       {item.workoutDetails?.blocks?.length > 0 && (
                                        <>
                                         <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-2 font-bold">Fases de la sesión</h4>
                                         <div className="space-y-3">
                                           {item.workoutDetails.blocks.map((block: any, idx: number) => (
                                             <div key={idx} className="space-y-1">
                                               <p className="text-xs font-bold text-zinc-400">{block.name}</p>
                                               <div className="pl-2 border-l border-zinc-800 space-y-1">
                                                 {block.exercises?.map((ex: any, eIdx: number) => (
                                                   <div key={eIdx} className="flex justify-between text-[11px] text-zinc-500">
                                                     <span>{ex.name} {ex.loadType === 'externa' ? \`(\${ex.loadValue || ex.load})\` : ex.loadType === 'autocarga' ? '(Autocarga)' : ''}</span>
                                                     <span>{ex.series || 1} series x {ex.reps || (ex.timePerSeries ? ex.timePerSeries + 's' : '-')}</span>
                                                   </div>
                                                 ))}
                                                 {block.circuit?.items?.map((item: any, iIdx: number) => (
                                                   <div key={iIdx} className="flex justify-between text-[11px] text-zinc-500">
                                                     <span>{item.name}</span>
                                                     <span>{item.time || item.timePerSeries}s {item.reps ? \`x \${item.reps}\` : ''}</span>
                                                   </div>
                                                 ))}
                                               </div>
                                             </div>
                                           ))}
                                         </div>
                                        </>
                                       )}
                                     </div>
                                   )}
                                 </div>
                               ))}
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                   );
                 })
                 }
               </>
            )}
          </div>
        )}
      </main>`;

code = code.replace(oldMapClose, newMapClose);

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log("Added tabs UI part 2");
