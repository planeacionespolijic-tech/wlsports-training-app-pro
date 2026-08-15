const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const oldLogic = `    // 6. Calculate metrics
    const xpGained = periodUnified.reduce((acc, s) => acc + s.xpGained, 0);
    const monthWorkouts = uniqueAllWorkouts.filter(w => {
      const d = getRealDate(w);
      return d && d >= fromDate && d <= toDate;
    });
    const scheduled = monthWorkouts.length;
    const executedSessions = periodUnified.filter(u => u.type === 'executed').length;`;

const newLogic = `    // 6. Calculate metrics
    const xpGained = periodUnified.reduce((acc, s) => acc + s.xpGained, 0);
    const scheduled = periodUnified.length; // Contains all uncompleted (workouts) + completed/missed (sessions)
    const executedSessions = periodUnified.filter(u => u.status === 'Realizada').length;`;

if(code.includes(oldLogic)) {
  code = code.replace(oldLogic, newLogic);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log("Fixed report logic");
} else {
  console.log("oldLogic not found");
}
