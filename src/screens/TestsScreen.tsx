import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Plus, Save, Loader2, Trash2, Activity, Zap, 
  Target, TrendingUp, ChevronRight, Info, Search, 
  Sparkles, BarChart3, X, BookOpen, UserPlus, Filter, History,
  Layers, Brain, ClipboardCheck, Microscope, Award
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { TESTS_LIBRARY, BaseTest } from '../constants/testsLibrary';

interface TestsScreenProps {
  onBack: () => void;
  userId: string;
  isAdmin: boolean;
  trainerId: string | null;
}

interface TestResult {
  id: string;
  userId: string;
  trainerId?: string;
  type: 'physical' | 'technical' | 'custom';
  name: string;
  value: number;
  unit: string;
  notes?: string;
  category: string;
  objective?: string;
  suggestedRange?: string;
  createdAt: any;
}

interface TestBattery {
  id: string;
  name: string;
  description: string;
  testIds: string[];
  trainerId: string;
  createdAt: any;
}

export const TestsScreen = ({ 
  onBack: propOnBack, 
  userId: propUserId, 
  isAdmin: propIsAdmin, 
  trainerId: propTrainerId 
}: Partial<TestsScreenProps>) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, isTrainer: authIsTrainer } = useAuth();
  
  // Context determination
  const state = location.state as any;
  const userId = propUserId || state?.id || state?.userId || user?.uid || '';
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : (authIsTrainer || userProfile?.role === 'superadmin');
  const trainerId = propTrainerId || state?.trainerId || (authIsTrainer ? user?.uid : userProfile?.trainerId) || null;
  const onBack = propOnBack || (() => navigate(-1));

  const [tests, setTests] = useState<TestResult[]>([]);
  const [batteries, setBatteries] = useState<TestBattery[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'history' | 'library' | 'form' | 'batteries' | 'analysis'>('history');
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Form state
  const [selectedBaseTest, setSelectedBaseTest] = useState<BaseTest | null>(null);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<string>('Potencia');
  const [customDescription, setCustomDescription] = useState('');
  const [customRange, setCustomRange] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Battery Creation State
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [isCreatingBattery, setIsCreatingBattery] = useState(false);
  const [batteryName, setBatteryName] = useState('');
  const [batteryDesc, setBatteryDesc] = useState('');

  useEffect(() => {
    if (!userId || !user?.uid) return;

    const fetchUserData = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          setUserData(snap.data());
        }
      } catch (error) {
        console.error("Error fetching user data", error);
      }
    };
    fetchUserData();

    const qTests = query(
      collection(db, 'tests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeTests = onSnapshot(qTests, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestResult[];
      setTests(data);
      setLoading(false);
    }, (error) => {
      console.error("Snapshot error (tests):", error);
      handleFirestoreError(error, OperationType.LIST, 'tests');
    });

    const qBatteries = query(
      collection(db, 'testBatteries'),
      where('trainerId', '==', user.uid)
    );

    const unsubscribeBatteries = onSnapshot(qBatteries, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestBattery[];
      // Sort in memory to avoid index requirements
      const sorted = [...data].sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setBatteries(sorted);
    }, (error) => {
      console.error("Snapshot error (testBatteries):", error);
      handleFirestoreError(error, OperationType.LIST, 'testBatteries');
    });

    return () => {
      unsubscribeTests();
      unsubscribeBatteries();
    };
  }, [userId, user?.uid]);

  const resetForm = () => {
    setSelectedBaseTest(null);
    setCustomName('');
    setCustomDescription('');
    setCustomRange('');
    setValue('');
    setUnit('');
    setNotes('');
    setIsCreatingCustom(false);
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = isCreatingCustom ? customName : selectedBaseTest?.name;
    const finalCategory = isCreatingCustom ? customCategory : selectedBaseTest?.category;
    const finalUnit = isCreatingCustom ? unit : (selectedBaseTest?.unit || unit);

    if (!finalName || !value) return;

    setSaving(true);
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        alert('Por favor ingrese un valor numérico válido.');
        setSaving(false);
        return;
      }
      await addDoc(collection(db, 'tests'), {
        userId,
        trainerId,
        type: isCreatingCustom ? 'custom' : (selectedBaseTest?.category === 'Técnica Fútbol' ? 'technical' : 'physical'),
        name: finalName,
        category: finalCategory,
        value: numValue,
        unit: finalUnit,
        notes,
        objective: isCreatingCustom ? customDescription : selectedBaseTest?.objective,
        suggestedRange: isCreatingCustom ? customRange : selectedBaseTest?.suggestedRange,
        createdAt: serverTimestamp(),
      });
      setView('history');
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tests');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBattery = async () => {
    if (!batteryName || selectedTestIds.length === 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'testBatteries'), {
        trainerId: user?.uid,
        name: batteryName,
        description: batteryDesc,
        testIds: selectedTestIds,
        createdAt: serverTimestamp(),
      });
      setIsCreatingBattery(false);
      setBatteryName('');
      setBatteryDesc('');
      setSelectedTestIds([]);
      setView('batteries');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTestSelection = (id: string) => {
    setSelectedTestIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const getAnalysisInsight = () => {
    if (tests.length === 0) return "No hay datos suficientes para el análisis.";
    
    // Simple logic to find strengths and weaknesses
    const latestByCategory: Record<string, TestResult> = {};
    tests.forEach(t => {
      if (!latestByCategory[t.category]) {
        latestByCategory[t.category] = t;
      }
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(latestByCategory).map(([cat, test]) => (
            <div key={cat} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-black uppercase text-zinc-500">{cat}</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-[#D4AF37]">{test.value}</span>
                <span className="text-[10px] text-zinc-600 font-bold">{test.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-zinc-900 rounded-2xl border-l-4 border-[#D4AF37]">
          <h4 className="text-[10px] font-black uppercase text-[#D4AF37] mb-1">Inspección Pro</h4>
          <p className="text-xs text-zinc-400 italic leading-relaxed">
            El perfil sugiere un enfoque en {Object.keys(latestByCategory).length > 2 ? 'la consolidación de capacidades mixtas.' : 'el desarrollo base.'} 
            Se recomienda aumentar el volumen de evaluación técnica para correlacionar con los datos físicos actuales.
          </p>
        </div>
      </div>
    );
  };

  const handleDelete = async (id: string, testTrainerId?: string) => {
    const isOwner = userId === user?.uid;
    const isOriginTrainer = testTrainerId === user?.uid;
    
    if (!isAdmin && !isOwner && !isOriginTrainer) return;

    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro de prueba de forma permanente? Esta acción no se puede deshacer.')) return;
    
    try {
      await deleteDoc(doc(db, 'tests', id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error al eliminar la prueba. Verifique sus permisos.");
      handleFirestoreError(error, OperationType.DELETE, 'tests');
    }
  };

  const getPreviousResult = (name: string, currentIndex: number) => {
    return tests.slice(currentIndex + 1).find(t => t.name === name);
  };

  const categories = ['All', 'Potencia', 'Fuerza', 'Resistencia', 'Movilidad', 'Equilibrio', 'Velocidad', 'Recuperación', 'Funcionalidad', 'Técnica Fútbol'];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Potencia': return 'text-orange-500 bg-orange-500/10';
      case 'Fuerza': return 'text-red-500 bg-red-500/10';
      case 'Resistencia': return 'text-blue-500 bg-blue-500/10';
      case 'Movilidad': return 'text-emerald-500 bg-emerald-500/10';
      case 'Técnica Fútbol': return 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20';
      default: return 'text-zinc-500 bg-zinc-500/10';
    }
  };

  const filteredLibrary = TESTS_LIBRARY.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          test.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || test.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Biblioteca de Pruebas</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Gestión de Rendimiento Manual</p>
          </div>
        </div>
      </header>

      {/* View Switcher */}
      <div className="flex overflow-x-auto p-2 bg-zinc-900 mx-4 mt-4 rounded-2xl border border-zinc-800 no-scrollbar gap-2">
        <button 
          onClick={() => setView('history')}
          className={`flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${view === 'history' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <History size={12} /> Historial
        </button>
        <button 
          onClick={() => setView('library')}
          className={`flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${view === 'library' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <BookOpen size={12} /> Biblioteca
        </button>
        <button 
          onClick={() => setView('batteries')}
          className={`flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${view === 'batteries' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Layers size={12} /> Baterías
        </button>
        <button 
          onClick={() => setView('analysis')}
          className={`flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${view === 'analysis' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <BarChart3 size={12} /> Análisis
        </button>
      </div>

      <main className="flex-1 p-4 overflow-y-auto space-y-6 pb-24">
        <AnimatePresence mode="wait">
          {view === 'analysis' && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] mb-4">
                  <Microscope size={32} />
                </div>
                <h2 className="text-lg font-black uppercase tracking-tighter">Perífil de Rendimiento</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Análisis Sports Science v1.0</p>
              </div>

              {getAnalysisInsight()}

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Desglose de Calidad</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800">
                    <Brain className="text-[#D4AF37] mb-2" size={20} />
                    <h5 className="text-[10px] font-black uppercase text-white">Cognitivo</h5>
                    <p className="text-[8px] text-zinc-500 font-bold leading-tight mt-1">Capacidad de escaneo y toma de decisión en juego.</p>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800">
                    <Target className="text-blue-500 mb-2" size={20} />
                    <h5 className="text-[10px] font-black uppercase text-white">Precisión</h5>
                    <p className="text-[8px] text-zinc-500 font-bold leading-tight mt-1">Eficacia en pase, dominio y finalización bajo presión.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'batteries' && (
            <motion.div 
              key="batteries"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Baterías del Coach</h2>
                <button 
                  onClick={() => {
                    setIsCreatingBattery(true);
                    setView('library');
                  }}
                  className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Plus size={14} /> Nueva Batería
                </button>
              </div>

              {batteries.length === 0 ? (
                <div className="py-20 text-center bg-zinc-900/50 rounded-[2rem] border border-dashed border-zinc-800">
                  <Layers className="mx-auto text-zinc-800 mb-4" size={40} />
                  <p className="text-zinc-600 text-sm italic">No hay baterías personalizadas creadas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {batteries.map(battery => (
                    <div key={battery.id} className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 hover:border-[#D4AF37]/40 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-[#D4AF37] transition-colors">{battery.name}</h3>
                        <span className="text-[8px] font-black bg-white/5 px-2 py-0.5 rounded text-zinc-500 uppercase">
                          {battery.testIds.length} PRUEBAS
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 italic mb-4">{battery.description || 'Sin descripción.'}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {battery.testIds.slice(0, 3).map(id => {
                          const t = TESTS_LIBRARY.find(bt => bt.id === id);
                          return t ? (
                            <span key={id} className="text-[8px] font-black uppercase tracking-widest bg-black px-2 py-1 rounded-lg text-zinc-400 border border-zinc-800">
                              {t.name}
                            </span>
                          ) : null;
                        })}
                        {battery.testIds.length > 3 && (
                          <span className="text-[8px] font-black text-zinc-600">+{battery.testIds.length - 3} más</span>
                        )}
                      </div>
                      <button className="w-full bg-zinc-800 hover:bg-[#D4AF37] hover:text-black transition-all py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest">
                        Cargar Batería para Evaluar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'library' && (
            <motion.div 
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Search & Filter */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar prueba por nombre o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#D4AF37] transition-all text-sm font-medium"
                  />
                </div>
                
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${activeCategory === cat ? 'bg-white border-white text-black' : 'bg-black border-zinc-800 text-zinc-500'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Create Custom Button */}
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsCreatingCustom(true);
                    setView('form');
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-800 border-dashed py-4 rounded-2xl flex items-center justify-center gap-3 text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all group"
                >
                  <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Crear Prueba</span>
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setIsCreatingBattery(!isCreatingBattery);
                      setSelectedTestIds([]);
                    }}
                    className={`px-6 rounded-2xl flex items-center justify-center transition-all ${isCreatingBattery ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/30' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
                  >
                    <Layers size={20} />
                  </button>
                )}
              </div>

              {isCreatingBattery && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-zinc-900 p-6 rounded-3xl border border-[#D4AF37]/30 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase text-[#D4AF37]">Modo: Creando Batería</h3>
                    <span className="text-[10px] font-black text-white">{selectedTestIds.length} seleccionadas</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Nombre de la batería (ej: Pre-Temporada)" 
                    value={batteryName}
                    onChange={e => setBatteryName(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs outline-none focus:border-[#D4AF37]"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveBattery}
                      disabled={saving || !batteryName || selectedTestIds.length === 0}
                      className="flex-1 bg-[#D4AF37] text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                    >
                      {saving ? <Loader2 className="animate-spin" size={14} /> : 'Guardar Batería'}
                    </button>
                    <button 
                      onClick={() => setIsCreatingBattery(false)}
                      className="px-6 bg-zinc-800 text-zinc-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Library Grid */}
              <div className="grid grid-cols-1 gap-4">
                {filteredLibrary.map(test => (
                  <motion.div 
                    layout
                    key={test.id}
                    className={`bg-zinc-900 border transition-all group overflow-hidden ${isCreatingBattery && selectedTestIds.includes(test.id) ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]' : 'border-zinc-800 hover:border-[#D4AF37]/30'} rounded-[2.5rem] p-6`}
                    onClick={() => isCreatingBattery && toggleTestSelection(test.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border ${getCategoryColor(test.category)}`}>
                          {test.category}
                        </span>
                        <h3 className="text-lg font-black uppercase tracking-tight group-hover:text-[#D4AF37] transition-colors">{test.name}</h3>
                      </div>
                      {!isCreatingBattery ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBaseTest(test);
                            setUnit(test.unit);
                            setView('form');
                          }}
                          className="bg-[#D4AF37] text-black p-2.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/10"
                        >
                          <Plus size={18} />
                        </button>
                      ) : (
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedTestIds.includes(test.id) ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-zinc-800 text-transparent'}`}>
                          <ClipboardCheck size={16} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="bg-black/30 p-4 rounded-2xl border border-zinc-800/50">
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-medium italic">
                          "{test.objective}"
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold">
                          <Zap size={12} className="text-[#D4AF37]" />
                          <span>{test.unit}</span>
                        </div>
                        {test.suggestedRange && (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#D4AF37] font-bold">
                            <Award size={12} />
                            <span>{test.suggestedRange}</span>
                          </div>
                        )}
                      </div>

                      {(test.protocol || test.proTip) && (
                        <div className="pt-4 border-t border-zinc-800/50 space-y-3">
                          {test.protocol && (
                            <div className="bg-black/20 p-3 rounded-xl">
                              <h4 className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                                <ClipboardCheck size={10} /> Protocolo Pro
                              </h4>
                              <p className="text-[10px] text-zinc-500 leading-tight">{test.protocol}</p>
                            </div>
                          )}
                          {test.proTip && (
                            <div className="bg-[#D4AF37]/5 p-3 rounded-xl border border-[#D4AF37]/10">
                              <h4 className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest mb-1 flex items-center gap-1">
                                <Microscope size={10} /> Sports Scientist Tip
                              </h4>
                              <p className="text-[10px] text-[#D4AF37]/70 leading-tight italic">"{test.proTip}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {filteredLibrary.length === 0 && (
                  <div className="py-12 text-center">
                    <Activity size={40} className="mx-auto text-zinc-800 mb-4" />
                    <p className="text-zinc-600 text-sm italic">No se encontraron pruebas en esta categoría.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => { setView('library'); resetForm(); }} className="text-zinc-500">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-black uppercase tracking-tight text-[#D4AF37]">
                  {isCreatingCustom ? 'Nueva Prueba' : selectedBaseTest?.name}
                </h2>
              </div>

              <form onSubmit={handleSaveResult} className="space-y-6 bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
                {isCreatingCustom ? (
                  <div className="space-y-4">
                    <input 
                      type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none text-sm font-bold"
                      placeholder="Nombre de la prueba" required
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {categories.filter(c => c !== 'All').map(cat => (
                        <button
                          key={cat} type="button"
                          onClick={() => setCustomCategory(cat)}
                          className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${customCategory === cat ? 'bg-white text-black' : 'bg-black text-zinc-600 border border-zinc-800'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <textarea 
                      value={customDescription} onChange={e => setCustomDescription(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none h-20 resize-none text-xs"
                      placeholder="Breve descripción del objetivo..."
                    />
                    <input 
                      type="text" value={customRange} onChange={e => setCustomRange(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none text-xs"
                      placeholder="Rango sugerido (opcional)"
                    />
                  </div>
                ) : (
                  <div className="bg-black/50 p-4 rounded-3xl space-y-2 mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${getCategoryColor(selectedBaseTest?.category || '')}`}>
                      {selectedBaseTest?.category}
                    </span>
                    <p className="text-xs text-zinc-400 font-medium italic">"{selectedBaseTest?.objective}"</p>
                    {selectedBaseTest?.suggestedRange && (
                      <div className="flex items-center gap-2 mt-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
                        <TrendingUp size={12} className="text-[#D4AF37]" />
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Comp. Sugerida: {selectedBaseTest.suggestedRange}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Resultado</label>
                    <input 
                      type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none text-2xl font-black text-[#D4AF37]"
                      placeholder="0.00" required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Unidad</label>
                    <input 
                      type="text" value={unit} onChange={e => setUnit(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none text-sm font-bold text-zinc-400"
                      placeholder="Ej: kg, cm, m/s"
                      disabled={!isCreatingCustom && !!selectedBaseTest}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Notas de la sesión</label>
                  <textarea 
                    value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-[#D4AF37] outline-none h-24 resize-none text-xs leading-relaxed"
                    placeholder="Condiciones específicas, clima, fatiga percibida..."
                  />
                </div>

                <button 
                  disabled={saving || (!isCreatingCustom && !selectedBaseTest) || (isCreatingCustom && !customName)}
                  className="w-full bg-[#D4AF37] text-black font-black uppercase tracking-widest py-5 rounded-2xl mt-4 flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-30 shadow-lg"
                >
                  {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                  Guardar en Historial
                </button>
              </form>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Registro de Evolución</h2>
                <div className="flex items-center gap-2 text-zinc-600">
                  <BarChart3 size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{tests.length} Resultados</span>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
                </div>
              ) : tests.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 border-dashed py-20 rounded-[2.5rem] text-center px-6">
                  <Activity size={40} className="mx-auto text-zinc-800 mb-4" />
                  <p className="text-zinc-500 text-sm italic mb-6">Aún no hay registros de rendimiento.</p>
                  <button 
                    onClick={() => setView('library')}
                    className="bg-[#D4AF37] text-black px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest"
                  >
                    Explorar Biblioteca para empezar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tests.map((item, index) => {
                    const prevResult = getPreviousResult(item.name, index);
                    const variation = prevResult 
                      ? (((item.value - prevResult.value) / prevResult.value) * 100).toFixed(1)
                      : null;

                    return (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900 rounded-[2rem] border border-zinc-800 overflow-hidden"
                      >
                        <div className="p-5 bg-white/[0.01] flex justify-between items-center group">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#D4AF37] rounded-full" />
                            <div>
                              <h3 className="text-sm font-black uppercase tracking-tight">{item.name}</h3>
                              <div className="flex items-center gap-2">
                                <p className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${getCategoryColor(item.category)}`}>
                                  {item.category}
                                </p>
                                <span className="text-zinc-700">|</span>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase">
                                  {item.createdAt?.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </div>
                          {(isAdmin || userId === user?.uid) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id, item.trainerId);
                              }} 
                              className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-95"
                              title="Borrar Registro"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <div className="p-5 pt-0 flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-white">{item.value}</span>
                            <span className="text-xs font-bold text-zinc-600 uppercase">{item.unit}</span>
                          </div>
                          {variation && (
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TrendingUp 
                                  size={12} 
                                  className={parseFloat(variation) >= 0 ? 'text-emerald-500' : 'text-rose-500 rotate-180'} 
                                />
                                <span className={`text-[10px] font-black ${parseFloat(variation) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {parseFloat(variation) > 0 ? '+' : ''}{variation}%
                                </span>
                              </div>
                              <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Evolución</p>
                            </div>
                          )}
                        </div>
                          <div className="mx-5 mb-5 p-3 bg-black/40 rounded-xl border border-zinc-800/50 space-y-2">
                            {item.objective && (
                              <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                                "{item.objective}"
                              </p>
                            )}
                            {item.suggestedRange && (
                              <div className="flex items-center gap-1.5 text-[9px] text-[#D4AF37]/70 font-black uppercase tracking-wider">
                                <TrendingUp size={10} />
                                <span>Ref: {item.suggestedRange}</span>
                              </div>
                            )}
                            {item.notes && (
                              <p className="text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-800/50 pt-2">
                                {item.notes}
                              </p>
                            )}
                          </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button (Always available to quick add from history) */}
      {view === 'history' && !loading && (
        <div className="fixed bottom-6 right-6">
          <button 
            onClick={() => setView('library')}
            className="w-14 h-14 bg-[#D4AF37] text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
          >
            <Plus size={32} />
          </button>
        </div>
      )}
    </div>
  );
};
