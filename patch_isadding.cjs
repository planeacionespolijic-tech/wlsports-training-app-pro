const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

code = code.replace(`  const [isAdding, setIsAdding] = useState(false);`, `  const [isAdding, setIsAdding] = useState(location.state?.isAdding || false);`);

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('patched isAdding');
