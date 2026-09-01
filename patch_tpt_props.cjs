const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');
code = code.replace(
  'loading = false\n}: { \n  plans: any[];',
  'loading = false,\n  workouts = []\n}: { \n  plans: any[];\n  workouts?: any[];'
);
fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
