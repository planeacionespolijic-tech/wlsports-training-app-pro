const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const targetPrompt = `      prompt += \`============================================================\\n1. ESTRUCTURA VISUAL (ESTILO EA SPORTS / FIFA ULTIMATE TEAM)\\n============================================================\\n\\n\`;
      prompt += \`DISEÑO OBLIGATORIO:\\n\`;
      prompt += \`- FOTOGRAFÍA: Centrada y prominente. Estilo recorte (sin fondo, tipo EA SPORTS / FIFA). El atleta es el héroe visual.\\n\`;
      prompt += \`- LOGO WLSPORTS: Debe incluirse en un tamaño pequeño en algún lugar de la tarjeta (por ejemplo, esquina superior).\\n\`;
      prompt += \`- NOMBRE DEL ATLETA: Ubicado aproximadamente en la zona central, en una única línea, con tipografía fuerte y destacada.\\n\`;
      prompt += \`- ESCALA DE MAESTRÍA (ASCENSO): Justo debajo del nombre, en otra línea, mostrar el ascenso: \${parsedData.previousLevel} ➔ \${parsedData.currentLevel}.\\n\`;
      prompt += \`- ATRIBUTOS: Ubicados en la zona inferior de la tarjeta, organizados visualmente (ej. en columnas o cuadrícula tipo Ultimate Team).\\n\`;
      prompt += \`- DATOS DEL DEPORTISTA: En texto más pequeño (Edad, Deporte, Perfil y Posición) ubicados estratégicamente para no quitar protagonismo al nombre o los atributos.\\n\\n\`;

      prompt += \`============================================================\\n2. REGLAS ESTRICTAS DE CONTENIDO\\n============================================================\\n\\n\`;
      prompt += \`PROHIBIDO INCLUIR:\\n\`;
      prompt += \`- NO incluir códigos ID (como WLSPORTS ID).\\n\`;
      prompt += \`- NO incluir ningún tipo de mensaje motivacional.\\n\`;
      prompt += \`- NO incluir mensajes del coach.\\n\`;
      prompt += \`- NO inventar estadísticas, porcentajes, atributos o cualquier otro dato.\\n\\n\`;

      prompt += \`============================================================\\n3. DATOS DEL ATLETA A INCLUIR\\n============================================================\\n\\n\`;
      prompt += \`NOMBRE: \${parsedData.athlete.name}\\n\`;
      prompt += \`EDAD: \${parsedData.athlete.age}\\n\`;
      prompt += \`DEPORTE: \${parsedData.athlete.sport}\\n\`;
      prompt += \`CATEGORÍA: \${parsedData.athlete.category}\\n\`;
      prompt += \`POSICIÓN: \${parsedData.athlete.position}\\n\`;
      prompt += \`RATING GENERAL (OVR): \${parsedData.overallRating} (mostrar solo si no es "—")\\n\\n\`;`;

const replacePrompt = `      prompt += \`============================================================\\n1. ESTRUCTURA VISUAL (ESTILO EA SPORTS / FIFA ULTIMATE TEAM)\\n============================================================\\n\\n\`;
      prompt += \`DISEÑO OBLIGATORIO:\\n\`;
      prompt += \`- FOTOGRAFÍA: Centrada y prominente. Estilo recorte (sin fondo, tipo EA SPORTS / FIFA). El atleta es el héroe visual.\\n\`;
      prompt += \`- LOGO WLSPORTS: Debe incluirse en un tamaño pequeño en algún lugar de la tarjeta (por ejemplo, esquina superior).\\n\`;
      prompt += \`- XP ACTUAL: Debe colocarse visualmente justo debajo del logo de WLSPORTS, mostrando claramente el valor de XP ACTUAL.\\n\`;
      prompt += \`- BANDERA DE NACIONALIDAD: Colocar la bandera de nacionalidad del atleta de forma estética, integrándola en el diseño visual de la tarjeta.\\n\`;
      prompt += \`- NOMBRE DEL ATLETA: Ubicado aproximadamente en la zona central, en una única línea, con tipografía fuerte y destacada.\\n\`;
      prompt += \`- ESCALA DE MAESTRÍA (ASCENSO): Justo debajo del nombre, en otra línea, mostrar el ascenso: \${parsedData.previousLevel} ➔ \${parsedData.currentLevel}.\\n\`;
      prompt += \`- ATRIBUTOS: Ubicados en la zona inferior de la tarjeta, organizados visualmente (ej. en columnas o cuadrícula tipo Ultimate Team).\\n\`;
      prompt += \`- DATOS DEL DEPORTISTA: En texto más pequeño (Edad, Deporte, Perfil y Posición) ubicados estratégicamente para no quitar protagonismo al nombre o los atributos.\\n\\n\`;

      prompt += \`============================================================\\n2. REGLAS ESTRICTAS DE CONTENIDO\\n============================================================\\n\\n\`;
      prompt += \`PROHIBIDO INCLUIR:\\n\`;
      prompt += \`- NO incluir códigos ID (como WLSPORTS ID).\\n\`;
      prompt += \`- NO incluir ningún tipo de mensaje motivacional.\\n\`;
      prompt += \`- NO incluir mensajes del coach.\\n\`;
      prompt += \`- NO inventar estadísticas, porcentajes, atributos o cualquier otro dato.\\n\\n\`;

      prompt += \`============================================================\\n3. DATOS DEL ATLETA A INCLUIR\\n============================================================\\n\\n\`;
      prompt += \`NOMBRE: \${parsedData.athlete.name}\\n\`;
      prompt += \`EDAD: \${parsedData.athlete.age}\\n\`;
      prompt += \`NACIONALIDAD: \${parsedData.athlete.nationality}\\n\`;
      prompt += \`DEPORTE: \${parsedData.athlete.sport}\\n\`;
      prompt += \`CATEGORÍA: \${parsedData.athlete.category}\\n\`;
      prompt += \`POSICIÓN: \${parsedData.athlete.position}\\n\`;
      prompt += \`XP ACTUAL: \${parsedData.currentXP}\\n\`;
      prompt += \`RATING GENERAL (OVR): \${parsedData.overallRating} (mostrar solo si no es "—")\\n\\n\`;`;

if (code.includes(targetPrompt)) {
  code = code.replace(targetPrompt, replacePrompt);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log('patched prompt correctly');
} else {
  console.log('could not find prompt target');
}
