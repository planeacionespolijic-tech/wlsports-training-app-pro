const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainerDashboard.tsx', 'utf8');

const target1 = `                { id: 'tabata', title: 'Tabata Timer', icon: Timer, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { id: 'reaccion', title: 'Reacción Visual', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },`;

const replace1 = `                { id: 'tabata', title: 'Tabata Timer', icon: Timer, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { id: 'neuro', title: 'Entrenamiento Neuro', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },`;

if (code.includes(target1)) {
  code = code.replace(target1, replace1);
  fs.writeFileSync('src/screens/TrainerDashboard.tsx', code);
  console.log('TrainerDashboard patched');
} else {
  console.log('Failed to patch TrainerDashboard');
}
