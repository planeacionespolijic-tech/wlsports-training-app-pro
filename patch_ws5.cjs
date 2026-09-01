const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetHistory = `                                     <div className="flex items-center gap-3">
                                       {(userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' || targetUserId === user?.uid) && (
                                         <button`;

const replaceHistory = `                                     <div className="flex items-center gap-3">
                                       {(userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' || targetUserId === user?.uid) && (
                                         <>
                                           <button
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               handleEdit(item);
                                             }}
                                             className="p-2 text-zinc-700 hover:text-[#D4AF37] transition-colors"
                                           >
                                             <Edit2 size={18} />
                                           </button>
                                           <button`;

if (code.includes(targetHistory)) {
  code = code.replace(targetHistory, replaceHistory);
  console.log('patched history tab buttons - 1');
} else {
  console.log('targetHistory not found');
}

const targetHistory2 = `                                         </button>
                                       )}
                                       {expandedHistoryId === item.id ? <ChevronUp size={20} className="text-zinc-600" /> : <ChevronDown size={20} className="text-zinc-600" />}`;

const replaceHistory2 = `                                         </button>
                                         </>
                                       )}
                                       {expandedHistoryId === item.id ? <ChevronUp size={20} className="text-zinc-600" /> : <ChevronDown size={20} className="text-zinc-600" />}`;

if (code.includes(targetHistory2)) {
  code = code.replace(targetHistory2, replaceHistory2);
  console.log('patched history tab buttons - 2');
} else {
  console.log('targetHistory2 not found');
}

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
