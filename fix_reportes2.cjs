const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

// Update athlete mapping to check initialEvaluation
code = code.replace(
  /athlete: {([\s\S]*?)},/g,
  `athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },`
);

// Update attribute default handling to match AthleteProfileScreen (using 10 as default if not defined)
const attrRegex = /const attributes = athlete\.attributes \? {[\s\S]*?} : { TEC: '—', FIS: '—', NEU: '—', AGI: '—', ACT: '—' };/g;
code = code.replace(
  attrRegex,
  `const attributes = {
      TEC: cleanUndefined(athlete.attributes?.TEC || athlete.attributes?.tecnica || 10, 'visual'),
      FIS: cleanUndefined(athlete.attributes?.FIS || athlete.attributes?.fuerza || 10, 'visual'),
      NEU: cleanUndefined(athlete.attributes?.NEU || athlete.attributes?.neuro || 10, 'visual'),
      AGI: cleanUndefined(athlete.attributes?.AGI || athlete.attributes?.ritmo || 10, 'visual'),
      ACT: cleanUndefined(athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10, 'visual')
    };`
);

// We should also replace the logic in Nivel where it says: "ATRIBUTOS ACTUALES:"
// Find where it's replaced in Nivel:
const attributesPatternNivel = /ATRIBUTOS ACTUALES:\\n\`;([\s\S]*?)prompt \+= \`EVOLUCIÓN DE ATRIBUTOS\\n\`;/g;
code = code.replace(
  attributesPatternNivel,
  `ATRIBUTOS ACTUALES:\\n\`;
      prompt += \`⚽ TEC: \${athlete.attributes?.TEC || athlete.attributes?.tecnica || 10}\\n\`;
      prompt += \`💪 FIS: \${athlete.attributes?.FIS || athlete.attributes?.fuerza || 10}\\n\`;
      prompt += \`🧠 NEU: \${athlete.attributes?.NEU || athlete.attributes?.neuro || 10}\\n\`;
      prompt += \`🤸 AGI: \${athlete.attributes?.AGI || athlete.attributes?.ritmo || 10}\\n\`;
      prompt += \`🔥 ACT: \${athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10}\\n\\n\`;
      
      prompt += \`EVOLUCIÓN DE ATRIBUTOS\\n\`;`
);

// Find where it's replaced in Tarjeta:
const attributesPatternTarjeta = /technicalAttributes: {([\s\S]*?)},/g;
code = code.replace(
  attributesPatternTarjeta,
  `technicalAttributes: {
        TEC: cleanUndefined(athlete.attributes?.TEC || athlete.attributes?.tecnica || 10, 'visual'),
        FIS: cleanUndefined(athlete.attributes?.FIS || athlete.attributes?.fuerza || 10, 'visual'),
        NEU: cleanUndefined(athlete.attributes?.NEU || athlete.attributes?.neuro || 10, 'visual'),
        AGI: cleanUndefined(athlete.attributes?.AGI || athlete.attributes?.ritmo || 10, 'visual'),
        ACT: cleanUndefined(athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10, 'visual')
      },`
);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log('Fixed ReportesWLSportsScreen again');
