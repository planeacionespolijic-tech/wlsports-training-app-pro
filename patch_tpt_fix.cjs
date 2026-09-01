const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');

const t1 = `                {isAdminOrTrainer && (
                  {planSessions.length > 0 && (`;
const r1 = `                  {planSessions.length > 0 && (`;

if (code.includes(t1)) {
  code = code.replace(t1, r1);
  fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
  console.log('patched 1');
} else {
  console.log('not found 1');
}
