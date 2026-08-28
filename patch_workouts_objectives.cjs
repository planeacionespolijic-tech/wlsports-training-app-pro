const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const targetState = `  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);`;
const newState = `  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  
  // Level Objectives State
  const [levelObjectiveGen, setLevelObjectiveGen] = useState(location.state?.athlete?.levelObjectiveGen || '');
  const [levelObjectiveSpec, setLevelObjectiveSpec] = useState(location.state?.athlete?.levelObjectiveSpec || '');
  const [showLevelObjectives, setShowLevelObjectives] = useState(false);
  const [savingObjectives, setSavingObjectives] = useState(false);
`;
code = code.replace(targetState, newState);

const handleSaveTarget = `  const handleAddWorkout = async () => {`;
const handleSaveNew = `
  const handleSaveLevelObjectives = async () => {
    if (!targetUserId) return;
    setSavingObjectives(true);
    try {
      await updateDoc(doc(db, 'users', targetUserId), {
        levelObjectiveGen,
        levelObjectiveSpec
      });
      alert('Objetivos de nivel guardados correctamente');
      setShowLevelObjectives(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar objetivos');
    } finally {
      setSavingObjectives(false);
    }
  };

  const handleAddWorkout = async () => {`;
code = code.replace(handleSaveTarget, handleSaveNew);

const uiTarget = `      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">`;
const uiNew = `      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => isAdding ? resetForm() : navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full"><ArrowLeft size={24} /></button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold">
              {isAdding ? (editingWorkoutId ? 'Editar Entrenamiento' : 'Nuevo Entrenamiento') : 
               (isViewingAthlete ? 'Entrenamientos de Atleta' : 'Mis Entrenamientos')}
            </h1>
            {isViewingAthlete && !isAdding && (
              <button 
                onClick={() => setShowLevelObjectives(true)}
                className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest text-left mt-1 hover:underline flex items-center gap-1"
              >
                <Target size={12} /> Objetivos del Nivel
              </button>
            )}
          </div>
        </div>
        {!isAdding && (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin') && (
          <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-[#D4AF37] text-black p-2 rounded-xl"><Plus size={24} /></button>
        )}
      </header>
      
      <AnimatePresence>
        {showLevelObjectives && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 w-full max-w-lg rounded-3xl p-6 border border-zinc-800"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-[#D4AF37] font-black uppercase tracking-widest text-sm">Objetivos de Nivel</h3>
                  <p className="text-[10px] text-zinc-400 uppercase mt-1">Configura las metas para esta etapa</p>
                </div>
                <button onClick={() => setShowLevelObjectives(false)} className="p-2 text-zinc-500 hover:text-white"><X size={20}/></button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Objetivo General del Nivel</label>
                  <textarea 
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-sm outline-none focus:border-[#D4AF37] resize-none h-24"
                    placeholder="Ej: Desarrollar la potencia explosiva y perfeccionar la técnica de definición..."
                    value={levelObjectiveGen}
                    onChange={(e) => setLevelObjectiveGen(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Objetivos Específicos</label>
                  <textarea 
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-sm outline-none focus:border-[#D4AF37] resize-none h-24"
                    placeholder="Ej: - Reducir el tiempo en el circuito X\n- Incrementar un 10% el peso en sentadilla..."
                    value={levelObjectiveSpec}
                    onChange={(e) => setLevelObjectiveSpec(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <button 
                  onClick={handleSaveLevelObjectives}
                  disabled={savingObjectives}
                  className="w-full bg-[#D4AF37] text-black font-black uppercase tracking-widest py-3 rounded-xl hover:bg-yellow-500 flex justify-center"
                >
                  {savingObjectives ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Objetivos'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;
code = code.replace(`      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => isAdding ? resetForm() : navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold">
            {isAdding ? (editingWorkoutId ? 'Editar Entrenamiento' : 'Nuevo Entrenamiento') : 
             (isViewingAthlete ? 'Entrenamientos de Atleta' : 'Mis Entrenamientos')}
          </h1>
        </div>
        {!isAdding && (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin') && (
          <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-[#D4AF37] text-black p-2 rounded-xl"><Plus size={24} /></button>
        )}
      </header>`, uiNew);

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('Workouts updated');
