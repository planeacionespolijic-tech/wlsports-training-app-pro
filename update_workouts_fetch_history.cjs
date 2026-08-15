const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const effectTarget = `  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);`;

const newEffect = `  useEffect(() => {
    if (!targetUserId) return;
    setLoadingHistory(true);

    const qHistory = query(collection(db, 'history'), where('userId', '==', targetUserId));
    const qSessions = query(collection(db, 'sessions'), where('athleteId', '==', targetUserId));

    let histRaw = [];
    let sessRaw = [];

    const updateCombined = () => {
      setHistoryData([...histRaw, ...sessRaw]);
      setLoadingHistory(false);
    };

    const unsubHistory = onSnapshot(qHistory, (snap) => {
      histRaw = snap.docs.map(doc => {
        const d = doc.data();
        let dateStr = '';
        if (d.date?.toDate) {
           const dt = d.date.toDate();
           dateStr = \`\${dt.getFullYear()}-\${String(dt.getMonth()+1).padStart(2,'0')}-\${String(dt.getDate()).padStart(2,'0')}\`;
        } else if (d.date) {
           if (typeof d.date === 'string') dateStr = d.date.split('T')[0];
           else dateStr = String(d.date);
        }
        return { id: doc.id, collection: 'history', ...d, date: dateStr };
      });
      updateCombined();
    });

    const unsubSessions = onSnapshot(qSessions, (snap) => {
      sessRaw = snap.docs.map(doc => {
        const d = doc.data();
        let dateStr = '';
        if (d.date?.toDate) {
           const dt = d.date.toDate();
           dateStr = \`\${dt.getFullYear()}-\${String(dt.getMonth()+1).padStart(2,'0')}-\${String(dt.getDate()).padStart(2,'0')}\`;
        } else if (d.date) {
           if (typeof d.date === 'string') dateStr = d.date.split('T')[0];
           else dateStr = String(d.date);
        }
        return { 
          id: doc.id, 
          collection: 'sessions', 
          workoutName: d.workoutName || 'Sesión',
          status: d.status,
          notes: d.notes,
          xpGained: d.xpGained,
          createdAt: d.createdAt,
          ...d,
          date: dateStr
        };
      });
      updateCombined();
    });

    return () => {
      unsubHistory();
      unsubSessions();
    };
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);`;

code = code.replace(effectTarget, newEffect);
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log("Added history fetch");
