const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');

code = code.replace(
  "\\`\\${new Date(item.startDate + 'T12:00:00').toLocaleDateString()} al \\${new Date(item.endDate + 'T12:00:00').toLocaleDateString()}\\`",
  "\`\${new Date(item.startDate + 'T12:00:00').toLocaleDateString()} al \${new Date(item.endDate + 'T12:00:00').toLocaleDateString()}\`"
);
code = code.replace(
  "key={\\`plan-block-\\${block}-\\${i}\\`}",
  "key={\`plan-block-\${block}-\${i}\`}"
);
code = code.replace(
  "key={\\`block-\\${block}-\\${i}\\`}",
  "key={\`block-\${block}-\${i}\`}"
);

fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
console.log('Fixed syntax in TrainingPlansTab');
