const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');

// 1. Add state for targetSessionCount
const target1 = `  const [endDate, setEndDate] = useState('');`;
const replace1 = `  const [endDate, setEndDate] = useState('');\n  const [targetSessionCount, setTargetSessionCount] = useState<number | ''>('');`;
if(code.includes(target1)) code = code.replace(target1, replace1);

// 2. Add to resetForm
const target2 = `    setEndDate('');\n    setBlocks(['Adaptación', 'Desarrollo', 'Mantenimiento']);\n  };`;
const replace2 = `    setEndDate('');\n    setTargetSessionCount('');\n    setBlocks(['Adaptación', 'Desarrollo', 'Mantenimiento']);\n  };`;
if(code.includes(target2)) code = code.replace(target2, replace2);

// 3. Add to handleEdit
const target3 = `    setEndDate(plan.endDate || '');\n    setShowForm(true);`;
const replace3 = `    setEndDate(plan.endDate || '');\n    setTargetSessionCount(plan.targetSessionCount || '');\n    setShowForm(true);`;
if(code.includes(target3)) code = code.replace(target3, replace3);

// 4. Update save function
const target4 = `        await updateDoc(doc(db, 'trainingPlans', editingPlanId), {
          title,
          generalObjective,
          specificObjectives,
          blocks,
          startDate,
          endDate,
          updatedAt: serverTimestamp(),
        });`;
const replace4 = `        await updateDoc(doc(db, 'trainingPlans', editingPlanId), {
          title,
          generalObjective,
          specificObjectives,
          blocks,
          startDate,
          endDate,
          targetSessionCount: targetSessionCount ? Number(targetSessionCount) : null,
          updatedAt: serverTimestamp(),
        });`;
if(code.includes(target4)) code = code.replace(target4, replace4);

const target5 = `        await addDoc(collection(db, 'trainingPlans'), {
          userId: targetUserId,
          trainerId: trainerIdForLog,
          title,
          generalObjective,
          specificObjectives,
          blocks,
          startDate,
          endDate,
          createdAt: serverTimestamp(),
        });`;
const replace5 = `        await addDoc(collection(db, 'trainingPlans'), {
          userId: targetUserId,
          trainerId: trainerIdForLog,
          title,
          generalObjective,
          specificObjectives,
          blocks,
          startDate,
          endDate,
          targetSessionCount: targetSessionCount ? Number(targetSessionCount) : null,
          createdAt: serverTimestamp(),
        });`;
if(code.includes(target5)) code = code.replace(target5, replace5);

// 5. Add input for targetSessionCount to form
const target6 = `              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Fecha Inicio</label>`;
const replace6 = `              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Cantidad de Sesiones (Meta)</label>
                <input 
                  type="number" min="1" value={targetSessionCount} onChange={e => setTargetSessionCount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                  placeholder="Ej: 12"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Fecha Inicio</label>`;
if(code.includes(target6)) code = code.replace(target6, replace6);

// 6. Calculate completed sessions and display progress
// We need to count workouts that have matching planId OR whose date falls between plan.startDate and plan.endDate
const target7 = `plans.map((item) => (`;
const replace7 = `plans.map((item) => {
              // Automatically sum sessions either linked explicitly OR created in the same period
              const planSessions = (workouts || []).filter((w: any) => {
                if (w.planId === item.id) return true;
                if (item.startDate && item.endDate && w.date) {
                  return w.date >= item.startDate && w.date <= item.endDate;
                }
                return false;
              });
              const completedCount = planSessions.length;
              const targetCount = item.targetSessionCount || null;
              const progressPercentage = targetCount ? Math.min(100, Math.round((completedCount / targetCount) * 100)) : 0;

              return (`;
if(code.includes(target7)) code = code.replace(target7, replace7);

const target8 = `                    <div>
                      <h3 className="font-bold text-lg text-[#D4AF37]">{item.title}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        {item.startDate ? \`\${new Date(item.startDate + 'T12:00:00').toLocaleDateString()} al \${new Date(item.endDate + 'T12:00:00').toLocaleDateString()}\` : 'Sin fechas definidas'}
                      </p>
                    </div>`;
const replace8 = `                    <div>
                      <h3 className="font-bold text-lg text-[#D4AF37]">{item.title}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        {item.startDate ? \`\${new Date(item.startDate + 'T12:00:00').toLocaleDateString()} al \${new Date(item.endDate + 'T12:00:00').toLocaleDateString()}\` : 'Sin fechas definidas'}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-full">
                          {completedCount} {targetCount ? \`/ \${targetCount}\` : ''} Sesiones
                        </span>
                        {targetCount && (
                          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#D4AF37] transition-all" style={{ width: \`\${progressPercentage}%\` }} />
                          </div>
                        )}
                      </div>
                    </div>`;
if(code.includes(target8)) code = code.replace(target8, replace8);

const target9 = `                  <div className="pt-4 border-t border-zinc-800 bg-zinc-800/10 p-4">`;
const replace9 = `                  {planSessions.length > 0 && (
                    <div className="px-6 pb-2">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2">Sesiones Vinculadas ({planSessions.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {planSessions.map((session: any) => (
                          <div key={session.id} className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-zinc-800/50">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-300">{session.name}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(session.date + 'T12:00:00').toLocaleDateString()}</span>
                            </div>
                            {session.completed && <CheckCircle2 size={14} className="text-emerald-500" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-4 border-t border-zinc-800 bg-zinc-800/10 p-4">`;
if(code.includes(target9)) code = code.replace(target9, replace9);

const target10 = `              </div>
            ))
          )}
        </div>`;
const replace10 = `              </div>
            );
          })
          )}
        </div>`;
if(code.includes(target10)) code = code.replace(target10, replace10);

fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
console.log('patched');
