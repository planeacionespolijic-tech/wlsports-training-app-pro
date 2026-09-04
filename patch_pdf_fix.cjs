const fs = require('fs');
let code = fs.readFileSync('src/screens/ReportesWLSportsScreen.tsx', 'utf8');

code = code.replace(
  /const pdf = new \(window as any\).jspdf.jsPDF\(\{/g,
  `const pdf = new jsPDF({`
);

fs.writeFileSync('src/screens/ReportesWLSportsScreen.tsx', code);
console.log('patched pdf fix');
