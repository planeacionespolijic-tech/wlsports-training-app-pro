const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

code = code.replace(
  /attributes: {\s+TEC: cleanUndefined\(athlete\.attributes\?\.TEC, 'visual'\),\s+FIS: cleanUndefined\(athlete\.attributes\?\.FIS, 'visual'\),\s+NEU: cleanUndefined\(athlete\.attributes\?\.NEU, 'visual'\),\s+AGI: cleanUndefined\(athlete\.attributes\?\.AGI, 'visual'\),\s+ACT: cleanUndefined\(athlete\.attributes\?\.ACT, 'visual'\)\s+}/g,
  `attributes: {
        TEC: cleanUndefined(athlete.attributes?.TEC || athlete.attributes?.tecnica || 10, 'visual'),
        FIS: cleanUndefined(athlete.attributes?.FIS || athlete.attributes?.fuerza || 10, 'visual'),
        NEU: cleanUndefined(athlete.attributes?.NEU || athlete.attributes?.neuro || 10, 'visual'),
        AGI: cleanUndefined(athlete.attributes?.AGI || athlete.attributes?.ritmo || 10, 'visual'),
        ACT: cleanUndefined(athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10, 'visual')
      }`
);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
