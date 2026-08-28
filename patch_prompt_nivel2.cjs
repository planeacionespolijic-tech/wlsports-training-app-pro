const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const targetStr = `      if (parsedData.levelObjectiveSpec && parsedData.levelObjectiveSpec !== 'No registrado' && parsedData.levelObjectiveSpec.trim() !== '') {
        prompt += \`OBJETIVOS ESPECÍFICOS:\\n\${parsedData.levelObjectiveSpec}\\n\\n\`;
      }`;

const targetIdx = code.indexOf(targetStr);
if (targetIdx !== -1) {
  const insertIdx = targetIdx + targetStr.length;
  const toInsert = `

      if (parsedData.plans && parsedData.plans.length > 0) {
        prompt += \`PLANES DE ENTRENAMIENTO TRABAJADOS (MACROCICLOS/MESOCICLOS):\\n\`;
        parsedData.plans.forEach((p: any) => {
          prompt += \`- \${p.title}\\n\`;
          if (p.generalObjective && p.generalObjective !== 'Sin objetivo general') {
            prompt += \`  Objetivo: \${p.generalObjective}\\n\`;
          }
        });
        prompt += \`\\n\`;
      }`;
  
  code = code.slice(0, insertIdx) + toInsert + code.slice(insertIdx);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log('Successfully patched!');
} else {
  console.log('Target not found!');
}
