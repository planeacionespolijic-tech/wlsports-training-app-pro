const fs = require('fs');
let code = fs.readFileSync('src/screens/AthleteProfileScreen.tsx', 'utf8');

const target1 = `  const athleteId = userId || id || '';
  const trainerId = user?.uid || '';`;

const replace1 = `  const athleteId = userId || id || '';
  const trainerId = user?.uid || '';
  const canEditProfile = isTrainer || user?.uid === athleteId;`;

const target2 = `    const file = e.target.files?.[0];
    if (!file || !isTrainer) return;`;

const replace2 = `    const file = e.target.files?.[0];
    if (!file || !canEditProfile) return;`;

const target3 = `            {isTrainer && (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}`;

const replace3 = `            {canEditProfile && (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}`;

if (code.includes(target1) && code.includes(target2) && code.includes(target3)) {
  code = code.replace(target1, replace1);
  code = code.replace(target2, replace2);
  code = code.replace(target3, replace3);
  fs.writeFileSync('src/screens/AthleteProfileScreen.tsx', code);
  console.log('patched permissions for photo upload');
} else {
  console.log('could not patch');
  if(!code.includes(target1)) console.log('1 missing');
  if(!code.includes(target2)) console.log('2 missing');
  if(!code.includes(target3)) console.log('3 missing');
}
