const fs = require('fs');
let code = fs.readFileSync('src/screens/AthleteProfileScreen.tsx', 'utf8');

const target = `        message={\`¿Estás seguro de que deseas regresar a \${athlete.displayName} al nivel anterior? Esto restaurará su XP anterior o al máximo del nivel previo.\`}`;

const replace = `        message={\`¿Estás seguro de que deseas regresar a \${athlete.displayName} al nivel anterior? Esto ajustará su XP al máximo del nivel previo.\`}`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  console.log('patched msg');
} else {
  console.log('msg not found');
}
fs.writeFileSync('src/screens/AthleteProfileScreen.tsx', code);
