const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');

const t1 = `  onAddSessionForPlan: (planId: string, planTitle: string) => void;
  loading?: boolean;
}) => {`;
const r1 = `  onAddSessionForPlan: (planId: string, planTitle: string) => void;
  onEditSession?: (session: any) => void;
  onDeleteSession?: (sessionId: string) => void;
  loading?: boolean;
}) => {`;
if (code.includes(t1)) code = code.replace(t1, r1);

const t2 = `  workouts = []
}: { 
  plans: any[];
  workouts?: any[];
  targetUserId: string;`;
const r2 = `  workouts = [],
  onEditSession,
  onDeleteSession
}: { 
  plans: any[];
  workouts?: any[];
  targetUserId: string;`;
if (code.includes(t2)) code = code.replace(t2, r2);

const t3 = `                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-300">{session.name}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(session.date + 'T12:00:00').toLocaleDateString()}</span>
                            </div>
                            {session.completed && <CheckCircle2 size={14} className="text-emerald-500" />}`;
const r3 = `                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-300">{session.name}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(session.date + 'T12:00:00').toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {session.completed && <CheckCircle2 size={14} className="text-emerald-500 mr-2" />}
                              {isAdminOrTrainer && onEditSession && (
                                <button onClick={(e) => { e.stopPropagation(); onEditSession(session); }} className="p-1.5 text-zinc-500 hover:text-[#D4AF37] transition-colors"><Edit2 size={14} /></button>
                              )}
                              {isAdminOrTrainer && onDeleteSession && (
                                <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                              )}
                            </div>`;
if (code.includes(t3)) code = code.replace(t3, r3);

fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
console.log('patched');
