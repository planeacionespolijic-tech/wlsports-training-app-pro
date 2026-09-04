const fs = require('fs');
let code = fs.readFileSync('src/screens/AthleteProfileScreen.tsx', 'utf8');

// 1. Add state
const targetState = `  const [showDemoteConfirm, setShowDemoteConfirm] = useState(false);`;
const replaceState = `  const [showDemoteConfirm, setShowDemoteConfirm] = useState(false);
  const [showEditXpModal, setShowEditXpModal] = useState(false);
  const [editingXp, setEditingXp] = useState<number | string>('');
  const [isUpdatingXp, setIsUpdatingXp] = useState(false);`;

code = code.replace(targetState, replaceState);

// 2. Add handleUpdateXp function
const targetFunc = `  const handleDemoteLevel = async () => {`;
const replaceFunc = `  const handleUpdateXp = async () => {
    if (!isTrainer) return;
    const newXpNum = Number(editingXp);
    if (isNaN(newXpNum) || newXpNum < 0) {
      alert('XP inválida');
      return;
    }
    
    setIsUpdatingXp(true);
    try {
      await updateDoc(doc(db, 'users', athleteId), { xp: newXpNum });
      setAthlete({ ...athlete, xp: newXpNum });
      setFeedback({ message: 'XP actualizada exitosamente', type: 'success' });
      setShowEditXpModal(false);
    } catch (error) {
      console.error('Error al actualizar XP:', error);
      setFeedback({ message: 'Error al actualizar XP', type: 'error' });
    } finally {
      setIsUpdatingXp(false);
    }
  };

  const handleDemoteLevel = async () => {`;

code = code.replace(targetFunc, replaceFunc);

// 3. Add edit button in UI
const targetUI = `<span className={\`text-xs font-bold uppercase tracking-widest \${isChild ? 'text-blue-500' : 'text-[#D4AF37]'}\`}>
                    {getLevelFromXP(athlete.xp || 0).name} • {athlete.xp || 0} XP
                  </span>
                </div>`;
const replaceUI = `<span className={\`text-xs font-bold uppercase tracking-widest \${isChild ? 'text-blue-500' : 'text-[#D4AF37]'}\`}>
                    {getLevelFromXP(athlete.xp || 0).name} • {athlete.xp || 0} XP
                  </span>
                  {isTrainer && (
                    <button 
                      onClick={() => {
                        setEditingXp(athlete.xp || 0);
                        setShowEditXpModal(true);
                      }} 
                      className="ml-2 p-1 text-zinc-500 hover:text-white transition-colors"
                      title="Editar XP"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>`;

code = code.replace(targetUI, replaceUI);

// 4. Add the modal
const targetModal = `<ConfirmationModal
        isOpen={showDemoteConfirm}`;
const replaceModal = `      {showEditXpModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm text-white">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-zinc-800">
            <h2 className="text-xl font-black uppercase text-[#D4AF37] mb-4">Editar XP</h2>
            <div className="mb-6 space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Puntos de Experiencia (XP)</label>
              <input 
                type="number" 
                value={editingXp} 
                onChange={(e) => setEditingXp(e.target.value)} 
                className="w-full bg-black border border-zinc-700 p-3 rounded-xl focus:border-[#D4AF37] outline-none"
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowEditXpModal(false)}
                className="flex-1 py-3 bg-zinc-800 rounded-xl font-bold text-xs uppercase"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateXp}
                disabled={isUpdatingXp}
                className="flex-1 py-3 bg-[#D4AF37] text-black rounded-xl font-bold text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpdatingXp ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      <ConfirmationModal
        isOpen={showDemoteConfirm}`;

code = code.replace(targetModal, replaceModal);

fs.writeFileSync('src/screens/AthleteProfileScreen.tsx', code);
console.log('patched');
