const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetHistory2 = `                                         >
                                           <Trash2 size={18} />
                                         </button>
                                       )}
                                       {(item.workoutDetails?.blocks?.length > 0 || item.notes) && (`;

const replaceHistory2 = `                                         >
                                           <Trash2 size={18} />
                                         </button>
                                         </>
                                       )}
                                       {(item.workoutDetails?.blocks?.length > 0 || item.notes) && (`;

if (code.includes(targetHistory2)) {
  code = code.replace(targetHistory2, replaceHistory2);
  console.log('patched history tab buttons - 2');
} else {
  console.log('targetHistory2 not found');
}
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
