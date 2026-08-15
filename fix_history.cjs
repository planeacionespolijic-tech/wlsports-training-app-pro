const fs = require('fs');
let code = fs.readFileSync('src/screens/HistoryScreen.tsx', 'utf8');

// Replace history query
code = code.replace(
`    const qHistory = query(
      collection(db, 'history'),
      where('userId', '==', targetUserId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'history');
    });`,
`    const qHistory = query(
      collection(db, 'history'),
      where('userId', '==', targetUserId)
    );
    const qSessions = query(
      collection(db, 'sessions'),
      where('athleteId', '==', targetUserId)
    );

    const loadData = async () => {
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
    
    loadData();`
);

// We need to add getDocs to the imports if it's missing.
if (!code.includes('getDocs')) {
  code = code.replace("import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';", "import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';");
}

fs.writeFileSync('src/screens/HistoryScreen.tsx', code);
console.log("Updated HistoryScreen logic");
