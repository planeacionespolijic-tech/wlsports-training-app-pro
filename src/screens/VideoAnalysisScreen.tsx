import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Save, Loader2, Trash2, Video, Play, ExternalLink, Camera, StopCircle, CheckCircle2, AlertCircle, Sparkles, Trophy, Lightbulb, Eye } from 'lucide-react';
import { db, storage, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

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
  analysis?: string; // JSON string from AI
  createdAt: any;
}

interface AIAnalysis {
  observations: string;
  recommendations: string;
  positiveReinforcement: string;
}

export const VideoAnalysisScreen = ({ onBack, userId, isAdmin, trainerId }: VideoAnalysisScreenProps) => {
  const isOwner = auth.currentUser?.uid === userId;
  const canRecord = isAdmin || isOwner;
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'preview' | 'uploading' | 'analyzing'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Recorder refs and state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [userType, setUserType] = useState<'adult' | 'child'>('adult');

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  useEffect(() => {
    // Fetch user type to provide context to AI
    const fetchUserType = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUserType(userDoc.data().type || 'adult');
        }
      } catch (err) {
        console.error("Error fetching user type:", err);
      }
    };
    fetchUserType();

    const q = query(
      collection(db, 'videoAnalysis'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];
      setAnalyses(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'videoAnalysis');
    });

    return () => {
      unsubscribe();
      stopCamera();
    };
  }, [userId]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setRecordingState('idle');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Por favor verifica los permisos.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setError("Tu navegador no soporta la grabación de video.");
      return;
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setPreviewUrl(URL.createObjectURL(blob));
      setRecordingState('preview');
    };

    mediaRecorder.start();
    setRecordingState('recording');

    // Auto-stop after 30 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording();
      }
    }, 30000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSaveAndAnalyze = async () => {
    if (chunksRef.current.length === 0 || !title) return;

    setRecordingState('uploading');
    const mimeType = getSupportedMimeType();
    const videoBlob = new Blob(chunksRef.current, { type: mimeType });
    const videoId = Date.now().toString();
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const storagePath = `videoAnalysis/${userId}/${videoId}.${extension}`;
    const storageRef = ref(storage, storagePath);

    try {
      // 1. Upload to Firebase Storage
      await uploadBytes(storageRef, videoBlob);
      const videoUrl = await getDownloadURL(storageRef);

      // 2. AI Analysis
      setRecordingState('analyzing');
      const analysis = await analyzeVideoWithAI(videoBlob);

      // 3. Save to Firestore
      await addDoc(collection(db, 'videoAnalysis'), {
        userId,
        trainerId,
        videoUrl,
        title,
        observations: analysis.observations,
        analysis: JSON.stringify(analysis),
        createdAt: serverTimestamp(),
      });

      // Reset
      setShowRecorder(false);
      setPreviewUrl(null);
      chunksRef.current = [];
      setTitle('');
      setRecordingState('idle');
      stopCamera();
    } catch (err) {
      console.error("Error in save/analyze process:", err);
      setError("Error al procesar el video. Inténtalo de nuevo.");
      setRecordingState('preview');
    }
  };

  const analyzeVideoWithAI = async (videoBlob: Blob): Promise<AIAnalysis> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Convert blob to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(videoBlob);
    });
    const base64Data = await base64Promise;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `Analiza este video de un ejercicio deportivo titulado "${title}". El usuario es un ${userType === 'child' ? 'niño' : 'adulto'}. Proporciona un análisis técnico profesional con observaciones detalladas, recomendaciones de mejora y refuerzo positivo.` },
            { inlineData: { data: base64Data, mimeType: "video/webm" } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            observations: { type: Type.STRING, description: "Descripción clara del movimiento observado" },
            recommendations: { type: Type.STRING, description: "Qué mejorar y cómo corregir la técnica" },
            positiveReinforcement: { type: Type.STRING, description: "Destacar lo que el atleta hace bien" }
          },
          required: ["observations", "recommendations", "positiveReinforcement"]
        }
      }
    });

    return JSON.parse(response.text);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('¿Eliminar este análisis de video?')) return;
    try {
      await deleteDoc(doc(db, 'videoAnalysis', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'videoAnalysis');
    }
  };

  const parseAnalysis = (analysisJson?: string): AIAnalysis | null => {
    if (!analysisJson) return null;
    try {
      return JSON.parse(analysisJson);
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Video Análisis IA</h1>
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
              }
            }}
            className={`${showRecorder ? 'bg-red-500' : 'bg-[#D4AF37]'} text-black p-2 rounded-full hover:scale-105 transition-transform`}
          >
            {showRecorder ? <StopCircle size={24} /> : <Plus size={24} />}
          </button>
        )}
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence>
          {showRecorder && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900 rounded-3xl border border-[#D4AF37]/30 mb-8 overflow-hidden shadow-2xl"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[#D4AF37] font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    <Camera size={14} /> Captura de Movimiento
                  </h2>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Máx 30 seg</span>
                </div>

                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800">
                  {recordingState === 'preview' ? (
                    <video src={previewUrl!} controls className="w-full h-full object-contain" />
                  ) : (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  )}
                  
                  {recordingState === 'recording' && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 px-3 py-1 rounded-full animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-[10px] font-bold">GRABANDO</span>
                    </div>
                  )}

                  {(recordingState === 'uploading' || recordingState === 'analyzing') && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="text-[#D4AF37] animate-spin" size={48} />
                      <p className="text-[#D4AF37] font-bold animate-pulse text-sm">
                        {recordingState === 'uploading' ? 'Subiendo video...' : 'IA analizando técnica...'}
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-center gap-3 text-red-500 text-xs">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Título del Ejercicio</label>
                    <input 
                      type="text" value={title} onChange={e => setTitle(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:border-[#D4AF37] outline-none"
                      placeholder="Ej: Sentadilla con barra, Sprint 20m..." 
                    />
                  </div>

                  <div className="flex gap-3">
                    {recordingState === 'idle' && (
                      <button 
                        onClick={startRecording}
                        className="flex-1 bg-red-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <Video size={20} /> Iniciar Grabación
                      </button>
                    )}
                    {recordingState === 'recording' && (
                      <button 
                        onClick={stopRecording}
                        className="flex-1 bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <StopCircle size={20} /> Detener
                      </button>
                    )}
                    {recordingState === 'preview' && (
                      <>
                        <button 
                          onClick={() => { setRecordingState('idle'); setPreviewUrl(null); startCamera(); }}
                          className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-xl hover:bg-zinc-700 transition-colors"
                        >
                          Repetir
                        </button>
                        <button 
                          onClick={handleSaveAndAnalyze}
                          disabled={!title}
                          className="flex-1 bg-[#D4AF37] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          <Sparkles size={20} /> Analizar con IA
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {analyses.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 italic">
                No hay análisis de video registrados
              </div>
            ) : (
              analyses.map((item) => {
                const aiData = parseAnalysis(item.analysis);
                return (
                  <div key={item.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
                    <div className="p-5 flex justify-between items-center bg-zinc-800/30">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37]">
                          <Video size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{item.title}</h3>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                            {item.createdAt?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800">
                        <video src={item.videoUrl} controls className="w-full h-full object-contain" />
                      </div>

                      {aiData ? (
                        <div className="grid gap-4">
                          <div className="bg-black/40 p-4 rounded-2xl border border-blue-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-blue-400">
                              <Eye size={16} />
                              <h4 className="text-[10px] uppercase font-black tracking-widest">Observaciones</h4>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">{aiData.observations}</p>
                          </div>

                          <div className="bg-black/40 p-4 rounded-2xl border border-amber-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-amber-400">
                              <Lightbulb size={16} />
                              <h4 className="text-[10px] uppercase font-black tracking-widest">Recomendaciones</h4>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">{aiData.recommendations}</p>
                          </div>

                          <div className="bg-black/40 p-4 rounded-2xl border border-green-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-green-400">
                              <Trophy size={16} />
                              <h4 className="text-[10px] uppercase font-black tracking-widest">Refuerzo Positivo</h4>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">{aiData.positiveReinforcement}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 p-4 bg-black/50 rounded-2xl border border-zinc-800">
                          <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Análisis del Coach</h4>
                          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.analysis || item.observations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};
