import React, { useState } from 'react';
import { Plus, Trash2, CalendarClock, CheckCircle2, Loader2, Save, Edit2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export const TrainingPlansTab = ({ 
  plans, 
  targetUserId, 
  isAdminOrTrainer, 
  trainerIdForLog, 
  onAddSessionForPlan,
  loading = false,
  workouts = [],
  onEditSession,
  onDeleteSession
}: { 
  plans: any[];
  workouts?: any[]; 
  targetUserId: string;
  isAdminOrTrainer: boolean;
  trainerIdForLog: string | null;
  onAddSessionForPlan: (planId: string, planTitle: string) => void;
  onEditSession?: (session: any) => void;
  onDeleteSession?: (sessionId: string) => void;
  loading?: boolean;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [generalObjective, setGeneralObjective] = useState('');
  const [specificObjectives, setSpecificObjectives] = useState<string[]>([]);
  const [newSpecificObjective, setNewSpecificObjective] = useState('');
  const [blocks, setBlocks] = useState<string[]>(['Adaptación', 'Desarrollo', 'Mantenimiento']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetSessionCount, setTargetSessionCount] = useState<number | ''>('');

  const resetForm = () => {
    setEditingPlanId(null);
    setShowForm(false);
    setTitle('');
    setGeneralObjective('');
    setSpecificObjectives([]);
    setNewSpecificObjective('');
    setStartDate('');
    setEndDate('');
    setTargetSessionCount('');
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
    setTargetSessionCount(plan.targetSessionCount || '');
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
          targetSessionCount: targetSessionCount ? Number(targetSessionCount) : null,
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
          targetSessionCount: targetSessionCount ? Number(targetSessionCount) : null,
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
  };

  const handleDelete = async (planId: string) => {
    if (!isAdminOrTrainer) return;
    if (!confirm('¿Eliminar este plan de entrenamiento?')) return;

    try {
      await deleteDoc(doc(db, 'trainingPlans', planId));
      alert('Planificación eliminada correctamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'trainingPlans');
    }
  };

  return (
    <div className="space-y-6">
      {isAdminOrTrainer && (
        <button 
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="w-full bg-zinc-900 border border-zinc-800 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:border-[#D4AF37]/50 transition-colors"
        >
          <Plus size={20} className="text-[#D4AF37]" /> {showForm ? 'Cancelar Planificación' : 'Crear Nueva Planificación'}
        </button>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSave}
            className="bg-zinc-900 p-6 rounded-2xl border border-[#D4AF37]/30 overflow-hidden"
          >
            <h2 className="text-[#D4AF37] font-bold mb-4 uppercase text-xs tracking-widest">{editingPlanId ? 'Editar Macro/Mesociclo' : 'Nuevo Macro/Mesociclo'}</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Título del Plan</label>
                <input 
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                  placeholder="Ej: Preparación Maratón, Fase Hipertrofia..." required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Objetivo General</label>
                <textarea 
                  value={generalObjective} onChange={e => setGeneralObjective(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none h-20 resize-none"
                  placeholder="Ej: Aumentar masa muscular 2kg, mejorar VO2 Max..." required
                />
              </div>

              <div className="space-y-2">
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
                      <div key={`obj-${i}`} className="bg-black border border-zinc-800 p-3 rounded-lg text-sm flex items-center justify-between gap-2">
                        <span className="text-zinc-300">{obj}</span>
                        <button type="button" onClick={() => setSpecificObjectives(specificObjectives.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 p-1 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Cantidad de Sesiones (Meta)</label>
                <input 
                  type="number" min="1" value={targetSessionCount} onChange={e => setTargetSessionCount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                  placeholder="Ej: 12"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Fecha Inicio</label>
                  <input 
                    type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Fecha Fin</label>
                  <input 
                    type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Bloques de Entrenamiento</label>
                <div className="flex flex-wrap gap-2">
                  {blocks.map((block, i) => (
                    <div key={`block-${block}-${i}`} className="bg-black border border-zinc-800 px-3 py-1 rounded-lg text-xs flex items-center gap-2">
                      {block}
                      <button type="button" onClick={() => setBlocks(blocks.filter((_, idx) => idx !== i))} className="text-red-500">×</button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => {
                      const b = prompt('Nombre del bloque:');
                      if (b) setBlocks([...blocks, b]);
                    }}
                    className="bg-zinc-800 px-3 py-1 rounded-lg text-xs font-bold"
                  >
                    + Añadir Bloque
                  </button>
                </div>
              </div>

              <button 
                disabled={saving}
                className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {editingPlanId ? 'Actualizar Planificación' : 'Crear Planificación'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {plans.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 italic">
              No hay planes de entrenamiento registrados
            </div>
          ) : (
            plans.map((item) => {
              // Automatically sum sessions either linked explicitly OR created in the same period
              const planSessions = (workouts || []).filter((w: any) => {
                if (w.planId === item.id) return true;
                if (item.startDate && item.endDate && w.date) {
                  return w.date >= item.startDate && w.date <= item.endDate;
                }
                return false;
              });
              const completedCount = planSessions.length;
              const targetCount = item.targetSessionCount || null;
              const progressPercentage = targetCount ? Math.min(100, Math.round((completedCount / targetCount) * 100)) : 0;

              return (
              <div key={item.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
                <div className="p-5 flex justify-between items-center bg-zinc-800/30 border-b border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37]">
                      <CalendarClock size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#D4AF37]">{item.title}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        {item.startDate ? `${new Date(item.startDate + 'T12:00:00').toLocaleDateString()} al ${new Date(item.endDate + 'T12:00:00').toLocaleDateString()}` : 'Sin fechas definidas'}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-full">
                          {completedCount} {targetCount ? `/ ${targetCount}` : ''} Sesiones
                        </span>
                        {targetCount && (
                          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${progressPercentage}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdminOrTrainer && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(item)} className="text-zinc-600 hover:text-[#D4AF37] transition-colors p-2">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">Objetivo General</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed">{item.generalObjective || item.objective}</p>
                  </div>

                  {item.specificObjectives && (
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
                  )}

                  {item.blocks && item.blocks.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Estructura de Bloques</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {item.blocks.map((block: string, i: number) => (
                          <div key={`plan-block-${block}-${i}`} className="flex items-center gap-3 bg-black/50 p-3 rounded-xl border border-zinc-800">
                            <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                              {i + 1}
                            </div>
                            <span className="text-sm font-medium">{block}</span>
                            <CheckCircle2 size={16} className="ml-auto text-zinc-700" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                  {planSessions.length > 0 && (
                    <div className="px-6 pb-2">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2">Sesiones Vinculadas ({planSessions.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {planSessions.map((session: any) => (
                          <div key={session.id} className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-zinc-800/50">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-300">{session.name}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(session.date + 'T12:00:00').toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {session.completed && <CheckCircle2 size={14} className="text-emerald-500 mr-2" />}
                              {isAdminOrTrainer && onEditSession && (
                                <button onClick={(e) => { e.stopPropagation(); onEditSession(session); }} className="p-1.5 text-zinc-500 hover:text-[#D4AF37] transition-colors"><Edit2 size={14} /></button>
                              )}
                              {isAdminOrTrainer && onDeleteSession && (
                                <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isAdminOrTrainer && (
                  <div className="pt-4 border-t border-zinc-800 bg-zinc-800/10 p-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSessionForPlan(item.id, item.title);
                      }}
                      className="w-full bg-[#D4AF37] text-black font-black hover:opacity-90 px-4 py-4 rounded-xl transition-all uppercase text-xs tracking-widest text-center"
                    >
                      Programar Sesión en este Plan
                    </button>
                  </div>
                )}
              </div>
            );
          })
          )}
        </div>
      )}
    </div>
  );
};
