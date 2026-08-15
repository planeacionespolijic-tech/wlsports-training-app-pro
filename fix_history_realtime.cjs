const fs = require('fs');
let code = fs.readFileSync('src/screens/HistoryScreen.tsx', 'utf8');

const oldLogic = `    const loadData = async () => {
      setLoading(true);
      try {
        const [histSnap, sessSnap] = await Promise.all([
          getDocs(qHistory),
          getDocs(qSessions)
        ]);
        
        let combined = [];
        
        histSnap.forEach(doc => {
          combined.push({ id: doc.id, collection: 'history', ...doc.data() });
        });
        
        sessSnap.forEach(doc => {
          const d = doc.data();
          let dateStr = '';
          if (d.date?.toDate) {
             const dt = d.date.toDate();
             dateStr = \`\${dt.getFullYear()}-\${String(dt.getMonth()+1).padStart(2,'0')}-\${String(dt.getDate()).padStart(2,'0')}\`;
          } else if (d.date) {
             dateStr = d.date.toString().split('T')[0];
          }
          combined.push({ 
            id: doc.id, 
            collection: 'sessions', 
            workoutName: d.workoutName || 'Sesión',
            date: dateStr,
            status: d.status,
            notes: d.notes,
            xpGained: d.xpGained,
            createdAt: d.createdAt,
            ...d 
          });
        });

        // Sort by date/createdAt descending
        combined.sort((a, b) => {
           const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
           const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
           return timeB - timeA;
        });

        setHistory(combined);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();`;

const newLogic = `    let historyData = [];
    let sessionsData = [];

    const updateCombined = () => {
      const combined = [...historyData, ...sessionsData];
      combined.sort((a, b) => {
         const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
         const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
         return timeB - timeA;
      });
      setHistory(combined);
      setLoading(false);
    };

    const unsubHistory = onSnapshot(qHistory, (snap) => {
      historyData = snap.docs.map(doc => ({ id: doc.id, collection: 'history', ...doc.data() }));
      updateCombined();
    });

    const unsubSessions = onSnapshot(qSessions, (snap) => {
      sessionsData = snap.docs.map(doc => {
        const d = doc.data();
        let dateStr = '';
        if (d.date?.toDate) {
           const dt = d.date.toDate();
           dateStr = \`\${dt.getFullYear()}-\${String(dt.getMonth()+1).padStart(2,'0')}-\${String(dt.getDate()).padStart(2,'0')}\`;
        } else if (d.date) {
           dateStr = d.date.toString().split('T')[0];
        }
        return { 
          id: doc.id, 
          collection: 'sessions', 
          workoutName: d.workoutName || 'Sesión',
          date: dateStr,
          status: d.status,
          notes: d.notes,
          xpGained: d.xpGained,
          createdAt: d.createdAt,
          ...d 
        };
      });
      updateCombined();
    });`;

code = code.replace(oldLogic, newLogic);
code = code.replace('    return () => {', '    return () => {\n      unsubHistory();\n      unsubSessions();');
code = code.replace('unsubscribeHistory();', ''); // remove old if exists
fs.writeFileSync('src/screens/HistoryScreen.tsx', code);
console.log("Fixed to realtime");
