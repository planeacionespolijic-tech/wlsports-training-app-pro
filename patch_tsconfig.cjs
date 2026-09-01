const fs = require('fs');
let code = fs.readFileSync('tsconfig.app.json', 'utf8');

if (code.includes('"include":')) {
  // ensure neuro directory is included, but usually src/**/*.tsx covers it.
  // let's check tsconfig
  console.log(code);
}
