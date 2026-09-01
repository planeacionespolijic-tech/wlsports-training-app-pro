const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const targetVisual = `      prompt += \`ESTÉTICA: Deportiva, tipo EA SPORTS / FIFA Ultimate Team. Coleccionable. Contraste elevado.\\n\`;
      prompt += \`Fotografía: SOLICITAR FOTOGRAFÍA AL USUARIO. Logo: SOLICITAR LOGO AL USUARIO.\\n\`;`;

const replaceVisual = `      prompt += \`ESTÉTICA: Deportiva, exactamente con los mismos colores y estilo de EA SPORTS / FIFA Ultimate Team. Coleccionable. Contraste elevado.\\n\`;
      prompt += \`FORMATO DE SALIDA (IMPRESCINDIBLE): Proporción de aspecto ESTRICTAMENTE 5:8 (Vertical).\\n\`;
      prompt += \`MARGEN DE IMPRESIÓN (IMPRESCINDIBLE): Asegúrate de dejar un margen negro sólido de 5 milímetros (o el equivalente proporcional) en TODOS los bordes (arriba, abajo, izquierda, derecha) completamente libre de textos, logos, y sin que la cara del atleta toque los bordes. Esto es para que al recortar el carnet físico no se dañe el diseño.\\n\`;
      prompt += \`DATOS A SOLICITAR: Fotografía (SOLICITAR FOTOGRAFÍA AL USUARIO), Logo (SOLICITAR LOGO AL USUARIO), y OVR (SOLICITAR EL NIVEL DE OVR AL USUARIO antes de generar la imagen si no se especificó o si quiere cambiarlo).\\n\`;`;

if (code.includes(targetVisual)) {
  code = code.replace(targetVisual, replaceVisual);
  fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
  console.log('patched successfully');
} else {
  console.log('could not find target');
}
