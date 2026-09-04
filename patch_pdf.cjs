const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const targetImport = `import { getLevelFromXP, LEVELS } from '../constants';`;
const replaceImport = `import { getLevelFromXP, LEVELS } from '../constants';
import { jsPDF } from 'jspdf';`;

code = code.replace(targetImport, replaceImport);

const targetFunc = `  const copyPrompt = () => {`;
const replaceFunc = `  const generatePrintablePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgData = event.target?.result as string;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [54, 85.6]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, 54, 85.6);
      pdf.save(\`Carnet_\${athlete.displayName || 'WLSPORTS'}.pdf\`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const copyPrompt = () => {`;

code = code.replace(targetFunc, replaceFunc);

const targetUI = `              <div className="flex gap-4 pt-4">`;
const replaceUI = `              {activeFlow === 'tarjeta' && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl relative overflow-hidden group">
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                      <FileText size={16} /> Generar PDF Imprimible (Carnet)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Sube la imagen generada por la IA para crear tu PDF. Se ajustará exactamente al tamaño estándar de identificación (54mm x 85.6mm vertical) conservando los márgenes de 5mm para garantizar una impresión correcta.
                    </p>
                    <label className="flex items-center justify-center w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs cursor-pointer transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98]">
                      Subir Imagen y Descargar PDF
                      <input type="file" accept="image/*" className="hidden" onChange={generatePrintablePDF} />
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">`;

code = code.replace(targetUI, replaceUI);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log('patched reportes');
