const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

// 1. Add previousLevel to handleGenerateTarjeta and remove wlSportsId

const handleGenerateTarjetaTarget = `  const handleGenerateTarjeta = () => {
    const data = {
      title: \`Tarjeta WLSPORTS - \${athlete.displayName || 'Atleta'}\`,
      type: 'tarjeta',
      athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },
      currentLevel: cleanUndefined(getLevelFromXP(athlete.xp || 0).name, 'text'),
      currentXP: cleanUndefined(athlete.xp || 0, 'text'),
      overallRating: cleanUndefined(athlete.ovr, 'visual'),
      wlSportsId: athlete.id ? \`WLS-\${athlete.id.substring(0,6).toUpperCase()}\` : 'No registrado',`;

const handleGenerateTarjetaReplace = `  const handleGenerateTarjeta = () => {
    const currentLevelName = getLevelFromXP(athlete.xp || 0).name;
    const currentLevelIdx = LEVELS.findIndex(l => l.name.toUpperCase() === currentLevelName.toUpperCase());
    const previousLevelName = currentLevelIdx > 0 ? LEVELS[currentLevelIdx - 1].name : "Ninguno";

    const data = {
      title: \`Tarjeta WLSPORTS - \${athlete.displayName || 'Atleta'}\`,
      type: 'tarjeta',
      athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },
      currentLevel: cleanUndefined(currentLevelName, 'text'),
      previousLevel: cleanUndefined(previousLevelName, 'text'),
      currentXP: cleanUndefined(athlete.xp || 0, 'text'),
      overallRating: cleanUndefined(athlete.ovr, 'visual'),`;

if (code.includes(handleGenerateTarjetaTarget)) {
  code = code.replace(handleGenerateTarjetaTarget, handleGenerateTarjetaReplace);
  console.log('Patched handleGenerateTarjeta');
} else {
  console.log('Failed to patch handleGenerateTarjeta');
}

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
