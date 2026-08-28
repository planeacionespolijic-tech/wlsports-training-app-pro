const fs = require('fs');
let code = fs.readFileSync('src/components/TrainingPlansTab.tsx', 'utf8');

// Imports
code = code.replace(
  "import { Plus, Trash2, CalendarClock, CheckCircle2, Loader2, Save } from 'lucide-react';",
  "import { Plus, Trash2, CalendarClock, CheckCircle2, Loader2, Save, Edit2 } from 'lucide-react';"
);

code = code.replace(
  "import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';",
  "import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';"
);

// State
code = code.replace(
  "const [saving, setSaving] = useState(false);",
  "const [saving, setSaving] = useState(false);\n  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);"
);

// Save handler replacement
const saveHandlerOld = `  const handleSave = async (e: React.FormEvent) => {
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
      setSpecificObjectives([]);
      setNewSpecificObjective('');
      setStartDate('');
      setEndDate('');
      alert('Planificación creada con éxito');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trainingPlans');
    } finally {
      setSaving(false);
    }
  };`;

const saveHandlerNew = `  const resetForm = () => {
    setEditingPlanId(null);
    setShowForm(false);
    setTitle('');
    setGeneralObjective('');
    setSpecificObjectives([]);
    setNewSpecificObjective('');
    setStartDate('');
    setEndDate('');
    setBlocks(['Adaptación', 'Desarrollo', 'Mantenimiento']);
  };

  const handleEdit = (plan: any) => {
    setEditingPlanId(plan.id);
    setTitle(plan.title || '');
    setGeneralObjective(plan.generalObjective || plan.objective || '');
    setSpecificObjectives(Array.isArray(plan.specificObjectives) ? plan.specificObjectives : (plan.specificObjectives ? [plan.specificObjectives] : []));
    setNewSpecificObjective('');
    setBlocks(plan.blocks || []);
    setStartDate(plan.startDate || '');
    setEndDate(plan.endDate || '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !generalObjective || !targetUserId) return;

    setSaving(true);
    try {
      if (editingPlanId) {
        await updateDoc(doc(db, 'trainingPlans', editingPlanId), {
          title,
          generalObjective,
          specificObjectives,
          blocks,
          startDate,
          endDate,
          updatedAt: serverTimestamp(),
        });
        alert('Planificación actualizada con éxito');
      } else {
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
        alert('Planificación creada con éxito');
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingPlanId ? OperationType.UPDATE : OperationType.CREATE, 'trainingPlans');
    } finally {
      setSaving(false);
    }
  };`;

code = code.replace(saveHandlerOld, saveHandlerNew);

// Form button
code = code.replace(
  "onClick={() => setShowForm(!showForm)}",
  "onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}"
);

code = code.replace(
  "<h2 className=\"text-[#D4AF37] font-bold mb-4 uppercase text-xs tracking-widest\">Nuevo Macro/Mesociclo</h2>",
  "<h2 className=\"text-[#D4AF37] font-bold mb-4 uppercase text-xs tracking-widest\">{editingPlanId ? 'Editar Macro/Mesociclo' : 'Nuevo Macro/Mesociclo'}</h2>"
);

code = code.replace(
  "{saving ? <Loader2 className=\"animate-spin\" size={20} /> : <Save size={20} />}\n                Crear Planificación",
  "{saving ? <Loader2 className=\"animate-spin\" size={20} /> : <Save size={20} />}\n                {editingPlanId ? 'Actualizar Planificación' : 'Crear Planificación'}"
);

// Actions in card
const cardActionsOld = `                  {isAdminOrTrainer && (
                    <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}`;

const cardActionsNew = `                  {isAdminOrTrainer && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(item)} className="text-zinc-600 hover:text-[#D4AF37] transition-colors p-2">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}`;

code = code.replace(cardActionsOld, cardActionsNew);

fs.writeFileSync('src/components/TrainingPlansTab.tsx', code);
console.log('patched editing capability');
