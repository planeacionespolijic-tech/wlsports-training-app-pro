const fs = require('fs');
let code = fs.readFileSync('src/screens/PlanningScreen.tsx', 'utf8');

const targetItem = `                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">Objetivo Principal</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed">{item.objective}</p>
                    </div>`;

const newItem = `                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">Objetivo General</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed">{item.generalObjective || (item as any).objective}</p>
                    </div>
                    {item.specificObjectives && (
                      <div className="space-y-2 mt-4">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">Objetivos Específicos</h4>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.specificObjectives}</p>
                      </div>
                    )}`;

code = code.replace(targetItem, newItem);

const btnTarget = `                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Estructura de Bloques</h4>`;
const btnNew = `                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Estructura de Bloques</h4>`;
                      
const btnAdd = `                      </div>
                    </div>
                  </div>`;
const btnAddNew = `                      </div>
                    </div>
                    
                    {isAdminOrTrainer && (
                      <div className="pt-4 border-t border-zinc-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/entrenamientos', { 
                              state: { 
                                athleteId: targetUserId, 
                                athlete: location.state?.athlete,
                                planId: item.id,
                                planTitle: item.title,
                                isAdding: true 
                              } 
                            });
                          }}
                          className="w-full bg-zinc-800 hover:bg-[#D4AF37] hover:text-black text-white px-4 py-3 rounded-xl font-bold transition-all uppercase text-[10px] tracking-widest text-center"
                        >
                          Crear Sesión para este Plan
                        </button>
                      </div>
                    )}
                  </div>`;
code = code.replace(btnAdd, btnAddNew);

fs.writeFileSync('src/screens/PlanningScreen.tsx', code);
console.log('patched item list display');
