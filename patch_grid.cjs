const fs = require('fs');
let code = fs.readFileSync('src/screens/AthleteProfileScreen.tsx', 'utf8');

const targetStr = `                      <span className="text-sm font-black" style={{ color: themeColor }}>
                        {attributes[attr.key] || attributes[attr.oldKey] || 10}
                      </span>
                    </div>`;

const replaceStr = `                      {isEditingAttributes ? (
                        <input
                          type="number"
                          className="w-10 bg-black border border-zinc-800 text-center text-sm font-black rounded outline-none focus:border-[#D4AF37]"
                          style={{ color: themeColor }}
                          value={editAttributes[attr.key as keyof typeof editAttributes]}
                          onChange={(e) => setEditAttributes({...editAttributes, [attr.key]: Number(e.target.value)})}
                        />
                      ) : (
                        <span className="text-sm font-black" style={{ color: themeColor }}>
                          {attributes[attr.key] || attributes[attr.oldKey] || 10}
                        </span>
                      )}
                    </div>`;

code = code.replace(targetStr, replaceStr);

const buttonTarget = `                  ))}
                </div>`;
const buttonReplace = `                  ))}
                </div>
                {isEditingAttributes && (
                  <button
                    onClick={handleUpdateAttributes}
                    disabled={isSavingAttributes}
                    className="w-full bg-[#D4AF37] text-black font-black uppercase tracking-widest text-xs py-2 rounded-xl mb-4 hover:bg-yellow-500 transition-colors"
                  >
                    {isSavingAttributes ? 'Guardando...' : 'Guardar Atributos'}
                  </button>
                )}`;

code = code.replace(buttonTarget, buttonReplace);

fs.writeFileSync('src/screens/AthleteProfileScreen.tsx', code);
console.log('patched using simple replace');
