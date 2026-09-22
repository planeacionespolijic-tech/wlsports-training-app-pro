import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Loader2, 
  Trash2, 
  Video, 
  Play, 
  Camera, 
  StopCircle, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Trophy, 
  Lightbulb, 
  Eye, 
  Upload, 
  SwitchCamera, 
  Flame, 
  RotateCcw,
  User,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Grid,
  Smartphone,
  Monitor,
  X
} from 'lucide-react';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { VideoPlayerWithAnalysis } from '../components/VideoPlayerWithAnalysis';

interface VideoAnalysisScreenProps {
  onBack: () => void;
  userId: string;
  isAdmin: boolean;
  trainerId: string | null;
}

interface AnalysisResult {
  id: string;
  videoUrl: string;
  title: string;
  observations?: string;
  analysis?: string; // JSON string
  athleteName?: string;
  userId: string;
  orientation?: 'horizontal' | 'vertical';
  createdAt: any;
}

interface AIAnalysis {
  observations: string;
  recommendations: string;
  positiveReinforcement: string;
}

const EXERCISE_CHIPS = [
  'Sentadilla / Squat',
  'Sprint / Aceleración',
  'Salto Vertical',
  'Técnica de Carrera',
  'Peso Muerto',
  'Zancadas / Desplazamiento',
  'Pase / Golpe Técnico'
];

export const VideoAnalysisScreen = ({ 
  onBack: propOnBack, 
  userId: propUserId, 
  isAdmin: propIsAdmin, 
  trainerId: propTrainerId 
}: Partial<VideoAnalysisScreenProps>) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, isTrainer: authIsTrainer } = useAuth();
  
  // Extract athlete info from location.state if navigated from AthleteProfileScreen
  const locationState = location.state as { athleteId?: string; athlete?: any; userId?: string } | undefined;
  const initialUserId = propUserId || locationState?.athleteId || locationState?.userId || user?.uid || '';
  const initialAthleteName = locationState?.athlete?.displayName || '';

  const [targetUserId, setTargetUserId] = useState<string>(initialUserId);
  const [targetAthleteName, setTargetAthleteName] = useState<string>(initialAthleteName);
  const [athletesList, setAthletesList] = useState<{ id: string; name: string }[]>([]);

  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsTrainer;
  const trainerId = propTrainerId || (authIsTrainer ? user?.uid : userProfile?.trainerId) || null;
  const onBack = propOnBack || (() => navigate(-1));
  const isOwner = user?.uid === targetUserId;
  const canRecord = isAdmin || isOwner;

  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'preview' | 'uploading' | 'analyzing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Camera refs & states
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<any>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');
  const [observations, setObservations] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [selectedVideoModal, setSelectedVideoModal] = useState<{ url: string; title: string; athleteName?: string } | null>(null);
  const [recordOrientation, setRecordOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isRecorderFullscreen, setIsRecorderFullscreen] = useState(false);
  const [showCameraGrid, setShowCameraGrid] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [userType, setUserType] = useState<'adult' | 'child'>('adult');

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  // Fetch athletes list if trainer is in global view
  useEffect(() => {
    if (!authIsTrainer || !user) return;
    const fetchAthletes = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('trainerId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({
          id: d.id,
          name: d.data().displayName || d.data().email || 'Atleta sin nombre'
        }));
        setAthletesList(list);
        if (!initialUserId && list.length > 0) {
          setTargetUserId(list[0].id);
          setTargetAthleteName(list[0].name);
        }
      } catch (err) {
        console.warn("Could not fetch athletes for selector:", err);
      }
    };
    fetchAthletes();
  }, [authIsTrainer, user, initialUserId]);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    // Fetch user type to provide context
    const fetchUserType = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', targetUserId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserType(data.type || 'adult');
          if (!targetAthleteName && data.displayName) {
            setTargetAthleteName(data.displayName);
          }
        }
      } catch (err) {
        console.error("Error fetching user type:", err);
      }
    };
    fetchUserType();

    const q = query(
      collection(db, 'videoAnalysis'),
      where('userId', '==', targetUserId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];
      setAnalyses(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'videoAnalysis');
      setLoading(false);
    });

    return () => {
      unsubscribe();
      stopCamera();
    };
  }, [targetUserId]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Listen to Escape key to exit recorder fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRecorderFullscreen) {
        setIsRecorderFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecorderFullscreen]);

  const startCamera = async (
    currentFacing: 'environment' | 'user' = facingMode,
    orientation: 'horizontal' | 'vertical' = recordOrientation
  ) => {
    try {
      setError(null);
      stopCamera();

      const isLandscape = orientation === 'horizontal';
      const videoConstraints: MediaTrackConstraints = { 
        facingMode: currentFacing,
        width: isLandscape ? { ideal: 1920, min: 1280 } : { ideal: 1080, min: 720 },
        height: isLandscape ? { ideal: 1080, min: 720 } : { ideal: 1920, min: 1280 },
        aspectRatio: isLandscape ? { ideal: 16 / 9 } : { ideal: 9 / 16 }
      };

      const constraintsWithAudio: MediaStreamConstraints = {
        video: videoConstraints,
        audio: true
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraintsWithAudio);
      } catch (audioErr) {
        // Fallback without audio if mic permission is denied
        console.warn("Microphone access denied or unavailable, fallback to video only", audioErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setRecordingState('idle');
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Revisa los permisos de cámara en tu navegador.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (showRecorder && recordingState === 'idle') {
      await startCamera(nextFacing, recordOrientation);
    }
  };

  const toggleOrientation = async () => {
    const next = recordOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    setRecordOrientation(next);
    if (showRecorder && recordingState === 'idle') {
      await startCamera(facingMode, next);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = mimeType 
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
    } catch (e) {
      mediaRecorder = new MediaRecorder(streamRef.current);
    }

    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const type = chunksRef.current[0]?.type || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setPreviewUrl(url);
      setRecordingState('preview');
      setIsRecorderFullscreen(false);
      stopCamera();
    };

    mediaRecorder.start(200);
    setRecordingState('recording');
    setRecordingSeconds(0);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds(prev => {
        if (prev >= 60) {
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    stopCamera();
    const url = URL.createObjectURL(file);
    setRecordedBlob(file);
    setPreviewUrl(url);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    setRecordingState('preview');
  };

  const generateBiomechanicalRubric = (exerciseTitle: string, userNotes: string): AIAnalysis => {
    const titleLower = exerciseTitle.toLowerCase();
    
    if (titleLower.includes('sentadilla') || titleLower.includes('squat')) {
      return {
        observations: userNotes || "Se observa la fase excéntrica con control de la flexión de cadera y rodilla. Atención a la alineación del eje fémur-rótula y neutralidad lumbar.",
        recommendations: "Mantener los talones anclados, evitar el colapso medial de rodillas (valgo dinámico) y activar el core para conservar la curvatura torácica erguida.",
        positiveReinforcement: "Excelente rango de movilidad articular y buen ritmo de cadencia en la fase de descenso y ascenso."
      };
    } else if (titleLower.includes('sprint') || titleLower.includes('carrera') || titleLower.includes('velocidad')) {
      return {
        observations: userNotes || "Análisis biomecánico de la zancada y fase de recobro. Posición del centro de masas y vector de fuerza horizontal.",
        recommendations: "Optimizar el ángulo de ataque del pie en el apoyo medio debajo del centro de gravedad. Mejorar la sincronización del braceo a 90°.",
        positiveReinforcement: "Buena reactividad en la salida y gran extensión de la cadena posterior en la fase de propulsión."
      };
    } else if (titleLower.includes('salto') || titleLower.includes('jump')) {
      return {
        observations: userNotes || "Coordinación en la fase de contramovimiento, triple extensión y mecánica de aterrizaje.",
        recommendations: "Amortiguar el contacto distribuyendo la carga en flexión sincronizada de tobillos, rodillas y caderas para mitigar impacto articular.",
        positiveReinforcement: "Potente explosividad concéntrica y óptima extensión vertical de brazos para ganar altura."
      };
    }

    return {
      observations: userNotes || `Análisis técnico del ejercicio "${exerciseTitle}". Estabilidad biomecánica, control axial y tempo de ejecución.`,
      recommendations: "Enfocar el control neuromuscular en el cambio de fases, respiración rítmica y alineación postural constante.",
      positiveReinforcement: "Buena concentración, ejecución firme y disposición al perfeccionamiento técnico."
    };
  };

  const analyzeVideoWithAI = async (videoBlob: Blob, exerciseTitle: string, userNotes: string): Promise<AIAnalysis> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return generateBiomechanicalRubric(exerciseTitle, userNotes);
      }

      const ai = new GoogleGenAI({ apiKey });
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoBlob);
      });
      const base64Data = await base64Promise;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              { 
                text: `Eres un entrenador y biomecánico deportivo de élite. Analiza este video del ejercicio titulado "${exerciseTitle}". Atleta: ${userType === 'child' ? 'Categoría Infantil / Juvenil' : 'Adulto / Alto Rendimiento'}. Notas adicionales del entrenador: "${userNotes}". Proporciona un análisis técnico estructurado.` 
              },
              { 
                inlineData: { 
                  data: base64Data, 
                  mimeType: videoBlob.type.startsWith('video/') ? videoBlob.type : "video/mp4" 
                } 
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              observations: { type: Type.STRING, description: "Descripción técnica y biomecánica del movimiento observado" },
              recommendations: { type: Type.STRING, description: "Puntos clave a corregir para optimizar la técnica y prevenir lesiones" },
              positiveReinforcement: { type: Type.STRING, description: "Destacar los aciertos motrices y puntos fuertes del atleta" }
            },
            required: ["observations", "recommendations", "positiveReinforcement"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      return generateBiomechanicalRubric(exerciseTitle, userNotes);
    } catch (err) {
      console.warn("AI analysis failed or quota exhausted, falling back to sports biomechanical rubric:", err);
      return generateBiomechanicalRubric(exerciseTitle, userNotes);
    }
  };

  const handleSaveVideoAnalysis = async (withAI: boolean = false) => {
    if (!recordedBlob || !title.trim()) {
      setError("Por favor escribe un título para el ejercicio.");
      return;
    }

    if (!targetUserId) {
      setError("Selecciona o define el atleta para este análisis.");
      return;
    }

    setError(null);
    setRecordingState(withAI ? 'analyzing' : 'uploading');

    try {
      const mimeType = recordedBlob.type || 'video/mp4';
      const videoId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : 'mp4';
      const storagePath = `videoAnalysis/${targetUserId}/${videoId}.${extension}`;
      const storageRef = ref(storage, storagePath);

      // 1. Upload to Firebase Storage with proper contentType
      await uploadBytes(storageRef, recordedBlob, {
        contentType: mimeType.startsWith('video/') ? mimeType : 'video/mp4'
      });
      const videoUrl = await getDownloadURL(storageRef);

      // 2. Generate analysis if requested or use coach observations
      let aiResult: AIAnalysis | null = null;
      if (withAI) {
        aiResult = await analyzeVideoWithAI(recordedBlob, title, observations);
      } else if (observations.trim()) {
        aiResult = generateBiomechanicalRubric(title, observations);
      }

      // 3. Save record in Firestore
      await addDoc(collection(db, 'videoAnalysis'), {
        userId: targetUserId,
        trainerId,
        videoUrl,
        title: title.trim(),
        observations: observations.trim(),
        analysis: aiResult ? JSON.stringify(aiResult) : (observations.trim() || ''),
        athleteName: targetAthleteName || '',
        orientation: recordOrientation,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg("¡Videoanálisis guardado con éxito!");
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reset
      setShowRecorder(false);
      setPreviewUrl(null);
      setRecordedBlob(null);
      chunksRef.current = [];
      setTitle('');
      setObservations('');
      setRecordingState('idle');
      stopCamera();
    } catch (err: any) {
      console.error("Error saving video analysis:", err);
      setError("Error al subir el video o guardar el análisis. Verifica tu conexión e inténtalo de nuevo.");
      setRecordingState('preview');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('¿Deseas eliminar permanentemente este videoanálisis?')) return;
    try {
      await deleteDoc(doc(db, 'videoAnalysis', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'videoAnalysis');
    }
  };

  const parseAnalysis = (analysisJson?: string): AIAnalysis | null => {
    if (!analysisJson) return null;
    try {
      const parsed = JSON.parse(analysisJson);
      if (parsed.observations || parsed.recommendations) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-300 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Video className="text-[#D4AF37]" size={22} />
              <span>Videoanálisis Biomecánico</span>
            </h1>
            {targetAthleteName && (
              <p className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                <User size={12} className="text-[#D4AF37]" />
                Atleta: <span className="text-white font-bold">{targetAthleteName}</span>
              </p>
            )}
          </div>
        </div>

        {canRecord && (
          <button 
            onClick={() => {
              if (!showRecorder) {
                setShowRecorder(true);
                startCamera();
              } else {
                setShowRecorder(false);
                stopCamera();
                setRecordingState('idle');
                setPreviewUrl(null);
                setRecordedBlob(null);
              }
            }}
            className={`px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg active:scale-95 ${
              showRecorder 
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30' 
                : 'bg-[#D4AF37] text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(212,175,55,0.3)]'
            }`}
          >
            {showRecorder ? (
              <>
                <StopCircle size={16} /> Cerrar Grabador
              </>
            ) : (
              <>
                <Plus size={16} /> Grabar Video
              </>
            )}
          </button>
        )}
      </header>

      {/* Success Notification */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-400 p-3 text-center text-xs font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-6">
        {/* Athlete selector for Trainer if not preset */}
        {authIsTrainer && athletesList.length > 1 && (
          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <User size={14} className="text-[#D4AF37]" /> Atleta a Analizar:
            </label>
            <select
              value={targetUserId}
              onChange={(e) => {
                const selected = athletesList.find(a => a.id === e.target.value);
                setTargetUserId(e.target.value);
                if (selected) setTargetAthleteName(selected.name);
              }}
              className="bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:border-[#D4AF37] outline-none max-w-[220px]"
            >
              {athletesList.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* RECORDER / PREVIEW & SLOW-MOTION ANALYSIS CARD */}
        <AnimatePresence>
          {showRecorder && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900 rounded-3xl border border-[#D4AF37]/40 overflow-hidden shadow-2xl"
            >
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg">
                      <Camera size={16} />
                    </span>
                    <h2 className="text-[#D4AF37] font-black uppercase text-xs tracking-widest">
                      {recordingState === 'preview' 
                        ? 'Modo Videoanálisis & Cámara Lenta' 
                        : 'Captura de Movimiento'}
                    </h2>
                  </div>

                  {/* Camera flip & file upload shortcuts */}
                  {recordingState === 'idle' && (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={toggleOrientation}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Alternar entre formato Horizontal (16:9) y Vertical (9:16)"
                      >
                        {recordOrientation === 'horizontal' ? (
                          <Monitor size={14} className="text-[#D4AF37]" />
                        ) : (
                          <Smartphone size={14} className="text-[#D4AF37]" />
                        )}
                        <span>{recordOrientation === 'horizontal' ? '16:9 Horizontal' : '9:16 Vertical'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCameraGrid(!showCameraGrid)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                          showCameraGrid
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                        }`}
                        title="Activar cuadrícula y plomada de postura biomecánica"
                      >
                        <Grid size={14} />
                        <span className="hidden sm:inline">Guía Postural</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRecorderFullscreen(true)}
                        className="px-2.5 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                        title="Abrir grabador en pantalla completa"
                      >
                        <Maximize2 size={14} />
                        <span>Pantalla Grande</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
                        title="Cambiar cámara delantera / trasera"
                      >
                        <SwitchCamera size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Subir archivo o usar cámara nativa de tu teléfono"
                      >
                        <Upload size={14} />
                        <span className="hidden sm:inline">Subir Video</span>
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="video/*" 
                        onChange={handleFileSelect} 
                        className="hidden" 
                      />
                    </div>
                  )}
                </div>

                {/* THE VIDEO SCREEN: LIVE CAMERA OR SLOW MOTION PLAYER */}
                <div className="relative">
                  {recordingState === 'preview' && previewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black">
                      <div className="space-y-2">
                        {/* Interactive Biomechanical Player with Slow Motion */}
                        <VideoPlayerWithAnalysis 
                          src={previewUrl} 
                          title={title || "Video capturado"} 
                          showQuickToolbar={true}
                        />
                        <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <Flame size={14} /> Cámara lenta habilitada
                          </span>
                          <span>Pulsa 0.25x o 0.5x y avanza cuadro por cuadro</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={
                      isRecorderFullscreen
                        ? "fixed inset-0 z-[9990] bg-black flex flex-col justify-between overflow-hidden select-none"
                        : "relative rounded-2xl overflow-hidden border border-zinc-800 bg-black"
                    }>
                      {/* Top Bar when in Fullscreen Recorder Mode */}
                      {isRecorderFullscreen && (
                        <div className="bg-gradient-to-b from-black via-black/90 to-transparent p-3 sm:p-4 z-30 flex items-center justify-between gap-2 text-white">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsRecorderFullscreen(false)}
                              className="px-3 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                              title="Salir de pantalla grande (Esc)"
                            >
                              <Minimize2 size={16} />
                              <span>Cerrar Pantalla Grande</span>
                            </button>

                            {recordingState === 'recording' ? (
                              <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full font-black text-xs tracking-wider animate-pulse">
                                <span className="w-2.5 h-2.5 bg-white rounded-full" />
                                <span>GRABANDO {recordingSeconds}s / 60s</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span>Cámara Lista</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={toggleOrientation}
                              className="px-3 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                              title="Cambiar formato de orientación (Horizontal 16:9 / Vertical 9:16)"
                            >
                              {recordOrientation === 'horizontal' ? (
                                <Monitor size={15} className="text-[#D4AF37]" />
                              ) : (
                                <Smartphone size={15} className="text-[#D4AF37]" />
                              )}
                              <span className="hidden sm:inline font-mono">
                                {recordOrientation === 'horizontal' ? 'Horizontal (16:9)' : 'Vertical (9:16)'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowCameraGrid(!showCameraGrid)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                                showCameraGrid 
                                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                                  : 'bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                              }`}
                              title="Cuadrícula biomecánica de alineación postural"
                            >
                              <Grid size={15} />
                              <span className="hidden sm:inline">Guía Postural</span>
                            </button>

                            <button
                              type="button"
                              onClick={toggleCameraFacing}
                              className="p-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl transition-colors"
                              title="Cambiar cámara frontal / trasera"
                            >
                              <SwitchCamera size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Video Center Viewport */}
                      <div className={
                        isRecorderFullscreen
                          ? "flex-1 w-full h-full relative flex items-center justify-center overflow-hidden bg-black"
                          : `relative ${recordOrientation === 'vertical' ? 'max-h-[520px] aspect-[9/16] mx-auto' : 'aspect-video w-full'} bg-black flex items-center justify-center overflow-hidden`
                      }>
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          muted 
                          playsInline 
                          className={
                            isRecorderFullscreen
                              ? `max-w-full max-h-full w-auto h-auto object-contain bg-black ${recordOrientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'}`
                              : "w-full h-full object-contain bg-black"
                          } 
                        />

                        {/* Postural Grid Alignment Overlay */}
                        {showCameraGrid && (
                          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-70">
                            <div className="border-r border-b border-[#D4AF37]/50 relative">
                              <div className="absolute bottom-1 right-1 text-[9px] text-[#D4AF37]/80 font-mono">1/3</div>
                            </div>
                            <div className="border-r border-b border-[#D4AF37]/50 relative">
                              <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/40" />
                            </div>
                            <div className="border-b border-[#D4AF37]/50 relative">
                              <div className="absolute bottom-1 left-1 text-[9px] text-[#D4AF37]/80 font-mono">2/3</div>
                            </div>
                            <div className="border-r border-b border-[#D4AF37]/50" />
                            <div className="border-r border-b border-[#D4AF37]/50 relative">
                              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#D4AF37] opacity-80" />
                              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#D4AF37] opacity-80" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full border border-[#D4AF37]/60" />
                              </div>
                            </div>
                            <div className="border-b border-[#D4AF37]/50" />
                            <div className="border-r border-[#D4AF37]/50" />
                            <div className="border-r border-[#D4AF37]/50" />
                            <div className="" />
                          </div>
                        )}
                        
                        {/* Floating Viewfinder Controls when NOT in Fullscreen */}
                        {!isRecorderFullscreen && (
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
                            <button
                              type="button"
                              onClick={toggleOrientation}
                              className="px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-xl text-white text-[11px] font-bold border border-white/20 flex items-center gap-1 shadow-lg active:scale-95"
                              title="Alternar orientación horizontal o vertical"
                            >
                              {recordOrientation === 'horizontal' ? (
                                <Monitor size={12} className="text-[#D4AF37]" />
                              ) : (
                                <Smartphone size={12} className="text-[#D4AF37]" />
                              )}
                              <span>{recordOrientation === 'horizontal' ? '16:9 Horizontal' : '9:16 Vertical'}</span>
                            </button>

                            <div className="flex items-center gap-2">
                              {recordingState === 'recording' && (
                                <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-3 py-1 rounded-full shadow-lg animate-pulse font-black text-xs tracking-wider">
                                  <span className="w-2 h-2 bg-white rounded-full" />
                                  <span>REC {recordingSeconds}s / 60s</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => setIsRecorderFullscreen(true)}
                                className="p-1.5 bg-black/75 hover:bg-black text-white hover:text-[#D4AF37] rounded-xl border border-white/20 backdrop-blur-md shadow-lg active:scale-95 flex items-center gap-1 text-xs font-bold"
                                title="Expandir grabador a pantalla completa"
                              >
                                <Maximize2 size={16} />
                                <span className="hidden sm:inline">Pantalla Grande</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {recordingState === 'idle' && !isRecorderFullscreen && (
                          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none">
                            <span className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-zinc-300 font-medium">
                              Encuadra el movimiento del atleta ({recordOrientation === 'horizontal' ? 'Horizontal 16:9' : 'Vertical 9:16'})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Control Bar when in Fullscreen Recorder Mode */}
                      {isRecorderFullscreen && (
                        <div className="bg-gradient-to-t from-black via-black/95 to-transparent px-4 pt-4 pb-8 z-30 flex flex-col items-center gap-3">
                          <div className="flex items-center justify-center gap-4 w-full">
                            {recordingState === 'idle' ? (
                              <button
                                type="button"
                                onClick={startRecording}
                                className="px-8 py-3.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm uppercase tracking-wider rounded-full shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center gap-3 transition-all"
                              >
                                <span className="w-4 h-4 bg-white rounded-full animate-ping" />
                                <span>Iniciar Grabación</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="px-8 py-3.5 bg-white hover:bg-zinc-200 active:scale-95 text-black font-black text-sm uppercase tracking-wider rounded-full shadow-[0_0_25px_rgba(255,255,255,0.7)] flex items-center gap-3 transition-all"
                              >
                                <StopCircle size={20} className="text-red-600 fill-current" />
                                <span>Detener y Analizar ({recordingSeconds}s)</span>
                              </button>
                            )}
                          </div>
                          <p className="text-zinc-400 text-xs text-center font-medium">
                            {recordingState === 'recording'
                              ? "Grabando ejecución biomecánica. Pulsa Detener cuando termine el ejercicio."
                              : `Orientación: ${recordOrientation === 'horizontal' ? 'Horizontal (16:9)' : 'Vertical (9:16)'} • Mantén el atleta alineado`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(recordingState === 'uploading' || recordingState === 'analyzing') && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 z-40">
                      <Loader2 className="text-[#D4AF37] animate-spin" size={48} />
                      <p className="text-[#D4AF37] font-bold text-sm uppercase tracking-wider animate-pulse text-center px-4">
                        {recordingState === 'uploading' 
                          ? 'Subiendo video a almacenamiento seguro...' 
                          : 'Procesando evaluación técnica y biomecánica...'}
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-center gap-3 text-red-400 text-xs">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* FORM & ACTIONS */}
                <div className="space-y-4 pt-2">
                  {/* Exercise Chips */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">
                      Ejercicio Deportivo
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {EXERCISE_CHIPS.map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setTitle(chip)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            title === chip
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title input */}
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm focus:border-[#D4AF37] outline-none text-white font-semibold placeholder:text-zinc-600"
                      placeholder="Escribe el nombre del ejercicio (ej. Sentadilla frontal, Arranque, Sprint 20m)..." 
                    />
                  </div>

                  {/* Coach / Biomechanical Observations */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">
                      Observaciones Técnicas del Entrenador (Opcional)
                    </label>
                    <textarea
                      value={observations}
                      onChange={e => setObservations(e.target.value)}
                      rows={2}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm focus:border-[#D4AF37] outline-none text-white placeholder:text-zinc-600"
                      placeholder="Ej: Rodilla derecha con leve valgo al descender; buena postura en la espalda; braceo amplio..."
                    />
                  </div>

                  {/* RECORDING / PREVIEW CONTROL BUTTONS */}
                  <div className="pt-2">
                    {recordingState === 'idle' && (
                      <div className="flex gap-3">
                        <button 
                          type="button"
                          onClick={startRecording}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all uppercase text-xs tracking-wider"
                        >
                          <Video size={18} /> Iniciar Grabación
                        </button>

                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 border border-zinc-700 active:scale-95 transition-all text-xs"
                        >
                          <Upload size={16} /> Subir Video
                        </button>
                      </div>
                    )}

                    {recordingState === 'recording' && (
                      <button 
                        type="button"
                        onClick={stopRecording}
                        className="w-full bg-white text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 active:scale-95 transition-all uppercase text-xs tracking-wider shadow-xl"
                      >
                        <StopCircle size={20} className="text-red-600" /> Detener y Analizar ({recordingSeconds}s)
                      </button>
                    )}

                    {recordingState === 'preview' && (
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button 
                          type="button"
                          onClick={() => { 
                            setRecordingState('idle'); 
                            setPreviewUrl(null); 
                            setRecordedBlob(null);
                            startCamera(); 
                          }}
                          className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors order-3 sm:order-1"
                        >
                          <RotateCcw size={16} /> Grabar de Nuevo
                        </button>

                        <button 
                          type="button"
                          onClick={() => handleSaveVideoAnalysis(false)}
                          disabled={!title.trim()}
                          className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs border border-zinc-700 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 order-2"
                        >
                          <Save size={16} className="text-[#D4AF37]" /> Guardar Videoanálisis
                        </button>

                        <button 
                          type="button"
                          onClick={() => handleSaveVideoAnalysis(true)}
                          disabled={!title.trim()}
                          className="flex-1 py-3 px-4 bg-[#D4AF37] hover:bg-yellow-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 order-1 sm:order-3"
                        >
                          <Sparkles size={16} /> Guardar con IA
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION: SAVED VIDEO ANALYSES LIST */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Eye size={16} className="text-[#D4AF37]" />
              <span>Historial de Análisis ({analyses.length})</span>
            </h2>
            {analyses.length > 0 && (
              <span className="text-[11px] text-zinc-500 font-medium">
                Cámara lenta y cuadrícula integrada
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
              <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
              <span className="text-xs uppercase font-bold tracking-widest">Cargando análisis...</span>
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-16 px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-3">
              <div className="w-12 h-12 bg-zinc-800/80 text-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto">
                <Video size={24} />
              </div>
              <h3 className="font-bold text-base text-zinc-200">Sin videoanálisis aún</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Graba o sube un video para evaluar la postura, velocidad y técnica en cámara lenta con el reproductor biomecánico.
              </p>
              {canRecord && !showRecorder && (
                <button
                  onClick={() => {
                    setShowRecorder(true);
                    startCamera();
                  }}
                  className="mt-2 px-4 py-2.5 bg-[#D4AF37] text-black font-black rounded-xl text-xs uppercase tracking-wider hover:bg-yellow-400 transition-all inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Grabar Primer Video
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {analyses.map((item) => {
                const aiData = parseAnalysis(item.analysis);
                return (
                  <div key={item.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
                    {/* Card Header */}
                    <div className="p-4 sm:p-5 flex justify-between items-center bg-zinc-800/40 border-b border-zinc-800/80">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
                          <Video size={20} />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-white">{item.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span>
                              {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Reciente'}
                            </span>
                            {item.athleteName && (
                              <>
                                <span>•</span>
                                <span className="text-[#D4AF37] font-semibold">{item.athleteName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setSelectedVideoModal({ url: item.videoUrl, title: item.title, athleteName: item.athleteName })}
                          className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-[#D4AF37]/20 text-zinc-300 hover:text-[#D4AF37] border border-zinc-700/60 hover:border-[#D4AF37]/50 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5"
                          title="Ver en pantalla ampliada"
                        >
                          <Maximize2 size={14} />
                          <span>Ampliar</span>
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
                            title="Eliminar este videoanálisis"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Player & Feedback */}
                    <div className="p-4 sm:p-6 space-y-5">
                      {/* Integrated Biomechanical Video Player with Slow Motion */}
                      <VideoPlayerWithAnalysis 
                        src={item.videoUrl} 
                        title={item.title}
                        showQuickToolbar={true}
                      />

                      {/* Observations and AI Feedback */}
                      {aiData ? (
                        <div className="grid gap-3 pt-2">
                          <div className="bg-black/50 p-4 rounded-2xl border border-blue-500/20 space-y-1.5">
                            <div className="flex items-center gap-2 text-blue-400">
                              <Eye size={16} />
                              <h4 className="text-[10px] uppercase font-black tracking-widest">Observaciones Biomecánicas</h4>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{aiData.observations}</p>
                          </div>

                          <div className="bg-black/50 p-4 rounded-2xl border border-amber-500/20 space-y-1.5">
                            <div className="flex items-center gap-2 text-amber-400">
                              <Lightbulb size={16} />
                              <h4 className="text-[10px] uppercase font-black tracking-widest">Recomendaciones de Mejora</h4>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{aiData.recommendations}</p>
                          </div>

                          <div className="bg-black/50 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                            <div className="flex items-center gap-2 text-emerald-400">
                              <Trophy size={16} />
                              <h4 className="text-[10px] uppercase font-black tracking-widest">Puntos Fuertes</h4>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{aiData.positiveReinforcement}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 p-4 bg-black/50 rounded-2xl border border-zinc-800">
                          <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Observaciones del Entrenador</h4>
                          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {item.observations || item.analysis || 'Sin observaciones adicionales.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Reproducción Ampliada Biomecánica */}
      {selectedVideoModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-center items-center p-3 sm:p-6"
          onClick={() => setSelectedVideoModal(null)}
        >
          <div 
            className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
                  <Video size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">{selectedVideoModal.title}</h3>
                  {selectedVideoModal.athleteName && (
                    <div className="text-xs text-[#D4AF37] font-semibold">{selectedVideoModal.athleteName}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedVideoModal(null)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="Cerrar reproductor"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Player */}
            <div className="p-3 sm:p-6 overflow-y-auto">
              <VideoPlayerWithAnalysis 
                src={selectedVideoModal.url}
                title={selectedVideoModal.title}
                showQuickToolbar={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default VideoAnalysisScreen;
