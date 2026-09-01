const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

code = code.replace(/        name: cleanUndefined\(athlete\.displayName, 'text'\),\n        age: cleanUndefined\(athlete\.age \|\| athlete\.initialEvaluation\?\.profile\?\.age \|\| athlete\.profile\?\.age, 'text'\),\n        category/g, 
  "        name: cleanUndefined(athlete.displayName, 'text'),\n" +
  "        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),\n" +
  "        nationality: cleanUndefined(athlete.nationality || athlete.initialEvaluation?.profile?.nationality || athlete.profile?.nationality, 'text'),\n" +
  "        category");

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log('patched nationality globally');
