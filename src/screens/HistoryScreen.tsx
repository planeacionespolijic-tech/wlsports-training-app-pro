import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export const HistoryScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, userProfile } = useAuth();
  
  const targetUserId = id || user?.uid || '';
  const trainerId = userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' ? user?.uid : (userProfile?.trainerId || null);

  const [history, setHistory] = useState<any[]>([]);
  const [availableWorkouts, setAvailableWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [customWorkoutName, setCustomWorkoutName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUserId) return;

    // Load History
    const qHistory = query(
      collection(db, 'history'),
      where('userId', '==', targetUserId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'history');
    });

    // Load Available Workouts for selection
    const loadWorkouts = async () => {
      const qWorkouts = query(
        collection(db, 'workouts'),
        where('userId', '==', targetUserId)
      );
      const snapshot = await getDocs(qWorkouts);
      setAvailableWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    loadWorkouts();

    return () => unsubscribeHistory();
  }, [targetUserId]);

  const handleAdd = async () => {
    if ((selectedWorkoutId || customWorkoutName) && date) {
      try {
        let workoutData = null;
        let name = customWorkoutName;

        if (selectedWorkoutId) {
          const selected = availableWorkouts.find(w => w.id === selectedWorkoutId);
          if (selected) {
            name = selected.name;
            workoutData = selected;
          }
        }

        await addDoc(collection(db, 'history'), {
          workoutName: name,
          workoutDetails: workoutData,
          date,
          userId: targetUserId,
          trainerId: trainerId,
          createdAt: serverTimestamp()
        });
        
        setCustomWorkoutName('');
        setSelectedWorkoutId('');
        setIsAdding(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'history');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar este registro del historial?')) {
      try {
        await deleteDoc(doc(db, 'history', id));
        alert('Registro eliminado correctamente');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'history');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (isAdding) {
                setIsAdding(false);
              } else {
                navigate(-1);
              }
            }} 
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Historial</h1>
        </div>
        {!isAdding && (userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' || targetUserId === user?.uid) && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[#D4AF37] text-black p-2 rounded-full hover:bg-[#B8962E] transition-colors"
          >
            <Plus size={24} />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {isAdding ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-4">
              <h2 className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest">Registrar Entrenamiento</h2>
              
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 ml-1">Seleccionar de mis rutinas</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none appearance-none"
                  value={selectedWorkoutId}
                  onChange={(e) => {
                    setSelectedWorkoutId(e.target.value);
                    if (e.target.value) setCustomWorkoutName('');
                  }}
                >
                  <option value="">-- Seleccionar rutina --</option>
                  {availableWorkouts.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink mx-4 text-zinc-600 text-xs uppercase">O</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-500 ml-1">Nombre personalizado</label>
                <input
                  type="text"
                  placeholder="Ej: Cardio en ayunas"
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none"
                  value={customWorkoutName}
                  onChange={(e) => {
                    setCustomWorkoutName(e.target.value);
                    if (e.target.value) setSelectedWorkoutId('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-500 ml-1">Fecha</label>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl focus:border-[#D4AF37] outline-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={handleAdd}
                className="flex-1 bg-[#D4AF37] text-black font-bold py-4 rounded-2xl shadow-lg shadow-[#D4AF37]/20"
              >
                Registrar
              </button>
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-2xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 italic">
                No hay registros en el historial
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-zinc-800 p-3 rounded-xl text-zinc-400">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold">{item.workoutName}</h3>
                        <p className="text-zinc-500 text-xs">{item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {(userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' || targetUserId === user?.uid) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      {item.workoutDetails?.blocks?.length > 0 && (
                        <div className="text-zinc-600">
                          {expandedId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      )}
                    </div>
                  </div>

                  {expandedId === item.id && item.workoutDetails?.blocks?.length > 0 && (
                    <div className="px-4 pb-4 border-t border-zinc-800 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-2 font-bold">Detalles de la sesión</h4>
                      <div className="space-y-3">
                        {item.workoutDetails.blocks.map((block: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <p className="text-xs font-bold text-zinc-400">{block.name}</p>
                            <div className="pl-2 border-l border-zinc-800 space-y-1">
                              {block.exercises?.map((ex: any, eIdx: number) => (
                                <div key={eIdx} className="flex justify-between text-[11px] text-zinc-500">
                                  <span>{ex.name}</span>
                                  <span>{ex.series} series {ex.reps ? `x ${ex.reps}` : ''}</span>
                                </div>
                              ))}
                              {block.circuit?.items?.map((item: any, iIdx: number) => (
                                <div key={iIdx} className="flex justify-between text-[11px] text-zinc-500">
                                  <span>{item.name}</span>
                                  <span>{item.time}s {item.reps ? `x ${item.reps}` : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
