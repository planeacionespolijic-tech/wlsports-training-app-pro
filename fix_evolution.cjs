const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

code = code.replace(
  /attributeEvolution: {\s+TEC: [\s\S]*?ACT: [\s\S]*?'—'\s+},/g,
  `attributeEvolution: {
        TEC: (athlete.attributes?.TEC || athlete.attributes?.tecnica) ? \`\${athlete.attributes.TEC || athlete.attributes.tecnica}\${!isNaN(Number(athlete.attributes.TEC || athlete.attributes.tecnica)) ? '%' : ''}\` : '10%',
        FIS: (athlete.attributes?.FIS || athlete.attributes?.fuerza) ? \`\${athlete.attributes.FIS || athlete.attributes.fuerza}\${!isNaN(Number(athlete.attributes.FIS || athlete.attributes.fuerza)) ? '%' : ''}\` : '10%',
        NEU: (athlete.attributes?.NEU || athlete.attributes?.neuro) ? \`\${athlete.attributes.NEU || athlete.attributes.neuro}\${!isNaN(Number(athlete.attributes.NEU || athlete.attributes.neuro)) ? '%' : ''}\` : '10%',
        AGI: (athlete.attributes?.AGI || athlete.attributes?.ritmo) ? \`\${athlete.attributes.AGI || athlete.attributes.ritmo}\${!isNaN(Number(athlete.attributes.AGI || athlete.attributes.ritmo)) ? '%' : ''}\` : '10%',
        ACT: (athlete.attributes?.ACT || athlete.attributes?.mentalidad) ? \`\${athlete.attributes.ACT || athlete.attributes.mentalidad}\${!isNaN(Number(athlete.attributes.ACT || athlete.attributes.mentalidad)) ? '%' : ''}\` : '10%'
      },`
);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
