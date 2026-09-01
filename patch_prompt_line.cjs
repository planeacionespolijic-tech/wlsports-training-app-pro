const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const target = `      prompt += \`- DATOS DEL DEPORTISTA: En texto decididamente más pequeño (Edad, Deporte, Perfil y Posición) ubicados estratégicamente como información secundaria.\\n\\n\`;`;
const replace = `      prompt += \`- DATOS DEL DEPORTISTA: En texto decididamente más pequeño, la Edad, Deporte, Categoría, Perfil y Posición DEBEN ir en UNA SOLA LÍNEA (separados por un punto o pleca, ej: 25 AÑOS • FÚTBOL • ELITE • DIESTRO • DELANTERO) ubicados estratégicamente como información secundaria en la base o centro de la tarjeta.\\n\\n\`;`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log('patched successfully');
} else {
  console.log('could not find target');
}
