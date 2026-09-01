const fs = require('fs');
let code = fs.readFileSync('src/hooks/useInitialEvaluation.ts', 'utf8');

if (!code.includes('birthDate:')) {
  code = code.replace(
    'name: \'\',\n    age: \'\',',
    'name: \'\',\n    birthDate: \'\',\n    age: \'\','
  );
  fs.writeFileSync('src/hooks/useInitialEvaluation.ts', code);
  console.log('patched hook');
} else {
  console.log('already patched hook');
}
