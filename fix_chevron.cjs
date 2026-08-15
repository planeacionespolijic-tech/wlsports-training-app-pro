const fs = require('fs');
let code = fs.readFileSync('src/screens/HistoryScreen.tsx', 'utf8');

code = code.replace(
`                      {item.workoutDetails?.blocks?.length > 0 && (
                        <div className="text-zinc-600">
                          {expandedId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      )}`,
`                      {(item.workoutDetails?.blocks?.length > 0 || item.notes) && (
                        <div className="text-zinc-600">
                          {expandedId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      )}`
);

fs.writeFileSync('src/screens/HistoryScreen.tsx', code);
