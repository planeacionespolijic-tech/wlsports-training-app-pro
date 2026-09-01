const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const targetPrompt = `      prompt += \`- ESCALA DE MAESTRÍA (ASCENSO): Justo debajo del nombre, resaltar de manera destacada e iluminada el logro del ascenso. Texto a incluir: "ASCENSO: \${parsedData.previousLevel} ➔ \${parsedData.currentLevel}".\\n\`;`;

const replacePrompt = `      prompt += \`- ESCALA DE MAESTRÍA (ASCENSO): Justo debajo del nombre. Texto a incluir: "ASCENSO: \${parsedData.previousLevel} ➔ \${parsedData.currentLevel}".\\n\`;
      prompt += \`  -> MUY IMPORTANTE: El NUEVO NIVEL (\${parsedData.currentLevel}) debe tener un EFECTO VISUAL ESPECIAL (ej. brillo, resplandor, destello dorado, neón o glow en las letras) para que resalte épicamente sobre el nivel anterior.\\n\`;`;

if (code.includes(targetPrompt)) {
  code = code.replace(targetPrompt, replacePrompt);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log('patched glow effect successfully');
} else {
  console.log('could not find prompt target');
}
