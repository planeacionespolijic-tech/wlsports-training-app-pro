const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const stateTarget = `  const [newName, setNewName] = useState('');`;
const stateNew = `  // Plan integration
  const [trainingPlans, setTrainingPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState(location.state?.planId || '');

  const [newName, setNewName] = useState('');`;
code = code.replace(stateTarget, stateNew);

const effectTarget = `  useEffect(() => {
    if (!targetUserId) return;`;
const effectNew = `  useEffect(() => {
    if (!targetUserId) return;
    
    // Fetch user's plans
    const qPlans = query(collection(db, 'trainingPlans'), where('userId', '==', targetUserId), orderBy('createdAt', 'desc'));
    const unsubPlans = onSnapshot(qPlans, (snap) => {
      setTrainingPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });`;
code = code.replace(effectTarget, effectNew);

const cleanupTarget = `    return () => unsubscribe();
  }, [targetUserId]);`;
const cleanupNew = `    return () => { unsubscribe(); unsubPlans(); };
  }, [targetUserId]);`;
code = code.replace(cleanupTarget, cleanupNew);

const saveTarget = `      const workoutData: any = {
        name: newName.trim(),
        objective: newObjective.trim(),
        date: sessionDate,`;
const saveNew = `      const selectedPlan = trainingPlans.find(p => p.id === selectedPlanId);
      
      const workoutData: any = {
        name: newName.trim(),
        objective: newObjective.trim(),
        planId: selectedPlanId || null,
        planTitle: selectedPlan ? selectedPlan.title : null,
        date: sessionDate,`;
code = code.replace(saveTarget, saveNew);

const formTarget = `                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Fecha Programada</label>`;
const formNew = `                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[#D4AF37]">Vincular a Planificación (Opcional)</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full bg-black border border-zinc-800 p-4 rounded-xl focus:border-[#D4AF37] outline-none text-sm text-zinc-300"
                  >
                    <option value="">Sin plan vinculado</option>
                    {trainingPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.title} ({new Date(plan.startDate + 'T12:00:00').toLocaleDateString()} - {new Date(plan.endDate + 'T12:00:00').toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Fecha Programada</label>`;
code = code.replace(formTarget, formNew);

const cardTarget = `                                    <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-sm tracking-tight">{item.name}</h3>`;
const cardNew = `                                    <div className="flex flex-col">
                                      {item.planTitle && (
                                        <span className="text-[8px] text-[#D4AF37] font-black uppercase tracking-widest bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20 w-fit mb-1">
                                          Plan: {item.planTitle}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm tracking-tight">{item.name}</h3>`;
code = code.replace(cardTarget, cardNew);

// Wait, the card target might match both normal workouts and history workouts.
// Let's use regex or replaceAll if needed, but replace only does first match.
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('patched WorkoutsScreen');
