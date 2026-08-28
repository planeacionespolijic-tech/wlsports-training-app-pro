const fs = require('fs');
let code = fs.readFileSync('src/screens/PlanningScreen.tsx', 'utf8');

const targetUI = `                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Objetivo Principal</label>
                  <textarea 
                    value={objective} onChange={e => setObjective(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-20 resize-none"
                    placeholder="Ej: Aumentar masa muscular 2kg, mejorar VO2 Max..." required
                  />
                </div>`;

const newUI = `                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Objetivo General</label>
                  <textarea 
                    value={generalObjective} onChange={e => setGeneralObjective(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-20 resize-none"
                    placeholder="Ej: Aumentar masa muscular 2kg, mejorar VO2 Max..." required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Objetivos Específicos</label>
                  <textarea 
                    value={specificObjectives} onChange={e => setSpecificObjectives(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-20 resize-none"
                    placeholder="Ej: - Reducir 10% el tiempo en 5km\n- Incrementar peso en sentadilla a 120kg..." 
                  />
                </div>`;

code = code.replace(targetUI, newUI);

// Let's also patch the rendering of the plan list
const targetList = `                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{plan.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{plan.objective}</p>
                      {(plan.startDate || plan.endDate) && (
                        <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
                          <CalendarClock size={12} />
                          {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : 'N/A'} - {plan.endDate ? new Date(plan.endDate).toLocaleDateString() : 'N/A'}
                        </p>
                      )}
                    </div>`;

const newList = `                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-[#D4AF37]">{plan.title}</h3>
                      
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-bold text-zinc-300">Objetivo General:</p>
                        <p className="text-xs text-zinc-400 line-clamp-2 italic">{plan.generalObjective || (plan as any).objective}</p>
                      </div>
                      
                      {(plan.specificObjectives || (plan as any).objective) && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-bold text-zinc-300">Objetivos Específicos:</p>
                          <p className="text-xs text-zinc-400 line-clamp-2 italic">{plan.specificObjectives || 'No registrados'}</p>
                        </div>
                      )}
                      
                      {(plan.startDate || plan.endDate) && (
                        <p className="text-[10px] text-zinc-500 mt-3 font-bold uppercase tracking-widest flex items-center gap-1">
                          <CalendarClock size={12} />
                          {plan.startDate ? new Date(plan.startDate + "T12:00:00").toLocaleDateString('es-ES', {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'} - {plan.endDate ? new Date(plan.endDate + "T12:00:00").toLocaleDateString('es-ES', {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                        </p>
                      )}
                      
                      {isAdminOrTrainer && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/entrenamientos', { 
                              state: { 
                                athleteId: targetUserId, 
                                athlete: location.state?.athlete,
                                planId: plan.id,
                                planTitle: plan.title,
                                isAdding: true 
                              } 
                            });
                          }}
                          className="mt-4 bg-zinc-800 text-white hover:text-[#D4AF37] text-xs px-4 py-2 rounded-lg font-bold transition-colors inline-flex items-center gap-2"
                        >
                          <Plus size={14} /> Crear Sesión para este Plan
                        </button>
                      )}
                    </div>`;

code = code.replace(targetList, newList);
fs.writeFileSync('src/screens/PlanningScreen.tsx', code);
console.log('patched UI in PlanningScreen');
