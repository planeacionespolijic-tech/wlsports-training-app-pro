const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

const targetDOM = `            {/* Vista Previa de la Tarjeta */}
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
            </div>`;

const replaceDOM = `            {/* Vista Previa de la Tarjeta */}
            <div className="flex justify-center items-center bg-black p-8 rounded-3xl border border-zinc-800">
              {/* Contenedor que simula proporciones 54x85.6 (Ratio ~0.63) */}
              <div 
                ref={cardRef}
                className="relative w-[300px] h-[475px] overflow-hidden rounded-2xl flex flex-col"
                style={{
                   padding: '15px', 
                   boxSizing: 'border-box',
                   background: 'linear-gradient(to bottom right, #27272a, #1a1a1a, #000000)',
                   border: '1px solid rgba(63, 63, 70, 0.5)',
                   boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
              >
                {/* Fondo Decorativo */}
                <div 
                  className="absolute inset-0 mix-blend-overlay"
                  style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")', opacity: 0.2 }}
                ></div>
                <div 
                  className="absolute inset-0 z-10"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0.6), rgba(0,0,0,0))' }}
                ></div>
                
                {/* Contenido (Dentro del padding/margen seguro) */}
                <div 
                  className="relative z-20 flex flex-col h-full rounded-xl p-3 overflow-hidden"
                  style={{ border: '2px solid rgba(212, 175, 55, 0.3)' }}
                >
                  
                  {/* Foto Atleta */}
                  <div className="absolute inset-0 -top-10 flex justify-center z-0">
                    {athletePhoto ? (
                      <img 
                        src={athletePhoto} 
                        className="w-full h-[320px] object-cover object-top" 
                        style={{ filter: 'contrast(1.25) saturate(1.1) drop-shadow(0 0 15px rgba(212,175,55,0.2))' }}
                        alt="Athlete" 
                      />
                    ) : (
                      <div className="w-full h-[320px] animate-pulse" style={{ backgroundColor: 'rgba(39, 39, 42, 0.5)' }}></div>
                    )}
                  </div>
                  
                  {/* OVR y Stats Arriba Izquierda */}
                  <div className="absolute top-2 left-2 z-30 text-center">
                    <div className="text-4xl font-black leading-none" style={{ color: '#D4AF37', textShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                      {athlete.ovr || 0}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      OVR
                    </div>
                  </div>

                  {/* Logo Club Arriba Derecha */}
                  {clubLogo && (
                    <div className="absolute top-2 right-2 z-30 w-10 h-10 flex justify-center items-center">
                      <img src={clubLogo} className="max-w-full max-h-full object-contain" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} alt="Club Logo" />
                    </div>
                  )}

                  <div className="flex-1"></div>

                  {/* Info Inferior */}
                  <div className="relative z-30 flex flex-col items-center">
                    {/* Nivel */}
                    <div className="px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ backgroundColor: 'rgba(212, 175, 55, 0.9)', color: '#000000' }}>
                      {getLevelFromXP(athlete.xp || 0).name}
                    </div>
                    
                    {/* Nombre */}
                    <h2 className="text-xl font-black uppercase text-center w-full truncate mb-2" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {athlete.displayName?.split(' ')[0] || 'Atleta'}
                    </h2>
                    
                    <div className="w-full h-px mb-2" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 175, 55, 0.5), transparent)' }}></div>
                    
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
                          <span className="text-sm font-black leading-none" style={{ color: '#ffffff' }}>{stat.val}</span>
                          <span className="text-[7px] font-bold" style={{ color: '#D4AF37' }}>{stat.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="w-full h-px mb-1.5" style={{ background: 'linear-gradient(to right, transparent, rgba(63, 63, 70, 1), transparent)' }}></div>

                    {/* Metadata */}
                    <div className="text-[7px] font-bold uppercase tracking-widest text-center" style={{ color: '#d4d4d8' }}>
                      {[
                        athlete.age || athlete.profile?.age ? \`\${athlete.age || athlete.profile?.age} AÑOS\` : null,
                        athlete.sport || athlete.profile?.sport || 'DEPORTE',
                        athlete.position || athlete.profile?.position || 'POS'
                      ].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>`;

if (code.includes(targetDOM)) {
  code = code.replace(targetDOM, replaceDOM);
  console.log('patched dom colors');
} else {
  console.log('dom not found');
}
fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
