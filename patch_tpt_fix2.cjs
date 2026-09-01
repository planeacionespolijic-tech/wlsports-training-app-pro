const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');

const t1 = `                  )}
                  <div className="pt-4 border-t border-zinc-800 bg-zinc-800/10 p-4">`;
const r1 = `                  )}
                  {isAdminOrTrainer && (
                  <div className="pt-4 border-t border-zinc-800 bg-zinc-800/10 p-4">`;

if (code.includes(t1)) {
  code = code.replace(t1, r1);
  fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
  console.log('patched 2');
} else {
  console.log('not found 2');
}
