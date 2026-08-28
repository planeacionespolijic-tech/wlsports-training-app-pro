const fs = require('fs');
let code = fs.readFileSync('src/hooks/useInitialEvaluation.ts', 'utf8');

const oldInitial = `  profile: {
    name: '',
    age: '',
    sport: '',
    position: '',
    laterality: 'Derecha',
    inspiration: ''
  },`;

const newInitial = `  profile: {
    name: '',
    age: '',
    sport: '',
    position: '',
    laterality: 'Derecha',
    inspiration: '',
    nationality: '',
    category: ''
  },`;

if (code.includes(oldInitial)) {
  code = code.replace(oldInitial, newInitial);
  fs.writeFileSync('src/hooks/useInitialEvaluation.ts', code);
  console.log('patched initial');
} else {
  console.log('could not patch initial');
}
