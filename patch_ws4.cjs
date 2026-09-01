const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetAdd = `      if (editingWorkoutId) {
        await updateDoc(doc(db, 'workouts', editingWorkoutId), workoutData);
      } else {
        await addDoc(collection(db, 'workouts'), { 
          ...workoutData, 
          createdAt: serverTimestamp() 
        });
      }`;

const replaceAdd = `      if (editingWorkoutId) {
        if (editingCollection === 'sessions' || editingCollection === 'history') {
           const historyUpdate: any = {
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
           };
           await updateDoc(doc(db, editingCollection, editingWorkoutId), historyUpdate);
        } else {
           await updateDoc(doc(db, editingCollection, editingWorkoutId), workoutData);
        }
      } else {
        await addDoc(collection(db, 'workouts'), { 
          ...workoutData, 
          createdAt: serverTimestamp() 
        });
      }`;

if (code.includes(targetAdd)) {
  code = code.replace(targetAdd, replaceAdd);
  console.log('patched handleAddWorkout');
} else {
  console.log('handleAddWorkout block not found');
}
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
