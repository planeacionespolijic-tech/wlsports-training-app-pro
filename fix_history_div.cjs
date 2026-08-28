const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const target = `                                            {item.status === 'Realizada' && <span className="bg-green-500/10 text-green-500 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">✓ OK</span>}
                                            {item.status === 'No realizada' && <span className="bg-red-500/10 text-red-500 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">✕ Novedad</span>}
                                         </div>
                                         <p className="text-zinc-400 text-xs mt-0.5">{item.date} {item.xpGained ? \`• +\${item.xpGained} XP\` : ''}</p>
                                       </div>`;

const newCode = `                                            {item.status === 'Realizada' && <span className="bg-green-500/10 text-green-500 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">✓ OK</span>}
                                            {item.status === 'No realizada' && <span className="bg-red-500/10 text-red-500 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">✕ Novedad</span>}
                                         </div>
                                         </div>
                                         <p className="text-zinc-400 text-xs mt-0.5">{item.date} {item.xpGained ? \`• +\${item.xpGained} XP\` : ''}</p>
                                       </div>`;

code = code.replace(target, newCode);
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('Fixed history div');
