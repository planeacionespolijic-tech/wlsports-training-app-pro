const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

// 1. Add editingCollection state
code = code.replace(
  `  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);`,
  `  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);\n  const [editingCollection, setEditingCollection] = useState<string>('workouts');`
);

// 2. Update resetForm
code = code.replace(
  `    setEditingWorkoutId(null);\n    setActiveBlockId(null);`,
  `    setEditingWorkoutId(null);\n    setEditingCollection('workouts');\n    setActiveBlockId(null);`
);

// 3. Update handleEdit
const targetEdit = `  const handleEdit = (workout: any) => {
    setNewName(workout.name);
    setNewObjective(workout.objective || '');
    setSessionDate(workout.date || new Date().toISOString().split('T')[0]);
    setBlocks(workout.blocks || []);
    setEditingWorkoutId(workout.id);
    setIsAdding(true);
    if (workout.blocks?.length > 0) setActiveBlockId(workout.blocks[0].id);
  };`;
const replaceEdit = `  const handleEdit = (workout: any) => {
    setNewName(workout.name || workout.workoutName || '');
    setNewObjective(workout.objective || workout.workoutDetails?.objective || '');
    setSessionDate(workout.date || new Date().toISOString().split('T')[0]);
    setBlocks(workout.blocks || workout.workoutDetails?.blocks || []);
    setEditingWorkoutId(workout.id);
    setEditingCollection(workout.collection || 'workouts');
    setSelectedPlanId(workout.planId || '');
    setIsAdding(true);
    if (workout.blocks?.length > 0) setActiveBlockId(workout.blocks[0].id);
    else if (workout.workoutDetails?.blocks?.length > 0) setActiveBlockId(workout.workoutDetails.blocks[0].id);
  };`;
if (code.includes(targetEdit)) {
  code = code.replace(targetEdit, replaceEdit);
} else {
  console.log('handleEdit not found');
}

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('patched 1-3');
