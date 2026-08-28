const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const startTarget = `} else if (parsedData.type === 'tarjeta') {`;
const endTarget = `    }

        if (parsedData.type !== 'tarjeta') {`;

const startIndex = code.indexOf(startTarget);
const endIndex = code.indexOf(endTarget);

if (startIndex !== -1 && endIndex !== -1) {
  const newTarjetaBlock = `} else if (parsedData.type === 'tarjeta') {
      prompt += \`==============================================\\nPROMPT MAESTRO DEFINITIVO — TARJETA DEPORTIVA WLSPORTS\\n==============================================\\n\\n\`;
      prompt += \`Crea una TARJETA DEPORTIVA COLECCIONABLE PREMIUM WLSPORTS utilizando EXCLUSIVAMENTE los datos proporcionados por el sistema y los archivos reales proporcionados por el usuario.\\n\\n\`;
      
      prompt += \`============================================================\\n1. ESTRUCTURA VISUAL (ESTILO EA SPORTS / FIFA ULTIMATE TEAM)\\n============================================================\\n\\n\`;
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
      prompt += \`RATING GENERAL (OVR): \${parsedData.overallRating} (mostrar solo si no es "—")\\n\\n\`;
      
      prompt += \`PERFIL / LATERALIDAD ORIGINAL: \${parsedData.athlete.profile}\\n\`;
      prompt += \`INSTRUCCIÓN ESPECIAL PARA EL PERFIL:\\n\`;
      prompt += \`- Identifica si el atleta es hombre o mujer basándote en su nombre o en su fotografía.\\n\`;
      prompt += \`- Escribe correctamente el perfil adaptándolo al género detectado (ej: "Derecho" o "Derecha", "Izquierdo" o "Izquierda", "Diestro" o "Diestra", "Ambidiestro" o "Ambidiestra").\\n\\n\`;

      prompt += \`============================================================\\n4. ATRIBUTOS (ZONA INFERIOR)\\n============================================================\\n\\n\`;
      prompt += \`⚽ TEC (Técnica): \${parsedData.attributes.TEC}\\n\`;
      prompt += \`💪 FIS (Físico): \${parsedData.attributes.FIS}\\n\`;
      prompt += \`🧠 NEU (Neurocognitivo): \${parsedData.attributes.NEU}\\n\`;
      prompt += \`🤸 AGI (Agilidad): \${parsedData.attributes.AGI}\\n\`;
      prompt += \`🔥 ACT (Actitud): \${parsedData.attributes.ACT}\\n\\n\`;
      prompt += \`SI EL ATRIBUTO ES "—": omitir visualmente o mostrar de manera neutra. NO convertir a 0%.\\n\\n\`;

      prompt += \`============================================================\\n5. IDENTIDAD VISUAL WLSPORTS\\n============================================================\\n\\n\`;
      prompt += \`MARCA: WLSPORTS\\n\`;
      prompt += \`PALETA OFICIAL: NEGRO, GRAFITO, DORADO METÁLICO, VERDE NEÓN, BLANCO\\n\`;
      prompt += \`ESTÉTICA: Deportiva, tipo EA SPORTS / FIFA Ultimate Team. Coleccionable. Contraste elevado.\\n\`;
      prompt += \`Fotografía: SOLICITAR FOTOGRAFÍA AL USUARIO. Logo: SOLICITAR LOGO AL USUARIO.\\n\`;`;

  const newCode = code.substring(0, startIndex) + newTarjetaBlock + code.substring(endIndex);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', newCode);
  console.log('Patched correctly');
} else {
  console.log('Indices not found:', startIndex, endIndex);
}
