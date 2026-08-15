const fs = require('fs');
let code = fs.readFileSync('src/screens/HistoryScreen.tsx', 'utf8');

code = code.replace(
`        return { 
          id: doc.id, 
          collection: 'sessions', 
          workoutName: d.workoutName || 'Sesión',
          date: dateStr,
          status: d.status,
          notes: d.notes,
          xpGained: d.xpGained,
          createdAt: d.createdAt,
          ...d 
        };`,
`        return { 
          id: doc.id, 
          collection: 'sessions', 
          workoutName: d.workoutName || 'Sesión',
          status: d.status,
          notes: d.notes,
          xpGained: d.xpGained,
          createdAt: d.createdAt,
          ...d,
          date: dateStr
        };`
);

fs.writeFileSync('src/screens/HistoryScreen.tsx', code);
console.log("Fixed spread order in HistoryScreen");
