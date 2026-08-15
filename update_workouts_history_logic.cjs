const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

// Add useMemo for groupedHistory
const oldMemo = `  }, [workouts]);`;
const newMemo = `  }, [workouts]);

  // Group history by Month and Year
  const groupedHistory = useMemo<Record<string, any[]>>(() => {
    const sorted = [...historyData].sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return timeB - timeA; // Newest first
    });

    const groups: Record<string, any[]> = {};
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    sorted.forEach(item => {
      let dateStr = item.date;
      if (!dateStr && item.createdAt?.toDate) {
          dateStr = item.createdAt.toDate().toISOString().split('T')[0];
      }
      if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
      
      const dateObj = new Date(dateStr.includes('T') ? dateStr : \`\${dateStr}T12:00:00\`);
      const key = \`\${monthNames[dateObj.getMonth()]} \${dateObj.getFullYear()}\`;
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [historyData]);

  const [expandedHistoryGroups, setExpandedHistoryGroups] = useState<Record<string, boolean>>({});
  
  const toggleHistoryGroup = (key: string) => {
    setExpandedHistoryGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const keys = Object.keys(groupedHistory);
    if (keys.length > 0 && Object.keys(expandedHistoryGroups).length === 0) {
      setExpandedHistoryGroups({ [keys[0]]: true });
    }
  }, [groupedHistory]);
`;

code = code.replace(oldMemo, newMemo);

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log("Added history grouping");
