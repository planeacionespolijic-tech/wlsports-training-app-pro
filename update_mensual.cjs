const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

// 1. Replace state declarations
code = code.replace(
  /const \[selectedMonth, setSelectedMonth\] = useState<string>\(''\); \/\/ YYYY-MM/,
  `const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');`
);

// 2. Replace UI inputs
const oldInput = `{activeFlow === 'mensual' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Mes a reportar (YYYY-MM)</label>
                  <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )}`;
              
const newInput = `{activeFlow === 'mensual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Desde (Fecha inicial)</label>
                    <input 
                      type="date" 
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-black border border-zinc-700 p-4 rounded-xl outline-none focus:border-[#D4AF37] [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Hasta (Fecha final)</label>
                    <input 
                      type="date" 
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-black border border-zinc-700 p-4 rounded-xl outline-none focus:border-[#D4AF37] [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}`;

code = code.replace(oldInput, newInput);

// 3. Replace handleGenerateMensual function completely
const handleGenMensualOldRegex = /const handleGenerateMensual = \(\) => {[\s\S]*?setStep\('preview'\);\n  };/m;

const handleGenMensualNew = `const handleGenerateMensual = () => {
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
      const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      return \`\${String(d.getDate()).padStart(2, '0')} \${monthNames[d.getMonth()]} \${d.getFullYear()}\`;
    };
    
    const periodLabel = \`\${formatShortDate(fromDate)} — \${formatShortDate(toDate)}\`;

    const monthSessions = sessions.filter(s => {
      const date = getRealDate(s);
      if (!date) return false;
      return date >= fromDate && date <= toDate;
    });

    const uniqueMonthSessions = monthSessions.filter((s, index, self) => 
      index === self.findIndex((t) => t.id === s.id)
    );

    const xpGained = uniqueMonthSessions.reduce((acc, s) => acc + (s.xpGained || 0), 0);
    
    const monthWorkouts = workouts.filter(w => {
       const date = getRealDate(w);
       if (!date) return false;
       return date >= fromDate && date <= toDate;
    });

    const uniqueMonthWorkouts = monthWorkouts.filter((w, index, self) => 
      index === self.findIndex((t) => t.id === w.id)
    );

    const scheduled = uniqueMonthWorkouts.length;
    
    const medals = athlete?.medals?.filter((m) => {
       const date = getRealDate(m);
       if (!date) return false;
       return date >= fromDate && date <= toDate;
    }) || [];

    const unifiedSessions = [];
    
    uniqueMonthSessions.forEach(s => {
      let d = getRealDate(s);
      unifiedSessions.push({
        id: s.id,
        dateObj: d,
        status: s.status,
        notes: s.notes || null,
        type: 'executed'
      });
    });

    uniqueMonthWorkouts.forEach(w => {
      let d = getRealDate(w);
      const hasExecuted = unifiedSessions.find(us => 
        us.type === 'executed' && us.dateObj && d && 
        us.dateObj.getDate() === d.getDate() && 
        us.dateObj.getMonth() === d.getMonth() && 
        us.dateObj.getFullYear() === d.getFullYear()
      );
      
      if (!hasExecuted) {
        unifiedSessions.push({
          id: w.id,
          dateObj: d,
          status: 'Programada',
          notes: null,
          type: 'scheduled'
        });
      }
    });

    unifiedSessions.sort((a, b) => {
      const timeA = a.dateObj ? a.dateObj.getTime() : 0;
      const timeB = b.dateObj ? b.dateObj.getTime() : 0;
      return timeA - timeB;
    });

    const formatSessionDate = (d) => {
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      return \`\${monthNames[d.getMonth()]} \${String(d.getDate()).padStart(2, '0')}\`;
    };

    const sessionsList = unifiedSessions.map(s => {
       const dateStr = s.dateObj ? formatSessionDate(s.dateObj) : null;
       return {
         date: dateStr,
         status: s.status || 'No registrado',
         notes: cleanUndefined(s.notes, 'text')
       };
    });

    const compliance = scheduled > 0 ? Math.round((uniqueMonthSessions.length / scheduled) * 100) : (uniqueMonthSessions.length > 0 ? 100 : 'No registrado');

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
    
    setGeneratedData(data);
    setStep('preview');
  };`;

code = code.replace(handleGenMensualOldRegex, handleGenMensualNew);

// 4. Update the actual prompt generation block
const promptMensualOldRegex = /if \(parsedData\.type === 'mensual'\) \{[\s\S]*?\} else if \(parsedData\.type === 'nivel'\)/m;

const promptMensualNew = `if (parsedData.type === 'mensual') {
      const messages = [
        "Cada sesión es una nueva oportunidad para crecer.",
        "Mantén la disciplina, disfruta el proceso y sigue dando un paso adelante.",
        "Confía en tu proceso, trabaja con constancia y disfruta cada entrenamiento.",
        "La constancia se construye paso a paso. Sigue trabajando con confianza.",
        "Sigue construyendo tu mejor versión, día a día."
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      prompt += \`==============================================\nPROMPT MAESTRO DEFINITIVO — INFORME MENSUAL WLSPORTS\n==============================================\n\n\`;
      
      prompt += \`Crea un INFORME MENSUAL WLSPORTS práctico, limpio, visual, profesional y estrictamente basado en los datos reales proporcionados a continuación.\n\n\`;
      
      prompt += \`============================================================\n1. REGLA ABSOLUTA — LOS DATOS SON LA ÚNICA FUENTE DE VERDAD\n============================================================\n\n\`;
      prompt += \`Los datos escritos en este prompt son la única fuente válida.\nPROHIBIDO:\n- inventar datos\n- completar datos faltantes\n- estimar\n- suponer\n- deducir\n- interpretar\n- crear estadísticas\n- crear porcentajes\n- crear resultados\n- crear logros\n- crear fortalezas\n- crear áreas de mejora\n- crear desafíos\n- crear evolución\n- inventar sesiones\n- inventar fechas\n- inventar novedades\n- inventar información deportiva\n\n\`;
      prompt += \`La IA puede ser creativa únicamente en el diseño visual, composición, tipografía, iluminación, fondos y presentación.\nLa IA NO puede ser creativa con los datos del atleta.\n\n\`;
      
      prompt += \`============================================================\n2. DATOS FALTANTES\n============================================================\n\n\`;
      prompt += \`Los valores "No registrado", "No registrada", "Pendiente de evaluación", "—" deben conservar su significado. Nunca convertirlos en 0, 0%, N/A, Bajo, Débil, Sin información, Desconocido, o cualquier otro valor inventado. Cuando un dato básico del atleta no exista, preferentemente omitir el campo.\n\n\`;

      prompt += \`INFORME MENSUAL WLSPORTS\n\`;
      prompt += \`PERÍODO: \${parsedData.period}\n\n\`;

      prompt += \`DATOS DEL ATLETA:\n\`;
      prompt += \`Nombre: \${parsedData.athlete.name}\n\`;
      if (parsedData.athlete.age && parsedData.athlete.age !== 'No registrado') prompt += \`Edad: \${parsedData.athlete.age}\n\`;
      if (parsedData.athlete.sport && parsedData.athlete.sport !== 'No registrado') prompt += \`Deporte: \${parsedData.athlete.sport}\n\`;
      if (parsedData.athlete.profile && parsedData.athlete.profile !== 'No registrado') prompt += \`Perfil: \${parsedData.athlete.profile}\n\`;
      if (parsedData.athlete.category && parsedData.athlete.category !== 'No registrado') prompt += \`Categoría: \${parsedData.athlete.category}\n\`;
      if (parsedData.athlete.position && parsedData.athlete.position !== 'No registrado') prompt += \`Posición: \${parsedData.athlete.position}\n\`;
      prompt += \`\nNIVEL ACTUAL\n\${parsedData.currentLevel}\n\n\`;
      prompt += \`XP ACUMULADO\n\${parsedData.currentXP} XP\n\n\`;

      prompt += \`DATOS DEL PERÍODO (Exclusivo de las fechas mostradas):\n\`;
      if (parsedData.xpGained !== 'No registrado' && parsedData.xpGained !== undefined && parsedData.xpGained > 0) {
        prompt += \`XP GANADA EN EL PERÍODO: \${parsedData.xpGained} XP\n\`;
      }
      if (parsedData.compliance !== 'No registrado') {
        prompt += \`CUMPLIMIENTO: \${parsedData.compliance}%\n\`;
      }
      if (parsedData.medals !== 'No registradas' && parsedData.medals > 0) {
        prompt += \`MEDALLAS DEL PERÍODO: \${parsedData.medals}\n\`;
      }
      prompt += \`\n\`;

      prompt += \`SESIONES DEL PERÍODO\n\`;
      if (parsedData.sessions && parsedData.sessions.length > 0) {
        parsedData.sessions.forEach((s, idx) => {
          prompt += \`Clase \${idx + 1} — \${s.date}\n\`;
          if (s.notes && s.notes !== 'No registrado') {
            prompt += \`Novedad: \${s.notes}\n\`;
          }
        });
      } else {
        prompt += \`No registrado\n\`;
      }
      prompt += \`\n\`;
      
      prompt += \`FICHA TÉCNICA\n\`;
      prompt += \`TEC — \${parsedData.technicalAttributes.TEC}\n\`;
      prompt += \`FIS — \${parsedData.technicalAttributes.FIS}\n\`;
      prompt += \`NEU — \${parsedData.technicalAttributes.NEU}\n\`;
      prompt += \`AGI — \${parsedData.technicalAttributes.AGI}\n\`;
      prompt += \`ACT — \${parsedData.technicalAttributes.ACT}\n\n\`;
      
      prompt += \`============================================================\n3. FICHA TÉCNICA Y REPRESENTACIÓN\n============================================================\n\n\`;
      prompt += \`Si el atributo es "—", mostrar "—". No convertirlo en TEC 0 o TEC 0%. Si solamente existe un valor actual de cada atributo, mostrar únicamente ese valor. No crear valores iniciales, finales, evolución, flechas de progreso ni comparación. Representar exactamente el valor si es numérico (usando barras, radar o número limpio).\n\n\`;

      prompt += \`============================================================\n4. ELEMENTOS PROHIBIDOS\n============================================================\n\n\`;
      prompt += \`Eliminar fortalezas, áreas de mejora, desafíos, logros acumulados, evolución histórica, nivel anterior, trayectoria completa, análisis profundo del rendimiento, proyección de crecimiento o comparación histórica. Esto NO es un informe de nivel ni una tarjeta coleccionable.\n\n\`;

      prompt += \`MENSAJE DEL COACH\n\`;
      prompt += \`"\${randomMessage}"\n\n\`;
      
      prompt += \`============================================================\n5. DISEÑO VISUAL WLSPORTS\n============================================================\n\n\`;
      prompt += \`PALETA: Negro, Grafito, Dorado metálico, Verde neón, Blanco.\nESTÉTICA: Deportiva, Premium, Moderna, Editorial, Juvenil, Profesional, Tecnológica, Alto contraste. Mostrar la fotografía real proporcionada sin alterar la identidad del atleta. Si hay poca información, dar protagonismo a la foto y mantener espacios negativos elegantes. No rellenar con estadísticas inventadas. El informe debe verse limpio y estructurado.\n\`;

    } else if (parsedData.type === 'nivel')`;

code = code.replace(promptMensualOldRegex, promptMensualNew);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log("Updated ReportesWLSportsScreen.tsx successfully");
