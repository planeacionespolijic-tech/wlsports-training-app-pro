const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');
code = code.replace(
  '<TrainingPlansTab \n                plans={trainingPlans}',
  '<TrainingPlansTab \n                plans={trainingPlans}\n                workouts={workouts}'
);
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
