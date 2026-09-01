const fs = require('fs');
let code = fs.readFileSync('src/screens/evaluation/steps/ProfileStep.tsx', 'utf8');

const calculateAgeFn = `
const calculateAge = (birthDateString: string) => {
  if (!birthDateString) return '';
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};
`;

const replaceAge = `
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Fecha de Nacimiento</label>
            <input 
              type="date" 
              value={formData.profile.birthDate || ''}
              onChange={(e) => {
                const dateVal = e.target.value;
                const calculatedAge = calculateAge(dateVal);
                updateData('profile', { ...formData.profile, birthDate: dateVal, age: calculatedAge });
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Edad</label>
            <input 
              type="number" 
              value={formData.profile.age}
              readOnly
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-500 outline-none cursor-not-allowed"
              placeholder="Automático"
            />
          </div>
        </div>
`;

const targetAge = `        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Edad</label>
          <input 
            type="number" 
            value={formData.profile.age}
            onChange={(e) => updateData('profile', { ...formData.profile, age: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
            placeholder="Ej: 25"
          />
        </div>`;

if (code.includes(targetAge)) {
  code = code.replace(targetAge, replaceAge);
  code = code.replace('export const ProfileStep: React.FC<StepProps> = ({ formData, updateData }) => {', calculateAgeFn + '\nexport const ProfileStep: React.FC<StepProps> = ({ formData, updateData }) => {');
  fs.writeFileSync('src/screens/evaluation/steps/ProfileStep.tsx', code);
  console.log('patched ProfileStep');
} else {
  console.log('targetAge not found in ProfileStep');
}
