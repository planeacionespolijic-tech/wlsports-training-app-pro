const fs = require('fs');
let code = fs.readFileSync('src/screens/evaluation/steps/ProfileStep.tsx', 'utf8');

const targetStr = `        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Deporte</label>
            <input 
              type="text" 
              value={formData.profile.sport}
              onChange={(e) => updateData('profile', { ...formData.profile, sport: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
              placeholder="Ej: Fútbol"
            />
          </div>`;

const insertStr = `        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Nacionalidad</label>
            <input 
              type="text" 
              value={formData.profile.nationality || ''}
              onChange={(e) => updateData('profile', { ...formData.profile, nationality: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
              placeholder="Ej: Colombia, México"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Categoría</label>
            <input 
              type="text" 
              value={formData.profile.category || ''}
              onChange={(e) => updateData('profile', { ...formData.profile, category: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
              placeholder="Ej: Sub-15, Élite"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Deporte</label>
            <input 
              type="text" 
              value={formData.profile.sport}
              onChange={(e) => updateData('profile', { ...formData.profile, sport: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
              placeholder="Ej: Fútbol"
            />
          </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, insertStr);
  fs.writeFileSync('src/screens/evaluation/steps/ProfileStep.tsx', code);
  console.log('patched ProfileStep');
} else {
  console.log('failed to patch ProfileStep');
}
