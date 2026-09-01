const fs = require('fs');
let code = fs.readFileSync('src/screens/AthleteProfileScreen.tsx', 'utf8');

const target = `    try {
      // Usar XP guardada o en su defecto el maximo del nivel anterior
      const newXP = athlete.previousLevelXP !== undefined ? athlete.previousLevelXP : prevLevel.maxXP;
      await updateDoc(doc(db, 'users', athleteId), {
        xp: newXP
      });
      setAthlete({ ...athlete, xp: newXP });
      setFeedback({ message: \`¡\${athlete.displayName} ha regresado a \${prevLevel.name}!\`, type: 'success' });`;

const replace = `    try {
      // Set to the exact max XP of the previous level to guarantee demotion
      const newXP = prevLevel.maxXP;
      await updateDoc(doc(db, 'users', athleteId), {
        xp: newXP
      });
      setAthlete({ ...athlete, xp: newXP });
      setFeedback({ message: \`¡\${athlete.displayName} ha regresado a \${prevLevel.name}!\`, type: 'success' });`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  console.log('patched');
} else {
  console.log('not found');
}
fs.writeFileSync('src/screens/AthleteProfileScreen.tsx', code);
