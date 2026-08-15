const fs = require('fs');
let code = fs.readFileSync('src/screens/HistoryScreen.tsx', 'utf8');

const oldLogic = `    const unsubHistory = onSnapshot(qHistory, (snap) => {
      historyData = snap.docs.map(doc => ({ id: doc.id, collection: 'history', ...doc.data() }));
      updateCombined();
    });`;

const newLogic = `    const unsubHistory = onSnapshot(qHistory, (snap) => {
      historyData = snap.docs.map(doc => {
        const d = doc.data();
        let dateStr = '';
        if (d.date?.toDate) {
           const dt = d.date.toDate();
           dateStr = \`\${dt.getFullYear()}-\${String(dt.getMonth()+1).padStart(2,'0')}-\${String(dt.getDate()).padStart(2,'0')}\`;
        } else if (d.date) {
           // Might be a string or something else
           if (typeof d.date === 'string') {
               dateStr = d.date.split('T')[0];
           } else {
               dateStr = String(d.date);
           }
        }
        return { 
          id: doc.id, 
          collection: 'history', 
          ...d,
          date: dateStr 
        };
      });
      updateCombined();
    });`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/screens/HistoryScreen.tsx', code);
console.log("Fixed history dates");
