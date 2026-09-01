const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainerDashboard.tsx', 'utf8');

const target = `  LayoutDashboard, Award
} from 'lucide-react';`;

const replace = `  LayoutDashboard, Award, Brain
} from 'lucide-react';`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/screens/TrainerDashboard.tsx', code);
  console.log('Imports patched in TrainerDashboard');
} else {
  console.log('Failed to patch imports in TrainerDashboard');
}
