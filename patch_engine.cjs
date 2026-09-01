const fs = require('fs');
let code = fs.readFileSync('src/services/evaluationEngine.ts', 'utf8');

if (!code.includes('birthDate: string;')) {
  code = code.replace(
    'name: string;\n    age: string;',
    'name: string;\n    birthDate: string;\n    age: string;'
  );
  fs.writeFileSync('src/services/evaluationEngine.ts', code);
  console.log('patched evaluationEngine');
} else {
  console.log('already patched');
}
