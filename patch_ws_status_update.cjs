const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetAdd = `           const historyUpdate: any = {
             workoutName: newName.trim(),
             date: sessionDate,
             planId: selectedPlanId || null,
             planTitle: selectedPlan ? selectedPlan.title : null,
             workoutDetails: {
               blocks: cleanedBlocks,
               objective: newObjective.trim(),
               duration: formatTime(sessionTotalTime),
               totalTime: sessionTotalTime
             }
           };`;
const replaceAdd = `           const historyUpdate: any = {
             workoutName: newName.trim(),
             date: sessionDate,
             planId: selectedPlanId || null,
             planTitle: selectedPlan ? selectedPlan.title : null,
             status: sessionStatus,
             notes: sessionNotes,
             workoutDetails: {
               blocks: cleanedBlocks,
               objective: newObjective.trim(),
               duration: formatTime(sessionTotalTime),
               totalTime: sessionTotalTime
             }
           };`;

if (code.includes(targetAdd)) {
  code = code.replace(targetAdd, replaceAdd);
  console.log('patched save update');
}
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
