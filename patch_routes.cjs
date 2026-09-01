const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import { KidsModuleScreen } from './screens/KidsModuleScreen';`;
const newImports = `import { KidsModuleScreen } from './screens/KidsModuleScreen';
import { NeuroHubScreen } from './screens/neuro/NeuroHubScreen';
import { StroopScreen } from './screens/neuro/StroopScreen';
import { SchulteScreen } from './screens/neuro/SchulteScreen';
import { SimonScreen } from './screens/neuro/SimonScreen';`;

const routeTarget = `<Route path="/kids-module" element={<ProtectedRoute><ScreenWrapper><KidsModuleScreen /></ScreenWrapper></ProtectedRoute>} />`;
const newRoutes = `<Route path="/kids-module" element={<ProtectedRoute><ScreenWrapper><KidsModuleScreen /></ScreenWrapper></ProtectedRoute>} />
          <Route path="/neuro" element={<ProtectedRoute><ScreenWrapper><NeuroHubScreen /></ScreenWrapper></ProtectedRoute>} />
          <Route path="/stroop" element={<ProtectedRoute><ScreenWrapper><StroopScreen /></ScreenWrapper></ProtectedRoute>} />
          <Route path="/schulte" element={<ProtectedRoute><ScreenWrapper><SchulteScreen /></ScreenWrapper></ProtectedRoute>} />
          <Route path="/simon" element={<ProtectedRoute><ScreenWrapper><SimonScreen /></ScreenWrapper></ProtectedRoute>} />`;

if (code.includes(importTarget) && code.includes(routeTarget)) {
  code = code.replace(importTarget, newImports);
  code = code.replace(routeTarget, newRoutes);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Routes patched');
} else {
  console.log('Failed to patch routes');
}
