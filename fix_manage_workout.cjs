const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const oldExecute = `  const executeQuickComplete = async (workout: any, athleteId: string) => {
    if (window.confirm(\`¿Marcar la rutina "\${workout.name}" como completada para el atleta seleccionado?\`)) {
      setLoading(true);
      try {
        const exercisesCount = workout.blocks?.reduce((acc: number, b: any) => acc + (b.exercises?.length || b.circuit?.items?.length || 0), 0) || 0;
        const xpGained = exercisesCount * 5 || 25; // standard 5 xp per exercise, fallback to 25

        await addDoc(collection(db, 'sessions'), {
          athleteId: athleteId,
          trainerId: trainerId || null,
          date: workout.date ? new Date(workout.date + "T12:00:00") : serverTimestamp(),
          createdAt: serverTimestamp(),
          exercisesCompleted: exercisesCount,
          xpGained: xpGained,
          isAscensionSession: false,
          approvedAscension: false,
          workoutName: workout.name || 'Entrenamiento',
          status: 'Realizada',
          notes: 'Completado rápido'
        });

        if (athleteId) {
          const userRef = doc(db, 'users', athleteId);
          await updateDoc(userRef, {
            xp: increment(xpGained),
            points: increment(xpGained),
            lastSessionDate: serverTimestamp()
          });
        }
        
        await deleteDoc(doc(db, 'workouts', workout.id));
        
        alert(\`Sesión "\${workout.name}" completada (+\${xpGained} XP).\`);
      } catch (error) {
        console.error("Error al completar rápido", error);
        alert('Error al guardar la sesión.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleQuickComplete = async (workout: any) => {
    if (!isViewingAthlete && (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin')) {
      setSelectedWorkoutForSession(workout);
      setAthletePickerAction('quick-complete');
      setShowAthletePicker(true);
      return;
    }
    
    executeQuickComplete(workout, targetUserId);
  };`;

const newExecute = `  // Manage Session State
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageSessionData, setManageSessionData] = useState<{workout: any, athleteId: string} | null>(null);
  const [manageStatus, setManageStatus] = useState<'Realizada' | 'No realizada'>('Realizada');
  const [manageNotes, setManageNotes] = useState('');

  const executeManageSession = async () => {
    if (!manageSessionData) return;
    const { workout, athleteId } = manageSessionData;
    
    setLoading(true);
    try {
      const exercisesCount = workout.blocks?.reduce((acc: number, b: any) => acc + (b.exercises?.length || b.circuit?.items?.length || 0), 0) || 0;
      const xpGained = manageStatus === 'Realizada' ? (exercisesCount * 5 || 25) : 0;

      await addDoc(collection(db, 'sessions'), {
        athleteId: athleteId,
        trainerId: trainerId || null,
        date: workout.date ? new Date(workout.date + "T12:00:00") : serverTimestamp(),
        createdAt: serverTimestamp(),
        exercisesCompleted: manageStatus === 'Realizada' ? exercisesCount : 0,
        xpGained: xpGained,
        isAscensionSession: false,
        approvedAscension: false,
        workoutName: workout.name || 'Entrenamiento',
        status: manageStatus,
        notes: manageNotes || (manageStatus === 'Realizada' ? 'Completada' : 'Sin novedad registrada')
      });

      if (athleteId && manageStatus === 'Realizada') {
        const userRef = doc(db, 'users', athleteId);
        await updateDoc(userRef, {
          xp: increment(xpGained),
          points: increment(xpGained),
          lastSessionDate: serverTimestamp()
        });
      }
      
      await deleteDoc(doc(db, 'workouts', workout.id));
      
      alert(\`Sesión "\${workout.name}" registrada como \${manageStatus}.\`);
    } catch (error) {
      console.error("Error al gestionar la sesión", error);
      alert('Error al guardar la sesión.');
    } finally {
      setLoading(false);
      setShowManageModal(false);
    }
  };

  const handleOpenManage = (workout: any) => {
    if (!isViewingAthlete && (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin')) {
      setSelectedWorkoutForSession(workout);
      setAthletePickerAction('manage');
      setShowAthletePicker(true);
      return;
    }
    setManageSessionData({ workout, athleteId: targetUserId });
    setManageStatus('Realizada');
    setManageNotes('');
    setShowManageModal(true);
  };`;

if(code.includes(oldExecute)) {
  code = code.replace(oldExecute, newExecute);
  
  // Also fix handlePickAthleteAndStart
  const oldPick = `  const handlePickAthleteAndStart = (athleteId: string) => {
    if (!selectedWorkoutForSession) return;
    setShowAthletePicker(false);
    if (athletePickerAction === 'start') {
      navigate(\`/ejecucion-sesion\`, { state: { ...selectedWorkoutForSession, athleteId } });
    } else {
      executeQuickComplete(selectedWorkoutForSession, athleteId);
    }
  };`;

  const newPick = `  const handlePickAthleteAndStart = (athleteId: string) => {
    if (!selectedWorkoutForSession) return;
    setShowAthletePicker(false);
    if (athletePickerAction === 'start') {
      navigate(\`/ejecucion-sesion\`, { state: { ...selectedWorkoutForSession, athleteId } });
    } else if (athletePickerAction === 'manage') {
      setManageSessionData({ workout: selectedWorkoutForSession, athleteId });
      setManageStatus('Realizada');
      setManageNotes('');
      setShowManageModal(true);
    }
  };`;
  
  code = code.replace(oldPick, newPick);
  
  // Also fix handleQuickComplete call in JSX
  code = code.replace(/handleQuickComplete\(item\)/g, 'handleOpenManage(item)');
  
  fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
  console.log("Replaced quick complete logic in WorkoutsScreen");
} else {
  console.log("oldExecute not found");
}
