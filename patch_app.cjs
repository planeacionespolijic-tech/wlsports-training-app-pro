const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(`import { PlanningScreen } from './screens/PlanningScreen';`, '');
code = code.replace(`<Route path="/planificacion" element={<ProtectedRoute><ScreenWrapper><PlanningScreen /></ScreenWrapper></ProtectedRoute>} />`, '');

fs.writeFileSync('src/App.tsx', code);
console.log('patched app');
