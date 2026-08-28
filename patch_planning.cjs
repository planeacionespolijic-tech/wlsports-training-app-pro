const fs = require('fs');
let code = fs.readFileSync('src/screens/PlanningScreen.tsx', 'utf8');

const targetModel = `interface TrainingPlan {
  id: string;
  title: string;
  objective: string;
  blocks: string[];
  startDate: string;
  endDate: string;
  createdAt: any;
}`;

const newModel = `interface TrainingPlan {
  id: string;
  title: string;
  generalObjective: string;
  specificObjectives: string;
  blocks: string[];
  startDate: string;
  endDate: string;
  createdAt: any;
}`;

code = code.replace(targetModel, newModel);

const targetState = `  const [objective, setObjective] = useState('');`;
const newState = `  const [generalObjective, setGeneralObjective] = useState('');
  const [specificObjectives, setSpecificObjectives] = useState('');`;
code = code.replace(targetState, newState);

const targetHandleSave = `  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !objective || !targetUserId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'trainingPlans'), {
        userId: targetUserId,
        trainerId: trainerIdForLog,
        title,
        objective,
        blocks,
        startDate,
        endDate,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setTitle('');
      setObjective('');
      setStartDate('');
      setEndDate('');
      alert('Planificación creada con éxito');
    } catch (error) {`;

const newHandleSave = `  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !generalObjective || !targetUserId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'trainingPlans'), {
        userId: targetUserId,
        trainerId: trainerIdForLog,
        title,
        generalObjective,
        specificObjectives,
        blocks,
        startDate,
        endDate,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setTitle('');
      setGeneralObjective('');
      setSpecificObjectives('');
      setStartDate('');
      setEndDate('');
      alert('Planificación creada con éxito');
    } catch (error) {`;

code = code.replace(targetHandleSave, newHandleSave);

// Also need to patch the UI form inside PlanningScreen
fs.writeFileSync('src/screens/PlanningScreen.tsx', code);
console.log('patched model and state');
