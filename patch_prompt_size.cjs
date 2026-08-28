const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const targetPrompt = `      prompt += \`============================================================\\n1. ESTRUCTURA VISUAL (ESTILO EA SPORTS / FIFA ULTIMATE TEAM)\\n============================================================\\n\\n\`;
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
      prompt += \`RATING GENERAL (OVR): \${parsedData.overallRating} (mostrar solo si no es "—")\\n\\n\`;
      
      prompt += \`PERFIL / LATERALIDAD ORIGINAL: \${parsedData.athlete.profile}\\n\`;
      prompt += \`INSTRUCCIÓN ESPECIAL PARA EL PERFIL:\\n\`;
      prompt += \`- Identifica si el atleta es hombre o mujer basándote en su nombre o en su fotografía.\\n\`;
      prompt += \`- Escribe correctamente el perfil adaptándolo al género detectado (ej: "Derecho" o "Derecha", "Izquierdo" o "Izquierda", "Diestro" o "Diestra", "Ambidiestro" o "Ambidiestra").\\n\\n\`;`;

const replacePrompt = `      prompt += \`============================================================\\n1. ESTRUCTURA VISUAL (ESTILO EA SPORTS / FIFA ULTIMATE TEAM)\\n============================================================\\n\\n\`;
      prompt += \`DISEÑO OBLIGATORIO:\\n\`;
      prompt += \`- FOTOGRAFÍA: Centrada y prominente. Estilo recorte (sin fondo, tipo EA SPORTS / FIFA). El atleta es el absoluto héroe visual de la tarjeta.\\n\`;
      prompt += \`- LOGO WLSPORTS: Debe incluirse en un tamaño pequeño y discreto (ej. esquina superior) para NO quitarle ningún protagonismo a la foto del atleta.\\n\`;
      prompt += \`- XP ACTUAL: Colocar en tamaño sutil y complementario debajo del logo WLSPORTS, sin opacar a la imagen central.\\n\`;
      prompt += \`- BANDERA DE NACIONALIDAD: Integrar como un detalle elegante y en tamaño reducido, como apoyo visual sin exagerar su tamaño.\\n\`;
      prompt += \`- NOMBRE DEL ATLETA: Ubicado aproximadamente en la zona central, en una única línea, con tipografía fuerte y destacada.\\n\`;
      prompt += \`- ESCALA DE MAESTRÍA (ASCENSO): Justo debajo del nombre, resaltar de manera destacada e iluminada el logro del ascenso. Texto a incluir: "ASCENSO: \${parsedData.previousLevel} ➔ \${parsedData.currentLevel}".\\n\`;
      prompt += \`- ATRIBUTOS: Ubicados en la zona inferior de la tarjeta, organizados visualmente (ej. en columnas o cuadrícula tipo Ultimate Team).\\n\`;
      prompt += \`- DATOS DEL DEPORTISTA: En texto decididamente más pequeño (Edad, Deporte, Perfil y Posición) ubicados estratégicamente como información secundaria.\\n\\n\`;

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
      prompt += \`RATING GENERAL (OVR): \${parsedData.overallRating} (mostrar solo si no es "—")\\n\\n\`;
      
      prompt += \`PERFIL / LATERALIDAD ORIGINAL: \${parsedData.athlete.profile}\\n\`;
      prompt += \`OBLIGATORIO CORREGIR LA GRAMÁTICA DEL PERFIL:\\n\`;
      prompt += \`- Identifica si el atleta es hombre o mujer basándote OBLIGATORIAMENTE en su nombre o su fotografía.\\n\`;
      prompt += \`- DEBES escribir el perfil con el género gramatical correcto para ese atleta. Por ejemplo: si el texto dice "Derecho" y el atleta es mujer, ES OBLIGATORIO cambiarlo a "Derecha". Si dice "Izquierdo" y es mujer, a "Izquierda". No dejes errores de género gramatical.\\n\\n\`;`;

if (code.includes(targetPrompt)) {
  code = code.replace(targetPrompt, replacePrompt);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log('patched prompt scale and grammar successfully');
} else {
  console.log('could not find prompt target');
}
