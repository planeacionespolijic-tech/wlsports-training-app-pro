const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const targetImport = `import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Trophy, Copy, CheckCircle2, FileText, Award, UserSquare } from 'lucide-react';`;
const replaceImport = `import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, BookOpen, Trophy, Copy, CheckCircle2, FileText, Award, UserSquare, Camera, Download, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';`;
code = code.replace(targetImport, replaceImport);

const targetState = `  const [activeFlow, setActiveFlow] = useState<'none' | 'mensual' | 'nivel' | 'tarjeta'>('none');`;
const replaceState = `  const [activeFlow, setActiveFlow] = useState<'none' | 'mensual' | 'nivel' | 'tarjeta' | 'tarjeta-visual'>('none');
  const [athletePhoto, setAthletePhoto] = useState<string>('');
  const [clubLogo, setClubLogo] = useState<string>('');
  const [generatingCard, setGeneratingCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);`;
code = code.replace(targetState, replaceState);

const targetMenu = `        </div>
      ) : (`;
const replaceMenu = `        <button 
            onClick={() => setActiveFlow('tarjeta-visual')}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl hover:bg-zinc-800 transition-all text-left flex flex-col gap-4 group"
          >
            <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-full w-fit group-hover:scale-110 transition-transform">
              <Camera size={32} />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase">Tarjeta Interactiva</h3>
              <p className="text-zinc-400 text-xs mt-1">Generador visual con descarga directa a PDF sin prompts.</p>
            </div>
          </button>
        </div>
      ) : activeFlow === 'tarjeta-visual' ? (
        <div className="space-y-6">
          <button 
            onClick={() => { setActiveFlow('none'); setStep('config'); }}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider mb-2"
          >
            <ArrowLeft size={16} /> Volver a Opciones
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controles de Imagen */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <h3 className="text-xl font-black uppercase text-[#D4AF37]">Generador Visual</h3>
              <p className="text-xs text-zinc-400">Sube la foto del atleta (preferiblemente sin fondo) y el logo para generar la tarjeta.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Foto del Atleta</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 bg-black border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:border-[#D4AF37] transition-colors overflow-hidden relative">
                    {athletePhoto ? (
                      <img src={athletePhoto} alt="Athlete" className="h-full object-contain z-10" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <UserSquare size={24} className="text-zinc-500 mb-2" />
                        <span className="text-xs text-zinc-500 font-bold uppercase">Subir Foto</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setAthletePhoto(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Logo del Club (Opcional)</label>
                  <label className="flex flex-col items-center justify-center w-full h-24 bg-black border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:border-[#D4AF37] transition-colors overflow-hidden relative">
                    {clubLogo ? (
                      <img src={clubLogo} alt="Logo" className="h-full object-contain z-10" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon size={24} className="text-zinc-500 mb-2" />
                        <span className="text-xs text-zinc-500 font-bold uppercase">Subir Logo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setClubLogo(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!cardRef.current) return;
                  setGeneratingCard(true);
                  try {
                    // Forzamos un reflow para asegurar que las fuentes/imágenes carguen si es necesario, 
                    // aunque html2canvas manejará lo visible.
                    const canvas = await html2canvas(cardRef.current, {
                      scale: 3, // Alta calidad
                      useCORS: true,
                      backgroundColor: '#000000'
                    });
                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
                    
                    const pdf = new (window as any).jspdf.jsPDF({
                      orientation: 'portrait',
                      unit: 'mm',
                      format: [54, 85.6]
                    });
                    
                    pdf.addImage(imgData, 'JPEG', 0, 0, 54, 85.6);
                    pdf.save(\`Carnet_WLSPORTS_\${athlete.displayName || 'Atleta'}.pdf\`);
                  } catch (error) {
                    console.error("Error al generar PDF:", error);
                    alert("Error al generar el PDF. Revisa la consola.");
                  } finally {
                    setGeneratingCard(false);
                  }
                }}
                disabled={generatingCard || !athletePhoto}
                className="w-full bg-[#D4AF37] text-black font-black uppercase py-4 rounded-xl tracking-widest hover:bg-yellow-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generatingCard ? 'Generando PDF...' : <><Download size={18} /> Descargar PDF (CR80)</>}
              </button>
            </div>

            {/* Vista Previa de la Tarjeta */}
            <div className="flex justify-center items-center bg-black p-8 rounded-3xl border border-zinc-800">
              {/* Contenedor que simula proporciones 54x85.6 (Ratio ~0.63) */}
              <div 
                ref={cardRef}
                className="relative bg-gradient-to-br from-zinc-800 via-[#1a1a1a] to-black w-[300px] h-[475px] overflow-hidden rounded-2xl shadow-2xl border border-zinc-700/50 flex flex-col"
                style={{
                   // Para asegurar impresión perfecta CR80, añadiremos borde negro 5mm
                   padding: '15px', 
                   boxSizing: 'border-box'
                }}
              >
                {/* Fondo Decorativo */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10"></div>
                
                {/* Contenido (Dentro del padding/margen seguro) */}
                <div className="relative z-20 flex flex-col h-full border-2 border-[#D4AF37]/30 rounded-xl p-3 overflow-hidden">
                  
                  {/* Foto Atleta */}
                  <div className="absolute inset-0 -top-10 flex justify-center z-0">
                    {athletePhoto ? (
                      <img src={athletePhoto} className="w-full h-[320px] object-cover object-top filter contrast-125 saturate-110 drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]" alt="Athlete" />
                    ) : (
                      <div className="w-full h-[320px] bg-zinc-800/50 animate-pulse"></div>
                    )}
                  </div>
                  
                  {/* OVR y Stats Arriba Izquierda */}
                  <div className="absolute top-2 left-2 z-30 text-center">
                    <div className="text-4xl font-black text-[#D4AF37] leading-none drop-shadow-lg">
                      {athlete.ovr || 0}
                    </div>
                    <div className="text-[10px] font-bold text-white uppercase tracking-widest drop-shadow-md">
                      OVR
                    </div>
                  </div>

                  {/* Logo Club Arriba Derecha */}
                  {clubLogo && (
                    <div className="absolute top-2 right-2 z-30 w-10 h-10 flex justify-center items-center">
                      <img src={clubLogo} className="max-w-full max-h-full object-contain drop-shadow-lg" alt="Club Logo" />
                    </div>
                  )}

                  <div className="flex-1"></div>

                  {/* Info Inferior */}
                  <div className="relative z-30 flex flex-col items-center">
                    {/* Nivel */}
                    <div className="bg-[#D4AF37]/90 text-black px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                      {getLevelFromXP(athlete.xp || 0).name}
                    </div>
                    
                    {/* Nombre */}
                    <h2 className="text-xl font-black text-white uppercase text-center w-full truncate mb-2 drop-shadow-md">
                      {athlete.displayName?.split(' ')[0] || 'Atleta'}
                    </h2>
                    
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mb-2"></div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-5 w-full gap-1 px-1 mb-2">
                      {[
                        { label: 'TEC', val: athlete.attributes?.TEC || athlete.attributes?.tecnica || 10 },
                        { label: 'FIS', val: athlete.attributes?.FIS || athlete.attributes?.fuerza || 10 },
                        { label: 'NEU', val: athlete.attributes?.NEU || athlete.attributes?.neuro || 10 },
                        { label: 'AGI', val: athlete.attributes?.AGI || athlete.attributes?.ritmo || 10 },
                        { label: 'ACT', val: athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10 }
                      ].map(stat => (
                        <div key={stat.label} className="flex flex-col items-center">
                          <span className="text-sm font-black text-white leading-none">{stat.val}</span>
                          <span className="text-[7px] text-[#D4AF37] font-bold">{stat.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-1.5"></div>

                    {/* Metadata */}
                    <div className="text-[7px] font-bold text-zinc-300 uppercase tracking-widest text-center">
                      {[
                        athlete.age || athlete.profile?.age ? \`\${athlete.age || athlete.profile?.age} AÑOS\` : null,
                        athlete.sport || athlete.profile?.sport || 'DEPORTE',
                        athlete.position || athlete.profile?.position || 'POS'
                      ].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (`;
code = code.replace(targetMenu, replaceMenu);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log('patched visual card');
