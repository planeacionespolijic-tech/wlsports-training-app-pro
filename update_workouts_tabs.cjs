const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

// Add active tab state
const oldState = `  const [routineSearch, setRoutineSearch] = useState('');`;
const newState = `  const [routineSearch, setRoutineSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'programados' | 'historial'>('programados');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);`;
code = code.replace(oldState, newState);

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log("Added state");
