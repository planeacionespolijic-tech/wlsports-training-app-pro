const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const target = `      if (parsedData.levelObjectiveSpec && parsedData.levelObjectiveSpec !== 'No registrado' && parsedData.levelObjectiveSpec.trim() !== '') {
        prompt += \`OBJETIVOS ESPECÍFICOS:\\n\${parsedData.levelObjectiveSpec}\\n\\n\`;
      }
      prompt += \`MENSAJE MOTIVACIONAL:\\n\`;`;

const newCode = `      if (parsedData.levelObjectiveSpec && parsedData.levelObjectiveSpec !== 'No registrado' && parsedData.levelObjectiveSpec.trim() !== '') {
        prompt += \`OBJETIVOS ESPECÍFICOS:\\n\${parsedData.levelObjectiveSpec}\\n\\n\`;
      }

      if (parsedData.plans && parsedData.plans.length > 0) {
        prompt += \`PLANES DE ENTRENAMIENTO TRABAJADOS (MACROCICLOS/MESOCICLOS):\\n\`;
        parsedData.plans.forEach((p: any) => {
          prompt += \`- \${p.title}\\n\`;
          if (p.generalObjective && p.generalObjective !== 'Sin objetivo general') {
            prompt += \`  Objetivo: \${p.generalObjective}\\n\`;
          }
        });
        prompt += \`\\n\`;
      }

      prompt += \`MENSAJE MOTIVACIONAL:\\n\`;`;

code = code.replace(target, newCode);
fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log('patched');
