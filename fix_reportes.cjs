const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

// Fix the athlete details mappings
code = code.replace(
  /athlete: {\s+name: cleanUndefined\(athlete\.displayName, 'text'\),\s+age: cleanUndefined\(athlete\.age, 'text'\),\s+category: cleanUndefined\(athlete\.category, 'text'\),\s+position: cleanUndefined\(athlete\.position, 'text'\),\s+sport: cleanUndefined\(athlete\.sport \|\| athlete\.deporte, 'text'\),\s+profile: cleanUndefined\(athlete\.dominantSide \|\| athlete\.perfil, 'text'\),\s+},/g,
  `athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.profile?.age, 'text'),
        category: cleanUndefined(athlete.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.profile?.laterality, 'text'),
      },`
);

// Fix Mensual attributes
code = code.replace(
  /const attributes = athlete\.attributes \? {\s+TEC: cleanUndefined\(athlete\.attributes\.TEC, 'visual'\),\s+FIS: cleanUndefined\(athlete\.attributes\.FIS, 'visual'\),\s+NEU: cleanUndefined\(athlete\.attributes\.NEU, 'visual'\),\s+AGI: cleanUndefined\(athlete\.attributes\.AGI, 'visual'\),\s+ACT: cleanUndefined\(athlete\.attributes\.ACT, 'visual'\)\s+} : { TEC: '—', FIS: '—', NEU: '—', AGI: '—', ACT: '—' };/g,
  `const attributes = athlete.attributes ? {
      TEC: cleanUndefined(athlete.attributes.TEC || athlete.attributes.tecnica, 'visual'),
      FIS: cleanUndefined(athlete.attributes.FIS || athlete.attributes.fuerza, 'visual'),
      NEU: cleanUndefined(athlete.attributes.NEU || athlete.attributes.neuro, 'visual'),
      AGI: cleanUndefined(athlete.attributes.AGI || athlete.attributes.ritmo, 'visual'),
      ACT: cleanUndefined(athlete.attributes.ACT || athlete.attributes.mentalidad, 'visual')
    } : { TEC: '—', FIS: '—', NEU: '—', AGI: '—', ACT: '—' };`
);

// Fix Nivel attributeEvolution
code = code.replace(
  /attributeEvolution: {\s+TEC: athlete\.attributes\?\.TEC \? \`\$\{athlete\.attributes\.TEC\}\$\{\!isNaN\(Number\(athlete\.attributes\.TEC\)\) \? '%' : ''\}\` : '—',\s+FIS: athlete\.attributes\?\.FIS \? \`\$\{athlete\.attributes\.FIS\}\$\{\!isNaN\(Number\(athlete\.attributes\.FIS\)\) \? '%' : ''\}\` : '—',\s+NEU: athlete\.attributes\?\.NEU \? \`\$\{athlete\.attributes\.NEU\}\$\{\!isNaN\(Number\(athlete\.attributes\.NEU\)\) \? '%' : ''\}\` : '—',\s+AGI: athlete\.attributes\?\.AGI \? \`\$\{athlete\.attributes\.AGI\}\$\{\!isNaN\(Number\(athlete\.attributes\.AGI\)\) \? '%' : ''\}\` : '—',\s+ACT: athlete\.attributes\?\.ACT \? \`\$\{athlete\.attributes\.ACT\}\$\{\!isNaN\(Number\(athlete\.attributes\.ACT\)\) \? '%' : ''\}\` : '—'\s+},/g,
  `attributeEvolution: {
        TEC: (athlete.attributes?.TEC || athlete.attributes?.tecnica) ? \`\${athlete.attributes.TEC || athlete.attributes.tecnica}\${!isNaN(Number(athlete.attributes.TEC || athlete.attributes.tecnica)) ? '%' : ''}\` : '—',
        FIS: (athlete.attributes?.FIS || athlete.attributes?.fuerza) ? \`\${athlete.attributes.FIS || athlete.attributes.fuerza}\${!isNaN(Number(athlete.attributes.FIS || athlete.attributes.fuerza)) ? '%' : ''}\` : '—',
        NEU: (athlete.attributes?.NEU || athlete.attributes?.neuro) ? \`\${athlete.attributes.NEU || athlete.attributes.neuro}\${!isNaN(Number(athlete.attributes.NEU || athlete.attributes.neuro)) ? '%' : ''}\` : '—',
        AGI: (athlete.attributes?.AGI || athlete.attributes?.ritmo) ? \`\${athlete.attributes.AGI || athlete.attributes.ritmo}\${!isNaN(Number(athlete.attributes.AGI || athlete.attributes.ritmo)) ? '%' : ''}\` : '—',
        ACT: (athlete.attributes?.ACT || athlete.attributes?.mentalidad) ? \`\${athlete.attributes.ACT || athlete.attributes.mentalidad}\${!isNaN(Number(athlete.attributes.ACT || athlete.attributes.mentalidad)) ? '%' : ''}\` : '—'
      },`
);

// Fix Tarjeta technicalAttributes
code = code.replace(
  /technicalAttributes: {\s+TEC: cleanUndefined\(athlete\.attributes\?\.TEC, 'visual'\),\s+FIS: cleanUndefined\(athlete\.attributes\?\.FIS, 'visual'\),\s+NEU: cleanUndefined\(athlete\.attributes\?\.NEU, 'visual'\),\s+AGI: cleanUndefined\(athlete\.attributes\?\.AGI, 'visual'\),\s+ACT: cleanUndefined\(athlete\.attributes\?\.ACT, 'visual'\)\s+},/g,
  `technicalAttributes: {
        TEC: cleanUndefined(athlete.attributes?.TEC || athlete.attributes?.tecnica, 'visual'),
        FIS: cleanUndefined(athlete.attributes?.FIS || athlete.attributes?.fuerza, 'visual'),
        NEU: cleanUndefined(athlete.attributes?.NEU || athlete.attributes?.neuro, 'visual'),
        AGI: cleanUndefined(athlete.attributes?.AGI || athlete.attributes?.ritmo, 'visual'),
        ACT: cleanUndefined(athlete.attributes?.ACT || athlete.attributes?.mentalidad, 'visual')
      },`
);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log('Fixed ReportesWLSportsScreen completely');
