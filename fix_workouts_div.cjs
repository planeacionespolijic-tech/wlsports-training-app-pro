const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const target = `                                      <span className="text-[8px] font-black text-zinc-600 bg-black px-1.5 py-0.5 rounded border border-zinc-800 uppercase group-hover:border-zinc-700">
                                        {item.computedSessionNumber ? \`#\${item.computedSessionNumber}\` : '-'}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">{item.duration} • {item.blocks?.length || 0} Fases • {item.date || 'S/F'}</p>
                                  </div>`;

const newCode = `                                      <span className="text-[8px] font-black text-zinc-600 bg-black px-1.5 py-0.5 rounded border border-zinc-800 uppercase group-hover:border-zinc-700">
                                        {item.computedSessionNumber ? \`#\${item.computedSessionNumber}\` : '-'}
                                      </span>
                                    </div>
                                    </div>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">{item.duration} • {item.blocks?.length || 0} Fases • {item.date || 'S/F'}</p>
                                  </div>`;

code = code.replace(target, newCode);
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('Fixed unclosed div');
