const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetState = `  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);`;
const replaceState = `  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionStatus, setSessionStatus] = useState<'Realizada' | 'No realizada'>('Realizada');
  const [sessionNotes, setSessionNotes] = useState('');`;

if (code.includes(targetState)) {
  code = code.replace(targetState, replaceState);
  console.log('patched state');
}

const targetReset = `    setEditingCollection('workouts');
    setActiveBlockId(null);
    setEditingExerciseId(null);
  };`;
const replaceReset = `    setEditingCollection('workouts');
    setActiveBlockId(null);
    setEditingExerciseId(null);
    setSessionStatus('Realizada');
    setSessionNotes('');
  };`;

if (code.includes(targetReset)) {
  code = code.replace(targetReset, replaceReset);
  console.log('patched reset');
}

const targetHandleEdit = `    setBlocks(workout.blocks || workout.workoutDetails?.blocks || []);
    setEditingWorkoutId(workout.id);
    setEditingCollection(workout.collection || 'workouts');`;
const replaceHandleEdit = `    setBlocks(workout.blocks || workout.workoutDetails?.blocks || []);
    setEditingWorkoutId(workout.id);
    setEditingCollection(workout.collection || 'workouts');
    setSessionStatus(workout.status || 'Realizada');
    setSessionNotes(workout.notes || '');`;

if (code.includes(targetHandleEdit)) {
  code = code.replace(targetHandleEdit, replaceHandleEdit);
  console.log('patched handleEdit');
}

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
