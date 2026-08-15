const fs = require('fs');
let code = fs.readFileSync('src/screens/HistoryScreen.tsx', 'utf8');

code = code.replace(
`    return () => 
  }, [targetUserId]);`,
`    return () => {
      unsubHistory();
      unsubSessions();
    };
  }, [targetUserId]);`);

fs.writeFileSync('src/screens/HistoryScreen.tsx', code);
