const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const oldMemo = `  const groupedWorkouts = useMemo<Record<string, any[]>>(() => {
    const sorted = [...workouts].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // Newest first
    });

    const groups: Record<string, any[]> = {};
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    sorted.forEach(workout => {
      const dateStr = workout.date || (workout.createdAt?.toDate ? workout.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const date = new Date(dateStr);
      const key = \`\${monthNames[date.getUTCMonth()]} \${date.getUTCFullYear()}\`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(workout);
    });

    return groups;
  }, [workouts]);`;

const newMemo = `  const groupedWorkouts = useMemo<Record<string, any[]>>(() => {
    // 1. Order oldest to newest to assign chronological numbers
    const ascendingSorted = [...workouts].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB; // Oldest first
    });

    // 2. Assign computed session numbers
    ascendingSorted.forEach((w, idx) => {
      w.computedSessionNumber = idx + 1;
    });

    // 3. Sort newest to oldest for display
    const sorted = [...ascendingSorted].reverse();

    const groups: Record<string, any[]> = {};
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    sorted.forEach(workout => {
      const dateStr = workout.date || (workout.createdAt?.toDate ? workout.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      // Avoid timezone shifting by appending T12:00:00 if it's a raw YYYY-MM-DD string
      const dateObj = new Date(dateStr.includes('T') ? dateStr : \`\${dateStr}T12:00:00\`);
      const key = \`\${monthNames[dateObj.getMonth()]} \${dateObj.getFullYear()}\`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(workout);
    });

    return groups;
  }, [workouts]);`;

if (code.includes(oldMemo)) {
  code = code.replace(oldMemo, newMemo);
  
  // also replace item.sessionNumber display
  code = code.replace('{item.sessionNumber ? `#${item.sessionNumber}` : \'-\'}', '{item.computedSessionNumber ? `#${item.computedSessionNumber}` : \'-\'}');
  
  fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
  console.log("Updated WorkoutsScreen successfully");
} else {
  console.log("Could not find oldMemo exactly");
}
