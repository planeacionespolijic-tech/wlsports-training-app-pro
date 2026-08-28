const fs = require('fs');
let code = fs.readFileSync('src/screens/PlanningScreen.tsx', 'utf8');

const target = `  const handleSave = async (e: React.FormEvent) => {
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

const newCode = `  const handleSave = async (e: React.FormEvent) => {
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

code = code.replace(target, newCode);
fs.writeFileSync('src/screens/PlanningScreen.tsx', code);
console.log('patched handleSave');
