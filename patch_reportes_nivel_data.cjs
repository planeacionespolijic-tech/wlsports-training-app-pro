const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

code = code.replace(/import \{ getLevelFromXP \} from '\.\.\/constants';/, "import { getLevelFromXP, LEVELS } from '../constants';");

const targetData = `      previousLevel: "No registrado", 
      newLevel: selectedLevel,
      endingXP: cleanUndefined(athlete.xp, 'text'),
      stageDuration: hasStageStart && stageStart ? \`\${Math.max(1, Math.round((new Date().getTime() - stageStart.getTime()) / (1000 * 3600 * 24)))} días\` : 'No registrado',
      sessions: hasStageStart ? stageSessionsList.length : 'No registrado',
      compliance: hasStageStart ? stageCompliance : 'No registrado',
      xpEarned: hasStageStart ? stageXpEarned : 'No registrado',
      medals: hasStageStart ? stageMedalsList.length : 'No registrado',
      challengesCompleted: 'No registrado',`;

const newData = `      previousLevel: (() => {
        const idx = LEVELS.findIndex(l => l.name.toUpperCase() === selectedLevel.toUpperCase());
        return idx > 0 ? LEVELS[idx - 1].name : "Ninguno";
      })(), 
      newLevel: selectedLevel,
      unlockedDate: new Date().toLocaleDateString('es-ES'),
      endingXP: cleanUndefined(athlete.xp, 'text'),
      stageDuration: hasStageStart && stageStart ? \`\${Math.max(1, Math.round((new Date().getTime() - stageStart.getTime()) / (1000 * 3600 * 24)))} días\` : 'No registrado',
      sessions: hasStageStart ? stageSessionsList.length : 'No registrado',
      compliance: hasStageStart ? stageCompliance : 'No registrado',
      xpEarned: hasStageStart ? stageXpEarned : 'No registrado',
      medals: (athlete.medals || []).length > 0 ? (athlete.medals || []).length : 'No registrado',
      challengesCompleted: (athlete.challengesCompleted || []).length > 0 ? (athlete.challengesCompleted || []).length : 'No registrado',
      levelObjectiveGen: cleanUndefined(athlete.levelObjectiveGen, 'text'),
      levelObjectiveSpec: cleanUndefined(athlete.levelObjectiveSpec, 'text'),`;

code = code.replace(targetData, newData);
fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log('patched data');
