const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const target1 = `      prompt += \`- LOGO WLSPORTS: Debe incluirse en un tamaño pequeño y discreto (ej. esquina superior) para NO quitarle ningún protagonismo a la foto del atleta.\\n\`;
      prompt += \`- XP ACTUAL: Colocar en tamaño sutil y complementario debajo del logo WLSPORTS, sin opacar a la imagen central.\\n\`;
      prompt += \`- BANDERA DE NACIONALIDAD: Integrar como un detalle elegante y en tamaño reducido, como apoyo visual sin exagerar su tamaño.\\n\`;`;

const replace1 = `      prompt += \`- LOGO, XP y BANDERA: Deben estar perfectamente ALINEADOS entre sí (ej. en una columna en la esquina superior). El Logo WLSports debe ser pequeño; justo debajo el XP ACTUAL en tamaño sutil, y debajo la BANDERA de nacionalidad correspondiente a "\${parsedData.athlete.nationality}".\\n\`;`;

const target2 = `      prompt += \`NACIONALIDAD: \${parsedData.athlete.nationality}\\n\`;`;

const replace2 = `      prompt += \`MUY IMPORTANTE: NO incluyas el texto de la nacionalidad escrita (omite la palabra "\${parsedData.athlete.nationality}"). Solo debes poner el icono/gráfico de su bandera alineada con el Logo y el XP.\\n\`;`;

const target3 = `      prompt += \`PERFIL / LATERALIDAD ORIGINAL: \${parsedData.athlete.profile}\\n\`;
      prompt += \`OBLIGATORIO CORREGIR LA GRAMÁTICA DEL PERFIL:\\n\`;
      prompt += \`- Identifica si el atleta es hombre o mujer basándote OBLIGATORIAMENTE en su nombre o su fotografía.\\n\`;
      prompt += \`- DEBES escribir el perfil con el género gramatical correcto para ese atleta. Por ejemplo: si el texto dice "Derecho" y el atleta es mujer, ES OBLIGATORIO cambiarlo a "Derecha". Si dice "Izquierdo" y es mujer, a "Izquierda". No dejes errores de género gramatical.\\n\\n\`;`;

const replace3 = `      prompt += \`PERFIL / LATERALIDAD ORIGINAL: \${parsedData.athlete.profile}\\n\`;
      prompt += \`REGLA DE ORO GRAMATICAL PARA EL PERFIL:\\n\`;
      prompt += \`- Analiza el nombre y la foto. Si el atleta es HOMBRE, el perfil DEBE SER OBLIGATORIAMENTE MASCULINO (escribe: "Derecho", "Izquierdo", o "Diestro"). Si el atleta es MUJER, DEBE SER FEMENINO (escribe: "Derecha", "Izquierda", o "Diestra").\\n\`;
      prompt += \`- ES UN ERROR GRAVE poner "Izquierda" o "Derecha" en la tarjeta de un hombre. DEBES corregirlo a "Izquierdo" o "Derecho". Revisa esto antes de generar.\\n\\n\`;`;

if (code.includes(target1) && code.includes(target2) && code.includes(target3)) {
  code = code.replace(target1, replace1);
  code = code.replace(target2, replace2);
  code = code.replace(target3, replace3);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log('patched successfully');
} else {
  console.log('could not find one or more targets');
  if (!code.includes(target1)) console.log('target1 missing');
  if (!code.includes(target2)) console.log('target2 missing');
  if (!code.includes(target3)) console.log('target3 missing');
}
