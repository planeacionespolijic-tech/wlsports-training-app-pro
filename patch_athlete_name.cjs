const fs = require('fs');
let code = fs.readFileSync('src/screens/AthleteProfileScreen.tsx', 'utf8');

const targetState = `  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);`;
const newState = `  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(athlete?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  const handleUpdateName = async () => {
    if (!editNameValue.trim() || editNameValue.trim() === athlete.displayName || !isTrainer) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      const docRef = doc(db, 'users', athleteId);
      await updateDoc(docRef, {
        displayName: editNameValue.trim()
      });
      setAthlete(prev => ({ ...prev, displayName: editNameValue.trim() }));
      setFeedback({ message: 'Nombre actualizado', type: 'success' });
      setIsEditingName(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, \`users/\${athleteId}\`);
      setFeedback({ message: 'Error al actualizar el nombre', type: 'error' });
    } finally {
      setIsSavingName(false);
    }
  };
`;
code = code.replace(targetState, newState);

const targetRender = `<h2 className="text-3xl font-black tracking-tighter mb-1">{athlete.displayName}</h2>`;
const newRender = `          <div className="flex items-center gap-3 mb-1">
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full max-w-sm">
                <input 
                  type="text" 
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-xl font-black tracking-tighter w-full focus:outline-none focus:border-[#D4AF37]"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(); if (e.key === 'Escape') setIsEditingName(false); }}
                />
                <button 
                  onClick={handleUpdateName}
                  disabled={isSavingName}
                  className="p-2 bg-[#D4AF37] text-black rounded-xl hover:bg-amber-400 disabled:opacity-50"
                >
                  {isSavingName ? <Loader2 size={18} className="animate-spin" /> : <Edit2 size={18} />}
                </button>
                <button 
                  onClick={() => setIsEditingName(false)}
                  disabled={isSavingName}
                  className="p-2 bg-zinc-800 text-zinc-400 rounded-xl hover:text-white disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-3xl font-black tracking-tighter">{athlete.displayName}</h2>
                {isTrainer && (
                  <button 
                    onClick={() => { setEditNameValue(athlete.displayName); setIsEditingName(true); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-[#D4AF37] transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </div>
            )}
          </div>`;
code = code.replace(targetRender, newRender);

fs.writeFileSync('src/screens/AthleteProfileScreen.tsx', code);
console.log('patched athlete profile screen');
