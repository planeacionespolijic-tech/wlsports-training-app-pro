const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetAddSession = `      await addDoc(collection(db, 'sessions'), {
        athleteId: athleteId,
        trainerId: trainerId || null,
        date: workout.date ? new Date(workout.date + "T12:00:00") : serverTimestamp(),
        createdAt: serverTimestamp(),
        exercisesCompleted: manageStatus === 'Realizada' ? exercisesCount : 0,
        xpGained: xpGained,
        isAscensionSession: false,
        approvedAscension: false,
        workoutName: workout.name || 'Entrenamiento',`;

const newAddSession = `      await addDoc(collection(db, 'sessions'), {
        athleteId: athleteId,
        trainerId: trainerId || null,
        date: workout.date ? new Date(workout.date + "T12:00:00") : serverTimestamp(),
        createdAt: serverTimestamp(),
        exercisesCompleted: manageStatus === 'Realizada' ? exercisesCount : 0,
        xpGained: xpGained,
        isAscensionSession: false,
        approvedAscension: false,
        workoutName: workout.name || 'Entrenamiento',
        planId: workout.planId || null,
        planTitle: workout.planTitle || null,`;

code = code.replace(targetAddSession, newAddSession);

const historyTarget = `                                         <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm">{item.workoutName}</h3>`;

const historyNew = `                                         <div className="flex flex-col">
                                            {item.planTitle && (
                                              <span className="text-[8px] text-[#D4AF37] font-black uppercase tracking-widest bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20 w-fit mb-1">
                                                Plan: {item.planTitle}
                                              </span>
                                            )}
                                            <div className="flex items-center gap-2">
                                              <h3 className="font-bold text-sm">{item.workoutName}</h3>`;

code = code.replace(historyTarget, historyNew);

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('patched session creation & history');
