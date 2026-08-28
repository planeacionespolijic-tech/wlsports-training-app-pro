const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(`const PlanningScreen = lazy(() => import('./screens/PlanningScreen').then(m => ({ default: m.PlanningScreen })));`, '');

fs.writeFileSync('src/App.tsx', code);
console.log('patched app again');
