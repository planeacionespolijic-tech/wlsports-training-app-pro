const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const target1 = `      prompt += \`MUY IMPORTANTE: NO incluyas el texto de la nacionalidad escrita (omite la palabra "\${parsedData.athlete.nationality}"). Solo debes poner el icono/gráfico de su bandera alineada con el Logo y el XP.\\n\`;`;
const replace1 = `      prompt += \`BANDERA (SIN TEXTO): Muestra SOLO el gráfico/emoji de la bandera de \${parsedData.athlete.nationality} (omite por completo escribir el nombre del país).\\n\`;`;

const target2 = `      prompt += \`PERFIL / LATERALIDAD ORIGINAL: \${parsedData.athlete.profile}\\n\`;
      prompt += \`REGLA DE ORO GRAMATICAL PARA EL PERFIL:\\n\`;
      prompt += \`- Analiza el nombre y la foto. Si el atleta es HOMBRE, el perfil DEBE SER OBLIGATORIAMENTE MASCULINO (escribe: "Derecho", "Izquierdo", o "Diestro"). Si el atleta es MUJER, DEBE SER FEMENINO (escribe: "Derecha", "Izquierda", o "Diestra").\\n\`;
      prompt += \`- ES UN ERROR GRAVE poner "Izquierda" o "Derecha" en la tarjeta de un hombre. DEBES corregirlo a "Izquierdo" o "Derecho". Revisa esto antes de generar.\\n\\n\`;`;

const replace2 = `      
      let perfilNeutral = parsedData.athlete.profile;
      if (perfilNeutral?.toLowerCase() === 'derecha' || perfilNeutral?.toLowerCase() === 'derecho') {
        perfilNeutral = 'Derecho(a) / Diestro(a)';
      } else if (perfilNeutral?.toLowerCase() === 'izquierda' || perfilNeutral?.toLowerCase() === 'izquierdo') {
        perfilNeutral = 'Izquierdo(a) / Zurdo(a)';
      } else if (perfilNeutral?.toLowerCase() === 'mixta' || perfilNeutral?.toLowerCase() === 'mixto' || perfilNeutral?.toLowerCase() === 'ambidiestro') {
        perfilNeutral = 'Ambidiestro(a)';
      }

      prompt += \`PERFIL / LATERALIDAD: \${perfilNeutral}\\n\`;
      prompt += \`- INSTRUCCIÓN: Adapta el término gramatical al género del atleta (ej: usa "Zurdo", "Izquierdo" o "Derecho" si es hombre; "Zurda", "Izquierda" o "Derecha" si es mujer).\\n\\n\`;`;

if (code.includes(target1) && code.includes(target2)) {
  code = code.replace(target1, replace1);
  code = code.replace(target2, replace2);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log('patched prompt final adjustments');
} else {
  console.log('could not find targets');
  if(!code.includes(target1)) console.log('target1 missing');
  if(!code.includes(target2)) console.log('target2 missing');
}
