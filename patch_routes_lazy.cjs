const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `const KidsModuleScreen = lazy(() => import('./screens/KidsModuleScreen').then(m => ({ default: m.KidsModuleScreen })));`;
const replace1 = `const KidsModuleScreen = lazy(() => import('./screens/KidsModuleScreen').then(m => ({ default: m.KidsModuleScreen })));
const NeuroHubScreen = lazy(() => import('./screens/neuro/NeuroHubScreen').then(m => ({ default: m.NeuroHubScreen })));
const StroopScreen = lazy(() => import('./screens/neuro/StroopScreen').then(m => ({ default: m.StroopScreen })));
const SchulteScreen = lazy(() => import('./screens/neuro/SchulteScreen').then(m => ({ default: m.SchulteScreen })));
const SimonScreen = lazy(() => import('./screens/neuro/SimonScreen').then(m => ({ default: m.SimonScreen })));`;

const target2 = `<Route path="/kids-module" element={<ProtectedRoute><ScreenWrapper><KidsModuleScreen /></ScreenWrapper></ProtectedRoute>} />`;
const replace2 = `<Route path="/kids-module" element={<ProtectedRoute><ScreenWrapper><KidsModuleScreen /></ScreenWrapper></ProtectedRoute>} />
          <Route path="/neuro" element={<ProtectedRoute><ScreenWrapper><NeuroHubScreen /></ScreenWrapper></ProtectedRoute>} />
          <Route path="/stroop" element={<ProtectedRoute><ScreenWrapper><StroopScreen /></ScreenWrapper></ProtectedRoute>} />
          <Route path="/schulte" element={<ProtectedRoute><ScreenWrapper><SchulteScreen /></ScreenWrapper></ProtectedRoute>} />
          <Route path="/simon" element={<ProtectedRoute><ScreenWrapper><SimonScreen /></ScreenWrapper></ProtectedRoute>} />`;

if (code.includes(target1) && code.includes(target2)) {
  code = code.replace(target1, replace1);
  code = code.replace(target2, replace2);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Lazy routes patched');
} else {
  console.log('Failed to patch lazy routes');
}
