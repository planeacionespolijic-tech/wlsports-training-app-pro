const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');

const t1 = `  onAddSessionForPlan,
  loading = false,
  workouts = []
}: { `;
const r1 = `  onAddSessionForPlan,
  loading = false,
  workouts = [],
  onEditSession,
  onDeleteSession
}: { `;

if (code.includes(t1)) {
  code = code.replace(t1, r1);
  fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
  console.log('patched');
} else {
  console.log('not found');
}
