const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  /allow update: if isSuperAdmin\(\) \|\| \(isNotBlocked\(\) && isTrainer\(\)\);\s*allow delete: if isSuperAdmin\(\) \|\| \(isNotBlocked\(\) && isTrainer\(\)\);/g,
  `allow update: if isSuperAdmin() || (isNotBlocked() && (isTrainer() || request.auth.uid == resource.data.athleteId));
      allow delete: if isSuperAdmin() || (isNotBlocked() && (isTrainer() || request.auth.uid == resource.data.athleteId));`
);

fs.writeFileSync('firestore.rules', code);
console.log('Rules patched');
