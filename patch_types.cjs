const fs = require('fs');
let code = fs.readFileSync('src/services/evaluationEngine.ts', 'utf8');

const oldProfile = `  profile: {
    name: string;
    age: string;
    sport: string;
    position: string;
    laterality: string;
    inspiration: string;
  };`;

const newProfile = `  profile: {
    name: string;
    age: string;
    sport: string;
    position: string;
    laterality: string;
    inspiration: string;
    nationality: string;
    category: string;
  };`;

if (code.includes(oldProfile)) {
  code = code.replace(oldProfile, newProfile);
  fs.writeFileSync('src/services/evaluationEngine.ts', code);
  console.log('patched types');
} else {
  console.log('could not patch types');
}
