const fs = require('fs');
let code = fs.readFileSync('src/screens/AthleteProfileScreen.tsx', 'utf8');

// Add states
const stateTarget = `const [isEditingName, setIsEditingName] = useState(false);`;
const stateInjection = `const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAttributes, setIsEditingAttributes] = useState(false);
  const [editAttributes, setEditAttributes] = useState({
    TEC: athlete?.attributes?.TEC || athlete?.attributes?.tecnica || 10,
    FIS: athlete?.attributes?.FIS || athlete?.attributes?.fuerza || 10,
    NEU: athlete?.attributes?.NEU || athlete?.attributes?.neuro || 10,
    AGI: athlete?.attributes?.AGI || athlete?.attributes?.ritmo || 10,
    ACT: athlete?.attributes?.ACT || athlete?.attributes?.mentalidad || 10
  });
  const [isSavingAttributes, setIsSavingAttributes] = useState(false);

  const handleUpdateAttributes = async () => {
    if (!isTrainer) return;
    setIsSavingAttributes(true);
    try {
      const docRef = doc(db, 'users', athleteId);
      await updateDoc(docRef, {
        attributes: editAttributes
      });
      setAthlete((prev: any) => ({ ...prev, attributes: editAttributes }));
      setIsEditingAttributes(false);
      setFeedback({ message: 'Atributos actualizados', type: 'success' });
    } catch (error) {
      console.error('Error updating attributes:', error);
      setFeedback({ message: 'Error al actualizar atributos', type: 'error' });
    } finally {
      setIsSavingAttributes(false);
    }
  };`;

code = code.replace(stateTarget, stateInjection);

// Add edit button and fields in Ficha Técnica
const sectionTarget = `        {/* Ficha Técnica (UNIFICADA) */}
        {(() => {
          const attributes = athlete.attributes || {};`;
          
const sectionInjection = `        {/* Ficha Técnica (UNIFICADA) */}
        {(() => {
          const attributes = athlete.attributes || {};`;

code = code.replace(sectionTarget, sectionInjection); // didn't change anything yet, let's fix it

const headerTarget = `                  <h3 className="text-sm font-black uppercase tracking-tighter">{athlete.displayName}</h3>
                </div>`;
const headerInjection = `                  <h3 className="text-sm font-black uppercase tracking-tighter">{athlete.displayName}</h3>
                  {isTrainer && (
                    <button 
                      onClick={() => setIsEditingAttributes(!isEditingAttributes)}
                      className="ml-2 p-2 bg-zinc-800/80 rounded-full text-zinc-400 hover:text-white transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>`;

code = code.replace(headerTarget, headerInjection);

const gridTarget = `                  <div className="grid grid-cols-5 gap-2 mb-6 uppercase">
                  {[
                    { key: 'TEC', label: 'TEC', icon: '⚽', oldKey: 'tecnica' },
                    { key: 'FIS', label: 'FIS', icon: '💪', oldKey: 'fuerza' },
                    { key: 'NEU', label: 'NEU', icon: '🧠', oldKey: 'neuro' },
                    { key: 'AGI', label: 'AGI', icon: '🤸', oldKey: 'ritmo' },
                    { key: 'ACT', label: 'ACT', icon: '🔥', oldKey: 'mentalidad' }
                  ].map(attr => (
                    <div key={attr.key} className="flex flex-col items-center gap-1">
                      <span className="text-xl">{attr.icon}</span>
                      <span className="text-[8px] font-black text-zinc-500 uppercase">{attr.label}</span>
                      <span className="text-sm font-black" style={{ color: themeColor }}>
                        {attributes[attr.key] || attributes[attr.oldKey] || 10}
                      </span>
                    </div>
                  ))}
                </div>`;

const gridInjection = `                  <div className="grid grid-cols-5 gap-2 mb-6 uppercase">
                  {[
                    { key: 'TEC', label: 'TEC', icon: '⚽', oldKey: 'tecnica' },
                    { key: 'FIS', label: 'FIS', icon: '💪', oldKey: 'fuerza' },
                    { key: 'NEU', label: 'NEU', icon: '🧠', oldKey: 'neuro' },
                    { key: 'AGI', label: 'AGI', icon: '🤸', oldKey: 'ritmo' },
                    { key: 'ACT', label: 'ACT', icon: '🔥', oldKey: 'mentalidad' }
                  ].map(attr => (
                    <div key={attr.key} className="flex flex-col items-center gap-1">
                      <span className="text-xl">{attr.icon}</span>
                      <span className="text-[8px] font-black text-zinc-500 uppercase">{attr.label}</span>
                      {isEditingAttributes ? (
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
                    </div>
                  ))}
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

code = code.replace(gridTarget, gridInjection);

fs.writeFileSync('src/screens/AthleteProfileScreen.tsx', code);
console.log('patched athlete attributes editing');
