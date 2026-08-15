const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

// Find the start of handleGenerateMensual
const startIdx = code.indexOf('const handleGenerateMensual = () => {');
if (startIdx === -1) {
  console.error("handleGenerateMensual not found");
  process.exit(1);
}

// Find the end of handleGenerateMensual (we look for setStep('review');\n  };)
const endStr = "setStep('review');\n  };";
const endIdx = code.indexOf(endStr, startIdx);
if (endIdx === -1) {
  console.error("End of handleGenerateMensual not found");
  process.exit(1);
}

const oldFunc = code.substring(startIdx, endIdx + endStr.length);

const newFunc = `const handleGenerateMensual = () => {
    if (!dateFrom || !dateTo) {
      alert("Debes seleccionar una fecha de inicio (DESDE) y una fecha de fin (HASTA).");
      return;
    }
    const fromDate = new Date(\`\${dateFrom}T00:00:00\`);
    const toDate = new Date(\`\${dateTo}T23:59:59\`);
    
    if (fromDate > toDate) {
      alert("La fecha DESDE no puede ser posterior a la fecha HASTA.");
      return;
    }

    const formatShortDate = (d) => {
      if (!d) return '';
      const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      return \`\${String(d.getDate()).padStart(2, '0')} \${monthNames[d.getMonth()]} \${d.getFullYear()}\`;
    };
    
    const periodLabel = \`\${formatShortDate(fromDate)} — \${formatShortDate(toDate)}\`;

    // 1. Gather all unique historical sessions and workouts
    const uniqueAllSessions = sessions.filter((s, index, self) => 
      index === self.findIndex((t) => t.id === s.id)
    );
    const uniqueAllWorkouts = workouts.filter((w, index, self) => 
      index === self.findIndex((t) => t.id === w.id)
    );

    // 2. Unify them globally to assign global session numbers chronologically
    const allUnified = [];
    uniqueAllSessions.forEach(s => {
      let d = getRealDate(s);
      if (d) {
        allUnified.push({
          id: s.id,
          dateObj: d,
          status: s.status === 'No realizada' ? 'No realizada' : 'Realizada',
          notes: s.notes || null,
          type: 'executed',
          xpGained: s.xpGained || 0
        });
      }
    });

    uniqueAllWorkouts.forEach(w => {
      let d = getRealDate(w);
      if (d) {
        const hasExecuted = allUnified.find(us => 
          us.type === 'executed' && 
          us.dateObj.getDate() === d.getDate() && 
          us.dateObj.getMonth() === d.getMonth() && 
          us.dateObj.getFullYear() === d.getFullYear()
        );
        if (!hasExecuted) {
          allUnified.push({
            id: w.id,
            dateObj: d,
            status: 'Programada',
            notes: null,
            type: 'scheduled',
            xpGained: 0
          });
        }
      }
    });

    // 3. Sort globally chronologically (oldest first)
    allUnified.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // 4. Assign global numbers (only to actual performed sessions if desired, but we can assign to all to be safe, or just performed? User said "enumera los numeros de sesiones automaticamente desde 1 la más antigua". Usually means the executed ones or both. Let's do it for all items in unified.)
    let globalCounter = 1;
    allUnified.forEach((item) => {
      item.globalIndex = globalCounter++;
    });

    // 5. Filter for the selected period
    const periodUnified = allUnified.filter(u => u.dateObj >= fromDate && u.dateObj <= toDate);

    // We maintain chronological order for the report output (oldest first)
    periodUnified.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // 6. Calculate metrics
    const xpGained = periodUnified.reduce((acc, s) => acc + s.xpGained, 0);
    const monthWorkouts = uniqueAllWorkouts.filter(w => {
      const d = getRealDate(w);
      return d && d >= fromDate && d <= toDate;
    });
    const scheduled = monthWorkouts.length;
    const executedSessions = periodUnified.filter(u => u.type === 'executed').length;
    
    const medals = athlete?.medals?.filter((m) => {
       const date = getRealDate(m);
       if (!date) return false;
       return date >= fromDate && date <= toDate;
    }) || [];

    const formatSessionDate = (d) => {
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      return \`\${monthNames[d.getMonth()]} \${String(d.getDate()).padStart(2, '0')}\`;
    };

    const sessionsList = periodUnified.map(s => {
       const dateStr = s.dateObj ? formatSessionDate(s.dateObj) : null;
       let statusStr = '';
       if (s.status === 'Realizada') statusStr = '✓ Realizada';
       else if (s.status === 'No realizada') statusStr = '✕ No realizada';
       else if (s.status === 'Programada') statusStr = '○ Programada';
       else statusStr = '— Estado no registrado';
       
       return {
         date: dateStr,
         status: statusStr,
         notes: cleanUndefined(s.notes, 'text'),
         globalIndex: s.globalIndex
       };
    });

    const compliance = scheduled > 0 ? Math.round((executedSessions / scheduled) * 100) : (executedSessions > 0 ? 100 : 'No registrado');

    const attributes = {
      TEC: cleanUndefined(athlete.attributes?.TEC || athlete.attributes?.tecnica || 10, 'visual'),
      FIS: cleanUndefined(athlete.attributes?.FIS || athlete.attributes?.fuerza || 10, 'visual'),
      NEU: cleanUndefined(athlete.attributes?.NEU || athlete.attributes?.neuro || 10, 'visual'),
      AGI: cleanUndefined(athlete.attributes?.AGI || athlete.attributes?.ritmo || 10, 'visual'),
      ACT: cleanUndefined(athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10, 'visual')
    };

    const data = {
      title: \`Reporte del Periodo\`,
      type: 'mensual',
      athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },
      period: periodLabel,
      currentLevel: cleanUndefined(getLevelFromXP(athlete.xp || 0).name, 'text'),
      currentXP: cleanUndefined(athlete.xp || 0, 'text'),
      xpGained: xpGained,
      compliance: compliance,
      medals: medals.length,
      sessions: sessionsList.length > 0 ? sessionsList : null,
      technicalAttributes: attributes
    };
    
    setReviewData(data);
    setReviewText(JSON.stringify(data, null, 2));
    setStep('review');
  };`;

code = code.replace(oldFunc, newFunc);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log("Replaced handleGenerateMensual successfully");
