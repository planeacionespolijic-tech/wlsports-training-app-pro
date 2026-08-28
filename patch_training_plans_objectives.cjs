const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');

// Update state
code = code.replace(
  "const [specificObjectives, setSpecificObjectives] = useState('');",
  "const [specificObjectives, setSpecificObjectives] = useState<string[]>([]);\n  const [newSpecificObjective, setNewSpecificObjective] = useState('');"
);

// Update clear state
code = code.replace(
  "setSpecificObjectives('');",
  "setSpecificObjectives([]);\n      setNewSpecificObjective('');"
);

// Update form UI
const targetFormUI = `              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Objetivos Específicos</label>
                <textarea 
                  value={specificObjectives} onChange={e => setSpecificObjectives(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-20 resize-none"
                  placeholder="Ej: - Reducir 10% el tiempo en 5km\\n- Incrementar peso en sentadilla a 120kg..." 
                />
              </div>`;

const newFormUI = `              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Objetivos Específicos</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newSpecificObjective} 
                    onChange={e => setNewSpecificObjective(e.target.value)}
                    className="flex-1 bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none text-sm"
                    placeholder="Añadir objetivo específico..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSpecificObjective.trim()) {
                          setSpecificObjectives([...specificObjectives, newSpecificObjective.trim()]);
                          setNewSpecificObjective('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newSpecificObjective.trim()) {
                        setSpecificObjectives([...specificObjectives, newSpecificObjective.trim()]);
                        setNewSpecificObjective('');
                      }
                    }}
                    className="bg-zinc-800 hover:bg-[#D4AF37] hover:text-black px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
                  >
                    Añadir
                  </button>
                </div>
                {specificObjectives.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {specificObjectives.map((obj, i) => (
                      <div key={\`obj-\${i}\`} className="bg-black border border-zinc-800 p-3 rounded-lg text-sm flex items-center justify-between gap-2">
                        <span className="text-zinc-300">{obj}</span>
                        <button type="button" onClick={() => setSpecificObjectives(specificObjectives.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 p-1 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>`;

code = code.replace(targetFormUI, newFormUI);

// Update rendering UI
const targetRenderUI = `                  {item.specificObjectives && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">Objetivos Específicos</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.specificObjectives}</p>
                    </div>
                  )}`;

const newRenderUI = `                  {item.specificObjectives && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">Objetivos Específicos</h4>
                      {Array.isArray(item.specificObjectives) ? (
                        <ul className="list-disc pl-4 text-sm text-zinc-300 space-y-1.5">
                          {item.specificObjectives.map((obj: string, i: number) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.specificObjectives}</p>
                      )}
                    </div>
                  )}`;

code = code.replace(targetRenderUI, newRenderUI);

fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
console.log('patched specific objectives');
