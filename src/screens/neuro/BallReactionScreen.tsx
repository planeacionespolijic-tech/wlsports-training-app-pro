import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, RotateCcw, Zap, Volume2, VolumeX, 
  Settings, Trophy, Target, Shield, Clock, Footprints, 
  Eye, CheckCircle2, ChevronRight, Activity, Award, Sparkles,
  Sliders, FastForward, HelpCircle, Save,
  Camera, SwitchCamera, Scan, Maximize2, Minimize2, AlertTriangle, Video, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BallReactionScreenProps {
  onBack?: () => void;
  userId?: string;
}

// Modes inspired by SwitchedOn
export type DrillMode = 'MIRROR' | 'OPPOSITE' | 'TAP_REACTION' | 'SO_VISION' | 'CONTINUOUS';
export type BallType = 'SOCCER_CLASSIC' | 'SOCCER_NEON' | 'BASKETBALL' | 'TENNIS';
export type PitchTheme = 'TURF' | 'DARK_ARENA' | 'INDOOR_COURT';

export interface VisionRepResult {
  rep: number;
  timeMs: number;
  detectedDirection: 'LEFT' | 'RIGHT' | 'CENTER';
  targetDirection: DirectionKey;
  isCorrect: boolean;
  isFalseStart: boolean;
}

export type DirectionKey = 
  | 'CENTER'
  | 'LEFT' 
  | 'RIGHT' 
  | 'FORWARD'   // Balón se acerca (expand)
  | 'BACKWARD'  // Balón se aleja (contract)
  | 'DIAG_UP_LEFT'
  | 'DIAG_UP_RIGHT'
  | 'DIAG_DOWN_LEFT'
  | 'DIAG_DOWN_RIGHT'
  | 'FEINT'     // Finta repentina
  | 'BOUNCE'    // Bote aéreo
  | 'STOP';     // Freno en seco

interface DirectionInfo {
  key: DirectionKey;
  label: string;
  voiceText: string;
  athleteActionMirror: string;
  athleteActionOpposite: string;
  dx: number;       // Horizontal -1 to 1
  dy: number;       // Vertical -1 to 1 (depth)
  scale: number;    // Ball scale multiplier
  rotation: number; // Degrees rotation
}

const DIRECTIONS_MAP: Record<DirectionKey, DirectionInfo> = {
  CENTER: {
    key: 'CENTER',
    label: 'Centro',
    voiceText: 'Centro',
    athleteActionMirror: 'Posición básica de alerta al centro',
    athleteActionOpposite: 'Posición de perfil bajo al centro',
    dx: 0,
    dy: 0,
    scale: 1.0,
    rotation: 0
  },
  LEFT: {
    key: 'LEFT',
    label: 'Izquierda',
    voiceText: 'Izquierda',
    athleteActionMirror: 'Shuffle lateral hacia la Izquierda',
    athleteActionOpposite: 'Cerrar / Bloquear a la Derecha',
    dx: -68,
    dy: 0,
    scale: 1.05,
    rotation: -180
  },
  RIGHT: {
    key: 'RIGHT',
    label: 'Derecha',
    voiceText: 'Derecha',
    athleteActionMirror: 'Shuffle lateral hacia la Derecha',
    athleteActionOpposite: 'Cerrar / Bloquear a la Izquierda',
    dx: 68,
    dy: 0,
    scale: 1.05,
    rotation: 180
  },
  FORWARD: {
    key: 'FORWARD',
    label: 'Hacia Ti (Viene)',
    voiceText: 'Adelante',
    athleteActionMirror: 'Retroceso defensivo rápido / Achique',
    athleteActionOpposite: 'Presión alta hacia el balón / Salida',
    dx: 0,
    dy: 45,
    scale: 1.45,
    rotation: 45
  },
  BACKWARD: {
    key: 'BACKWARD',
    label: 'Alejamiento (Pase Profundo)',
    voiceText: 'Atrás',
    athleteActionMirror: 'Sprint hacia adelante / Presión',
    athleteActionOpposite: 'Retroceso / Cobertura de línea',
    dx: 0,
    dy: -45,
    scale: 0.65,
    rotation: -45
  },
  DIAG_UP_LEFT: {
    key: 'DIAG_UP_LEFT',
    label: 'Diagonal Izq Atrás',
    voiceText: 'Diagonal Izquierda',
    athleteActionMirror: 'Avance diagonal izquierdo',
    athleteActionOpposite: 'Cobertura diagonal opuesta',
    dx: -50,
    dy: -35,
    scale: 0.75,
    rotation: -120
  },
  DIAG_UP_RIGHT: {
    key: 'DIAG_UP_RIGHT',
    label: 'Diagonal Der Atrás',
    voiceText: 'Diagonal Derecha',
    athleteActionMirror: 'Avance diagonal derecho',
    athleteActionOpposite: 'Cobertura diagonal opuesta',
    dx: 50,
    dy: -35,
    scale: 0.75,
    rotation: 120
  },
  DIAG_DOWN_LEFT: {
    key: 'DIAG_DOWN_LEFT',
    label: 'Diagonal Izq Adelante',
    voiceText: 'Corta Izquierda',
    athleteActionMirror: 'Paso cruzado atrás a la izquierda',
    athleteActionOpposite: 'Anticipación diagonal',
    dx: -55,
    dy: 38,
    scale: 1.35,
    rotation: -90
  },
  DIAG_DOWN_RIGHT: {
    key: 'DIAG_DOWN_RIGHT',
    label: 'Diagonal Der Adelante',
    voiceText: 'Corta Derecha',
    athleteActionMirror: 'Paso cruzado atrás a la derecha',
    athleteActionOpposite: 'Anticipación diagonal',
    dx: 55,
    dy: 38,
    scale: 1.35,
    rotation: 90
  },
  FEINT: {
    key: 'FEINT',
    label: '¡FINTA Y QUIEBRE!',
    voiceText: '¡Finta!',
    athleteActionMirror: 'Frenado excéntrico y cambio brusco de pie de apoyo',
    athleteActionOpposite: 'No comprar el amago, aguantar posición',
    dx: 60,
    dy: -10,
    scale: 1.1,
    rotation: 360
  },
  BOUNCE: {
    key: 'BOUNCE',
    label: 'Balón Aéreo / Bote',
    voiceText: '¡Arriba!',
    athleteActionMirror: 'Salto vertical o perfil para juego aéreo',
    athleteActionOpposite: 'Duelo aéreo / Rechazo',
    dx: 0,
    dy: -25,
    scale: 1.3,
    rotation: 0
  },
  STOP: {
    key: 'STOP',
    label: 'Frenado en Seco',
    voiceText: '¡Stop!',
    athleteActionMirror: 'Desaceleración total inmediata',
    athleteActionOpposite: 'Freno y fijar marca',
    dx: 0,
    dy: 0,
    scale: 1.0,
    rotation: 0
  }
};

export const BallReactionScreen = ({ onBack, userId }: BallReactionScreenProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // === Settings ===
  const [drillMode, setDrillMode] = useState<DrillMode>('MIRROR');
  const [ballType, setBallType] = useState<BallType>('SOCCER_CLASSIC');
  const [pitchTheme, setPitchTheme] = useState<PitchTheme>('TURF');
  
  // Timing & Speed
  const [durationMode, setDurationMode] = useState<'TIME' | 'REPS'>('TIME');
  const [totalTimeSec, setTotalTimeSec] = useState(45); // 45 seconds default drill
  const [totalReps, setTotalReps] = useState(20);        // 20 direction changes default
  const [intervalSpeed, setIntervalSpeed] = useState<number>(1.8); // 1.8s per direction change
  const [isRandomInterval, setIsRandomInterval] = useState(true); // Between 1.2s and 2.2s
  const [allowFeints, setAllowFeints] = useState(true); // Signature SwitchedOn feature
  
  // Audio & Guides
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showVectorArrow, setShowVectorArrow] = useState(true);
  const [showInstructionPill, setShowInstructionPill] = useState(true);

  // === State of Execution ===
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Active ball state
  const [currentDirection, setCurrentDirection] = useState<DirectionInfo>(DIRECTIONS_MAP.CENTER);
  const [ballCoords, setBallCoords] = useState({ x: 0, y: 0, scale: 1, rotate: 0 });
  const [isFeintActive, setIsFeintActive] = useState(false);
  const [completedChanges, setCompletedChanges] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Tap reaction specific
  const [tapReactionTimes, setTapReactionTimes] = useState<number[]>([]);
  const [currentReactionStart, setCurrentReactionStart] = useState<number>(0);
  const [lastTapReactionMs, setLastTapReactionMs] = useState<number | null>(null);

  // === SO VISION (AI Camera Motion Tracking) State ===
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [visionSensitivity, setVisionSensitivity] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [visionPipSize, setVisionPipSize] = useState<'MINI' | 'MEDIUM' | 'LARGE' | 'HIDDEN'>('MEDIUM');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveMotionEnergy, setLiveMotionEnergy] = useState<number>(0);
  const [isCalibratingVision, setIsCalibratingVision] = useState(false);
  const [visionResults, setVisionResults] = useState<VisionRepResult[]>([]);
  const [lastVisionResult, setLastVisionResult] = useState<VisionRepResult | null>(null);
  const [motionGateDetected, setMotionGateDetected] = useState<'LEFT' | 'RIGHT' | 'CENTER' | null>(null);
  const [isAwaitingVisionReaction, setIsAwaitingVisionReaction] = useState(false);

  // Vision Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const visionListeningRef = useRef<boolean>(false);
  const visionStartTimeRef = useRef<number>(0);
  const visionTargetDirRef = useRef<DirectionInfo>(DIRECTIONS_MAP.CENTER);
  const animFrameRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const nextRepNumberRef = useRef<number>(0);

  // Persistence
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Timers Refs
  const drillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const feintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio synthesize & Whistle
  const playSound = useCallback((type: 'whistle' | 'kick' | 'feint' | 'tap' | 'ding') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      if (type === 'whistle') {
        // Double referee whistle
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'triangle';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2400, ctx.currentTime);
        osc2.frequency.setValueAtTime(2460, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.35);
      } else if (type === 'kick') {
        // Low-frequency impact thud + airy swoosh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'feint') {
        // High alert double pip
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(750, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'tap') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        // Ding
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio context ignored if unavailable
    }
  }, [soundEnabled]);

  // Voice Speech
  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !soundEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.35;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignore
    }
  }, [voiceEnabled, soundEnabled]);

  // Clean all timers
  const clearAllTimers = () => {
    if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
    if (changeTimeoutRef.current) clearTimeout(changeTimeoutRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    if (feintTimeoutRef.current) clearTimeout(feintTimeoutRef.current);
  };

  // Sensitivity thresholds helper for SO VISION
  const getSensitivityThresholds = (sensitivity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (sensitivity) {
      case 'HIGH':
        return { diffThreshold: 18, energyTrigger: 2.2 };
      case 'LOW':
        return { diffThreshold: 32, energyTrigger: 5.5 };
      case 'MEDIUM':
      default:
        return { diffThreshold: 24, energyTrigger: 3.5 };
    }
  };

  // Stop SO VISION camera and cancel processing
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCalibratingVision(false);
    setLiveMotionEnergy(0);
    prevFrameRef.current = null;
    visionListeningRef.current = false;
    setIsAwaitingVisionReaction(false);
  }, []);

  // Motion processing loop using downsampled canvas for zero lag
  const startMotionProcessing = useCallback(() => {
    const processFrame = (now: number) => {
      if (now - lastProcessTimeRef.current >= 33) {
        lastProcessTimeRef.current = now;

        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
            canvasRef.current.width = 160;
            canvasRef.current.height = 120;
          }
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, 160, 120);
            const imageData = ctx.getImageData(0, 0, 160, 120);
            const currentData = imageData.data;

            if (prevFrameRef.current && prevFrameRef.current.length === currentData.length) {
              const prevData = prevFrameRef.current;
              const { diffThreshold, energyTrigger } = getSensitivityThresholds(visionSensitivity);

              let changedPixels = 0;
              let leftZoneChanges = 0;
              let rightZoneChanges = 0;
              const totalPixels = 160 * 120;

              for (let i = 0; i < currentData.length; i += 4) {
                const diff = (
                  Math.abs(currentData[i] - prevData[i]) +
                  Math.abs(currentData[i + 1] - prevData[i + 1]) +
                  Math.abs(currentData[i + 2] - prevData[i + 2])
                ) / 3;

                if (diff > diffThreshold) {
                  changedPixels++;
                  const pixelIndex = i / 4;
                  const x = pixelIndex % 160;
                  if (x < 68) leftZoneChanges++;
                  else if (x > 92) rightZoneChanges++;
                }
              }

              const energy = Math.min(100, Math.round((changedPixels / totalPixels) * 100 * 3.8));
              setLiveMotionEnergy(energy);

              // Direction gate analysis
              let currentDetectedGate: 'LEFT' | 'RIGHT' | 'CENTER' = 'CENTER';
              if (cameraFacingMode === 'user') {
                if (leftZoneChanges > rightZoneChanges * 1.3 && leftZoneChanges > 25) {
                  currentDetectedGate = 'LEFT';
                } else if (rightZoneChanges > leftZoneChanges * 1.3 && rightZoneChanges > 25) {
                  currentDetectedGate = 'RIGHT';
                }
              } else {
                if (leftZoneChanges > rightZoneChanges * 1.3 && leftZoneChanges > 25) {
                  currentDetectedGate = 'RIGHT';
                } else if (rightZoneChanges > leftZoneChanges * 1.3 && rightZoneChanges > 25) {
                  currentDetectedGate = 'LEFT';
                }
              }

              if (energy > energyTrigger) {
                setMotionGateDetected(currentDetectedGate);
              } else {
                setMotionGateDetected(null);
              }

              // Check if currently waiting for athlete reaction to ball change
              if (visionListeningRef.current) {
                if (energy >= energyTrigger) {
                  const elapsedMs = Math.round(performance.now() - visionStartTimeRef.current);

                  if (elapsedMs < 110) {
                    // False start (Anticipación antes del estímulo visual)
                    playSound('feint');
                    const falseStartResult: VisionRepResult = {
                      rep: nextRepNumberRef.current,
                      timeMs: elapsedMs,
                      detectedDirection: currentDetectedGate,
                      targetDirection: visionTargetDirRef.current.key,
                      isCorrect: false,
                      isFalseStart: true
                    };
                    setLastVisionResult(falseStartResult);
                  } else if (elapsedMs >= 110 && elapsedMs <= 3500) {
                    // Valid reaction captured!
                    visionListeningRef.current = false;
                    setIsAwaitingVisionReaction(false);

                    const targetKey = visionTargetDirRef.current.key;
                    let isCorrect = true;
                    if (targetKey === 'LEFT' && currentDetectedGate !== 'LEFT') isCorrect = false;
                    if (targetKey === 'RIGHT' && currentDetectedGate !== 'RIGHT') isCorrect = false;

                    const validResult: VisionRepResult = {
                      rep: nextRepNumberRef.current,
                      timeMs: elapsedMs,
                      detectedDirection: currentDetectedGate,
                      targetDirection: targetKey,
                      isCorrect,
                      isFalseStart: false
                    };

                    setVisionResults(prev => [...prev, validResult]);
                    setLastVisionResult(validResult);
                    playSound('tap');

                    if (voiceEnabled) {
                      speakText(`${elapsedMs} milisegundos`);
                    }
                  }
                }
              }
            }

            if (!prevFrameRef.current) {
              prevFrameRef.current = new Uint8ClampedArray(currentData.length);
            }
            prevFrameRef.current.set(currentData);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [cameraFacingMode, visionSensitivity, playSound, speakText, voiceEnabled]);

  // Start SO VISION Camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      startMotionProcessing();
    } catch (err: any) {
      console.error('SO VISION camera access error:', err);
      setCameraError('No se pudo acceder a la cámara. Por favor autoriza el permiso de cámara en tu navegador.');
      setIsCameraActive(false);
    }
  }, [cameraFacingMode, startMotionProcessing]);

  // Flip camera user / environment
  const toggleCameraFacing = async () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        setCameraFacingMode(nextMode);
        startCamera();
      }, 100);
    }
  };

  // Ensure video element receives stream across view transitions
  useEffect(() => {
    if (isCameraActive && mediaStreamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isConfiguring, isActive, isCameraActive]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      stopCamera();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [stopCamera]);

  // End Drill
  const finishDrill = useCallback(() => {
    clearAllTimers();
    stopCamera();
    setIsActive(false);
    setIsFinished(true);
    setCurrentDirection(DIRECTIONS_MAP.CENTER);
    setBallCoords({ x: 0, y: 0, scale: 1, rotate: 0 });
    playSound('whistle');
    speakText('Drill finalizado. Buen trabajo de agilidad.');
  }, [playSound, speakText, stopCamera]);

  // Schedule Next Movement Change
  const scheduleNextChange = useCallback((currentCount: number) => {
    // Check completion
    if (durationMode === 'REPS' && currentCount >= totalReps) {
      finishDrill();
      return;
    }

    // Determine interval
    let delayMs = intervalSpeed * 1000;
    if (isRandomInterval) {
      // Vary +/- 35% around intervalSpeed
      const variance = (Math.random() * 0.7 - 0.35) * delayMs;
      delayMs = Math.max(900, Math.min(3800, delayMs + variance));
    }

    changeTimeoutRef.current = setTimeout(() => {
      triggerBallMovement(currentCount + 1);
    }, delayMs);
  }, [durationMode, totalReps, intervalSpeed, isRandomInterval, finishDrill]);

  // Trigger Ball Movement
  const triggerBallMovement = useCallback((nextCount: number) => {
    const directionPool: DirectionKey[] = [
      'LEFT', 'RIGHT', 'FORWARD', 'BACKWARD',
      'DIAG_UP_LEFT', 'DIAG_UP_RIGHT', 'DIAG_DOWN_LEFT', 'DIAG_DOWN_RIGHT',
      'BOUNCE', 'STOP'
    ];

    // Maybe trigger a SwitchedOn FEINT (amago de trayectoria)
    const shouldFeint = allowFeints && Math.random() < 0.22 && nextCount > 2;

    if (shouldFeint) {
      // First, initiate a fake movement to one side
      const fakeSide = Math.random() < 0.5 ? 'LEFT' : 'RIGHT';
      const realOpposite = fakeSide === 'LEFT' ? 'RIGHT' : 'LEFT';
      const fakeDir = DIRECTIONS_MAP[fakeSide];
      const realDir = DIRECTIONS_MAP[realOpposite];

      setIsFeintActive(true);
      setCurrentDirection(DIRECTIONS_MAP.FEINT);
      playSound('feint');
      speakText('¡Finta!');

      // Move slightly to the fake side
      setBallCoords({
        x: fakeDir.dx * 0.45,
        y: fakeDir.dy * 0.45,
        scale: 1.15,
        rotate: fakeDir.rotation * 0.5
      });

      // Quick feint snap back to the opposite direction after 350ms!
      feintTimeoutRef.current = setTimeout(() => {
        setIsFeintActive(false);
        setCurrentDirection(realDir);
        playSound('kick');
        speakText(realDir.voiceText);

        setBallCoords({
          x: realDir.dx,
          y: realDir.dy,
          scale: realDir.scale,
          rotate: realDir.rotation
        });

        setCompletedChanges(nextCount);
        setCurrentReactionStart(Date.now());

        if (drillMode === 'SO_VISION') {
          nextRepNumberRef.current = nextCount;
          visionTargetDirRef.current = realDir;
          visionStartTimeRef.current = performance.now();
          visionListeningRef.current = true;
          setIsAwaitingVisionReaction(true);
          setMotionGateDetected(null);
        }

        scheduleNextChange(nextCount);
      }, 420);

      return;
    }

    // Normal direction change
    const randomIndex = Math.floor(Math.random() * directionPool.length);
    const chosenKey = directionPool[randomIndex];
    const targetDir = DIRECTIONS_MAP[chosenKey];

    setCurrentDirection(targetDir);
    playSound('kick');
    speakText(targetDir.voiceText);

    // Update ball coordinates with slight organic randomness
    const jitterX = (Math.random() * 8 - 4);
    const jitterY = (Math.random() * 8 - 4);

    setBallCoords({
      x: targetDir.dx + jitterX,
      y: targetDir.dy + jitterY,
      scale: targetDir.scale,
      rotate: targetDir.rotation + Math.floor(Math.random() * 30 - 15)
    });

    setCompletedChanges(nextCount);
    setCurrentReactionStart(Date.now());

    if (drillMode === 'SO_VISION') {
      nextRepNumberRef.current = nextCount;
      visionTargetDirRef.current = targetDir;
      visionStartTimeRef.current = performance.now();
      visionListeningRef.current = true;
      setIsAwaitingVisionReaction(true);
      setMotionGateDetected(null);
    }

    scheduleNextChange(nextCount);
  }, [allowFeints, playSound, speakText, scheduleNextChange, drillMode]);

  // Start Drill
  const startDrill = () => {
    setIsConfiguring(false);
    setIsActive(true);
    setIsFinished(false);
    setCompletedChanges(0);
    setElapsedSeconds(0);
    setTapReactionTimes([]);
    setLastTapReactionMs(null);
    setVisionResults([]);
    setLastVisionResult(null);
    setIsSaved(false);

    // If SO VISION, activate the camera right away
    if (drillMode === 'SO_VISION') {
      startCamera();
    }

    // 3 Second Countdown
    let cd = 3;
    setCountdown(cd);
    playSound('ding');
    speakText('Tres');

    const cdInterval = setInterval(() => {
      cd -= 1;
      if (cd > 0) {
        setCountdown(cd);
        playSound('ding');
        speakText(cd === 2 ? 'Dos' : 'Uno');
      } else {
        clearInterval(cdInterval);
        setCountdown(0);
        playSound('whistle');
        speakText('¡Comienza!');

        // Start elapsed clock
        const startTime = Date.now();
        elapsedIntervalRef.current = setInterval(() => {
          const secs = Math.floor((Date.now() - startTime) / 1000);
          setElapsedSeconds(secs);
          if (durationMode === 'TIME' && secs >= totalTimeSec) {
            finishDrill();
          }
        }, 1000);

        // First movement
        setTimeout(() => {
          triggerBallMovement(1);
        }, 400);
      }
    }, 1000);
  };

  // Reset drill
  const resetDrill = () => {
    clearAllTimers();
    stopCamera();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsActive(false);
    setIsConfiguring(true);
    setIsFinished(false);
    setCountdown(0);
    setCompletedChanges(0);
    setCurrentDirection(DIRECTIONS_MAP.CENTER);
    setBallCoords({ x: 0, y: 0, scale: 1, rotate: 0 });
  };

  // Tap Reaction Handler
  const handleScreenTap = () => {
    if (!isActive || isFeintActive || currentReactionStart === 0) return;
    const reactionMs = Date.now() - currentReactionStart;
    
    // Valid reaction window (100ms to 2500ms)
    if (reactionMs > 80 && reactionMs < 3000) {
      setLastTapReactionMs(reactionMs);
      setTapReactionTimes(prev => [...prev, reactionMs]);
      playSound('tap');
    }
  };

  // Save Results to Firestore
  const handleSaveResults = async () => {
    if (isSaving || isSaved) return;
    setIsSaving(true);
    try {
      const avgTap = tapReactionTimes.length > 0 
        ? Math.round(tapReactionTimes.reduce((a, b) => a + b, 0) / tapReactionTimes.length) 
        : null;

      const avgVision = visionResults.length > 0 
        ? Math.round(visionResults.reduce((a, b) => a + b.timeMs, 0) / visionResults.length) 
        : null;
      const bestVision = visionResults.length > 0
        ? Math.min(...visionResults.map(r => r.timeMs))
        : null;
      const correctVisionCount = visionResults.filter(r => r.isCorrect).length;
      const accuracyPct = visionResults.length > 0
        ? Math.round((correctVisionCount / visionResults.length) * 100)
        : null;

      await addDoc(collection(db, 'reactionTests'), {
        userId: userId || user?.uid || 'anonymous',
        date: new Date().toISOString(),
        mode: drillMode === 'SO_VISION' ? 'BALL_SO_VISION' : `BALL_SIM_${drillMode}`,
        ballType,
        totalChanges: completedChanges,
        durationSeconds: elapsedSeconds,
        averageReactionMs: drillMode === 'SO_VISION' ? avgVision : avgTap,
        bestReactionMs: drillMode === 'SO_VISION' ? bestVision : (tapReactionTimes.length > 0 ? Math.min(...tapReactionTimes) : null),
        directionAccuracyPct: accuracyPct,
        visionResults: drillMode === 'SO_VISION' ? visionResults : [],
        tapReactionTimes,
        feintsEnabled: allowFeints,
        speedSetting: intervalSpeed,
        sensitivity: drillMode === 'SO_VISION' ? visionSensitivity : null,
        cameraFacingMode,
        createdAt: serverTimestamp(),
      });
      setIsSaved(true);
      playSound('ding');
    } catch (e) {
      console.error('Error saving ball drill results:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  // =========================================================================
  // RENDER BALL COMPONENT
  // =========================================================================
  const renderBallSvg = () => {
    if (ballType === 'SOCCER_CLASSIC') {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
          <defs>
            <radialGradient id="soccerShade" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#64748b" />
            </radialGradient>
            <radialGradient id="patchShade" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#09090b" />
            </radialGradient>
          </defs>
          {/* Main sphere */}
          <circle cx="50" cy="50" r="46" fill="url(#soccerShade)" stroke="#0f172a" strokeWidth="2" />
          
          {/* Center black pentagon */}
          <polygon points="50,33 63,42 58,58 42,58 37,42" fill="url(#patchShade)" stroke="#0f172a" strokeWidth="1.5" />
          
          {/* Outer patches */}
          <polygon points="50,12 56,18 44,18" fill="url(#patchShade)" stroke="#0f172a" strokeWidth="1.5" />
          <polygon points="18,36 24,42 20,48" fill="url(#patchShade)" stroke="#0f172a" strokeWidth="1.5" />
          <polygon points="82,36 76,42 80,48" fill="url(#patchShade)" stroke="#0f172a" strokeWidth="1.5" />
          <polygon points="28,78 35,74 34,82" fill="url(#patchShade)" stroke="#0f172a" strokeWidth="1.5" />
          <polygon points="72,78 65,74 66,82" fill="url(#patchShade)" stroke="#0f172a" strokeWidth="1.5" />
          
          {/* Seam connection lines */}
          <line x1="50" y1="33" x2="50" y2="18" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="37" y1="42" x2="24" y2="42" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="63" y1="42" x2="76" y2="42" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="42" y1="58" x2="35" y2="74" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="58" y1="58" x2="65" y2="74" stroke="#0f172a" strokeWidth="1.5" />

          {/* Specular 3D highlight */}
          <ellipse cx="36" cy="30" rx="14" ry="8" fill="#ffffff" opacity="0.45" transform="rotate(-30 36 30)" />
        </svg>
      );
    } else if (ballType === 'SOCCER_NEON') {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_35px_rgba(163,230,53,0.8)]">
          <defs>
            <radialGradient id="neonShade" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="60%" stopColor="#a3e635" />
              <stop offset="100%" stopColor="#4d7c0f" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#neonShade)" stroke="#1a2e05" strokeWidth="2.5" />
          <polygon points="50,33 63,42 58,58 42,58 37,42" fill="#0f172a" stroke="#1a2e05" strokeWidth="2" />
          <polygon points="50,12 56,18 44,18" fill="#0f172a" stroke="#1a2e05" strokeWidth="2" />
          <polygon points="18,36 24,42 20,48" fill="#0f172a" stroke="#1a2e05" strokeWidth="2" />
          <polygon points="82,36 76,42 80,48" fill="#0f172a" stroke="#1a2e05" strokeWidth="2" />
          <line x1="50" y1="33" x2="50" y2="18" stroke="#0f172a" strokeWidth="2" />
          <line x1="37" y1="42" x2="24" y2="42" stroke="#0f172a" strokeWidth="2" />
          <line x1="63" y1="42" x2="76" y2="42" stroke="#0f172a" strokeWidth="2" />
          <line x1="42" y1="58" x2="35" y2="74" stroke="#0f172a" strokeWidth="2" />
          <line x1="58" y1="58" x2="65" y2="74" stroke="#0f172a" strokeWidth="2" />
          <ellipse cx="36" cy="28" rx="14" ry="7" fill="#ffffff" opacity="0.6" transform="rotate(-30 36 28)" />
        </svg>
      );
    } else if (ballType === 'BASKETBALL') {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
          <defs>
            <radialGradient id="bballShade" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="70%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#bballShade)" stroke="#1c1917" strokeWidth="2.5" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="#1c1917" strokeWidth="3" />
          <line x1="50" y1="4" x2="50" y2="96" stroke="#1c1917" strokeWidth="3" />
          <path d="M 20,12 Q 50,45 20,88" fill="none" stroke="#1c1917" strokeWidth="3" />
          <path d="M 80,12 Q 50,45 80,88" fill="none" stroke="#1c1917" strokeWidth="3" />
          <ellipse cx="36" cy="28" rx="14" ry="7" fill="#ffffff" opacity="0.35" transform="rotate(-30 36 28)" />
        </svg>
      );
    } else {
      // Tennis ball
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_30px_rgba(202,240,68,0.7)]">
          <defs>
            <radialGradient id="tennisShade" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="65%" stopColor="#ccf726" />
              <stop offset="100%" stopColor="#65a30d" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#tennisShade)" stroke="#4d7c0f" strokeWidth="1.5" />
          <path d="M 12,28 Q 50,45 88,28" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
          <path d="M 12,72 Q 50,55 88,72" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
          <ellipse cx="36" cy="28" rx="12" ry="6" fill="#ffffff" opacity="0.5" transform="rotate(-30 36 28)" />
        </svg>
      );
    }
  };

  // =========================================================================
  // VIEW 1: CONFIGURATION (PRE-DRILL SETUP)
  // =========================================================================
  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">
        {/* Header */}
        <header className="p-4 sm:p-6 border-b border-zinc-900 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack} 
              className="p-2.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 active:scale-95"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                  Balón Reactivo <span className="text-[#D4AF37]">SwitchedOn</span>
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  Agilidad Visual
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Simulación dinámica de balón y toma de decisiones motoras
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${
                voiceEnabled 
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
                  : 'bg-zinc-900 text-zinc-600 border-zinc-800'
              }`}
              title="Voz en off"
            >
              <Volume2 size={16} />
              <span className="hidden sm:inline">Voz {voiceEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-all ${
                soundEnabled 
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30' 
                  : 'bg-zinc-900 text-zinc-600 border-zinc-800'
              }`}
            >
              {soundEnabled ? <Zap size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full pb-32 overflow-y-auto">
          {/* MODE SELECTOR */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#D4AF37] flex items-center gap-1.5">
                <Target size={14} /> Modalidad de Ejercicio
              </span>
              <span className="text-xs text-zinc-500 font-medium">Objetivo del Atleta</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mode: SO VISION - AI Camera Motion Tracking */}
              <button
                type="button"
                onClick={() => setDrillMode('SO_VISION')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between sm:col-span-2 ${
                  drillMode === 'SO_VISION'
                    ? 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/30 border-[#D4AF37] shadow-[0_0_35px_rgba(212,175,55,0.25)] ring-2 ring-[#D4AF37]'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2.5 rounded-xl ${drillMode === 'SO_VISION' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/30' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Camera size={20} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 flex items-center gap-1">
                        <Sparkles size={11} /> SO VISION™ • Auto-Medición IA
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">Sin Tocar Pantalla</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black uppercase text-white mb-1">
                    Auto-Medición por Cámara (Estilo SO VISION™)
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Utiliza la cámara con visión artificial para detectar automáticamente el instante exacto en que tu cuerpo inicia el desplazamiento o salto. Mide tu tiempo de reacción neuromuscular en milisegundos (ms) y evalúa si te desplazaste en la dirección correcta.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-[#D4AF37] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Scan size={14} /> Detección corporal dinámica a 30+ FPS
                  </span>
                  <span className="text-zinc-400 font-normal">
                    Manos libres • Precisión al milisegundo
                  </span>
                </div>
              </button>

              {/* Mode: Mirror */}
              <button
                type="button"
                onClick={() => setDrillMode('MIRROR')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  drillMode === 'MIRROR'
                    ? 'bg-zinc-900 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.18)] ring-1 ring-[#D4AF37]'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2.5 rounded-xl ${drillMode === 'MIRROR' ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Footprints size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">Clásico SwitchedOn</span>
                  </div>
                  <h3 className="text-sm font-black uppercase text-white mb-1">
                    Modo Espejo (Mirror Drill)
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    El alumno acompaña la trayectoria del balón: lateral a la derecha si va a la derecha, retroceso si el balón se acerca, sprint si se aleja.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[10px] text-[#D4AF37] font-bold">
                  ⚡ Agilidad, cambios de dirección y shuffle defensivo
                </div>
              </button>

              {/* Mode: Opposite / Intercept */}
              <button
                type="button"
                onClick={() => setDrillMode('OPPOSITE')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  drillMode === 'OPPOSITE'
                    ? 'bg-zinc-900 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.18)] ring-1 ring-blue-500'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2.5 rounded-xl ${drillMode === 'OPPOSITE' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Shield size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-blue-400">Porteros & Defensores</span>
                  </div>
                  <h3 className="text-sm font-black uppercase text-white mb-1">
                    Modo Oposición / Intercepción
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    El deportista ataca la trayectoria o bloquea en sentido opuesto para cortar el pase o cerrar el ángulo de tiro.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[10px] text-blue-400 font-bold">
                  🧤 Duelos 1v1, coberturas y reflejo de arquero
                </div>
              </button>

              {/* Mode: Tap Reaction */}
              <button
                type="button"
                onClick={() => setDrillMode('TAP_REACTION')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  drillMode === 'TAP_REACTION'
                    ? 'bg-zinc-900 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2.5 rounded-xl ${drillMode === 'TAP_REACTION' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Zap size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">Cronómetro en ms</span>
                  </div>
                  <h3 className="text-sm font-black uppercase text-white mb-1">
                    Toque Reactivo en Pantalla
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    El alumno (o entrenador) toca la pantalla cada vez que el balón cambia de dirección para medir el tiempo de respuesta neuromuscular en ms.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[10px] text-emerald-400 font-bold">
                  ⏱️ Medición cuantitativa de velocidad perceptiva
                </div>
              </button>

              {/* Mode: Continuous Cardio Agility */}
              <button
                type="button"
                onClick={() => setDrillMode('CONTINUOUS')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  drillMode === 'CONTINUOUS'
                    ? 'bg-zinc-900 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.18)] ring-1 ring-purple-500'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2.5 rounded-xl ${drillMode === 'CONTINUOUS' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Activity size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-purple-400">Resistencia</span>
                  </div>
                  <h3 className="text-sm font-black uppercase text-white mb-1">
                    Drill Continuo Sin Fin
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Movimiento constante e ininterrumpido sin pausas, ideal para circuitos de coordinación anaeróbica y fatiga neuromuscular controlada.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[10px] text-purple-400 font-bold">
                  🔥 Intensidad alta, visión periférica y resistencia
                </div>
              </button>
            </div>

            {/* SO VISION CALIBRATION & CAMERA TUNING PANEL (If SO_VISION selected) */}
            {drillMode === 'SO_VISION' && (
              <div className="mt-4 p-5 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-[#D4AF37]/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37]">
                      <Scan size={18} />
                    </span>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
                        Calibración y Sensor SO VISION™
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Coloca el dispositivo a 2 - 3 metros y pruébalo con tu movimiento
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition-colors"
                      title="Alternar entre cámara frontal y trasera"
                    >
                      <SwitchCamera size={14} />
                      <span>{cameraFacingMode === 'user' ? 'Frontal (Selfie)' : 'Trasera'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isCameraActive) {
                          stopCamera();
                        } else {
                          startCamera();
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                        isCameraActive
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-[#D4AF37] text-black shadow-md hover:bg-[#c49f30]'
                      }`}
                    >
                      {isCameraActive ? <EyeOff size={14} /> : <Video size={14} />}
                      <span>{isCameraActive ? 'Detener Test' : 'Probar Cámara'}</span>
                    </button>
                  </div>
                </div>

                {/* Camera error notification if any */}
                {cameraError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2 text-xs text-red-400">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Interactive Camera Calibration Stage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  {/* Video Viewfinder */}
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? '-scale-x-100' : ''}`}
                    />

                    {/* Overlay Guides */}
                    {isCameraActive ? (
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            motionGateDetected === 'LEFT' ? 'bg-emerald-500 text-black font-black animate-pulse' : 'bg-black/60 text-zinc-400 border border-white/10'
                          }`}>
                            ⬅️ ZONA IZQUIERDA
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-black/60 text-emerald-400 border border-emerald-500/30">
                            IA ACTIVA (30 FPS)
                          </span>
                          <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            motionGateDetected === 'RIGHT' ? 'bg-emerald-500 text-black font-black animate-pulse' : 'bg-black/60 text-zinc-400 border border-white/10'
                          }`}>
                            ZONA DERECHA ➡️
                          </span>
                        </div>

                        {/* Center athlete silhouette guide */}
                        <div className="self-center w-28 h-36 border border-dashed border-[#D4AF37]/50 rounded-2xl flex items-center justify-center bg-[#D4AF37]/5">
                          <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider text-center px-1">
                            Párate al centro
                          </span>
                        </div>

                        <div className="text-center">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                            liveMotionEnergy > 3
                              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40'
                              : 'bg-black/70 text-zinc-400 border border-white/10'
                          }`}>
                            {liveMotionEnergy > 3 ? '⚡ ¡Movimiento Detectado!' : 'En Espera de Movimiento...'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <Camera size={32} className="mx-auto text-zinc-600" />
                        <p className="text-xs text-zinc-400 font-medium">
                          Presiona <strong className="text-white">"Probar Cámara"</strong> para calibrar tu posición y verificar la detección de movimiento antes de comenzar el drill.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Calibration Sliders & Meters */}
                  <div className="space-y-3">
                    {/* Live Motion Energy Bar */}
                    <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                          <Activity size={14} className="text-emerald-400" /> Nivel de Movimiento en Vivo:
                        </span>
                        <span className="font-mono font-black text-emerald-400">{liveMotionEnergy}%</span>
                      </div>
                      <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
                        {/* Threshold mark */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" 
                          style={{ 
                            left: `${visionSensitivity === 'HIGH' ? 15 : visionSensitivity === 'LOW' ? 35 : 25}%` 
                          }} 
                          title="Umbral de disparo"
                        />
                        <div 
                          className={`h-full transition-all duration-75 rounded-full ${
                            liveMotionEnergy > (visionSensitivity === 'HIGH' ? 15 : visionSensitivity === 'LOW' ? 35 : 25)
                              ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                              : 'bg-zinc-700'
                          }`}
                          style={{ width: `${Math.min(100, liveMotionEnergy * 2.5)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                        <span>Reposo (0%)</span>
                        <span className="text-red-400 font-bold">Línea roja = Umbral de disparo</span>
                        <span>Sprint / Salto (100%)</span>
                      </div>
                    </div>

                    {/* Sensitivity presets */}
                    <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Sliders size={14} className="text-[#D4AF37]" /> Sensibilidad del Sensor IA:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {(['HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setVisionSensitivity(lvl)}
                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                              visionSensitivity === lvl
                                ? 'bg-[#D4AF37] text-black shadow-md'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                            }`}
                          >
                            <div>{lvl === 'HIGH' ? 'Alta' : lvl === 'MEDIUM' ? 'Media (Óptima)' : 'Baja'}</div>
                            <span className="text-[9px] block opacity-80 font-normal">
                              {lvl === 'HIGH' ? 'Micro-pasos' : lvl === 'MEDIUM' ? 'Cuerpo 2-3m' : 'Desplazamientos'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* DRILL DURATION & INTERVAL PARAMETERS */}
          <section className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800 space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <Clock size={15} className="text-[#D4AF37]" /> Tiempo, Ritmo y Frecuencia
            </h2>

            {/* Duration Mode Switch */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setDurationMode('TIME')}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  durationMode === 'TIME' 
                    ? 'bg-[#D4AF37] text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Por Tiempo ({totalTimeSec}s)
              </button>
              <button
                type="button"
                onClick={() => setDurationMode('REPS')}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  durationMode === 'REPS' 
                    ? 'bg-[#D4AF37] text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Por Repeticiones ({totalReps} cambios)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {durationMode === 'TIME' ? (
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500">Duración del Round</p>
                    <p className="text-lg font-black text-white">{totalTimeSec} segundos</p>
                  </div>
                  <div className="flex gap-1">
                    {[30, 45, 60, 90].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTotalTimeSec(t)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                          totalTimeSec === t ? 'bg-[#D4AF37] text-black font-black' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500">Cambios de Dirección</p>
                    <p className="text-lg font-black text-white">{totalReps} repeticiones</p>
                  </div>
                  <div className="flex gap-1">
                    {[10, 15, 20, 30].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setTotalReps(r)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                          totalReps === r ? 'bg-[#D4AF37] text-black font-black' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Interval Speed */}
              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-zinc-500">Frecuencia de Cambio</p>
                  <p className="text-lg font-black text-white">{intervalSpeed}s por pase</p>
                </div>
                <div className="flex gap-1">
                  {[
                    { label: 'Pro', val: 1.2 },
                    { label: 'Medio', val: 1.8 },
                    { label: 'Base', val: 2.5 }
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setIntervalSpeed(s.val)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                        intervalSpeed === s.val ? 'bg-[#D4AF37] text-black font-black' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Switches for Feints & Randomness */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAllowFeints(!allowFeints)}
                className={`p-3 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  allowFeints 
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50 text-white' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className={allowFeints ? 'text-[#D4AF37]' : 'text-zinc-600'} />
                  <div>
                    <p className="text-xs font-bold">Fintas & Quiebres Repentinos</p>
                    <p className="text-[10px] text-zinc-400">Amaga a un lado y quiebra al opuesto</p>
                  </div>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${allowFeints ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                  {allowFeints ? 'SÍ' : 'NO'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsRandomInterval(!isRandomInterval)}
                className={`p-3 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  isRandomInterval 
                    ? 'bg-purple-500/10 border-purple-500/40 text-white' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FastForward size={18} className={isRandomInterval ? 'text-purple-400' : 'text-zinc-600'} />
                  <div>
                    <p className="text-xs font-bold">Ritmo Impredecible</p>
                    <p className="text-[10px] text-zinc-400">Tiempos variables entre cambios</p>
                  </div>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isRandomInterval ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                  {isRandomInterval ? 'SÍ' : 'NO'}
                </span>
              </button>
            </div>
          </section>

          {/* VISUAL & BALL CUSTOMIZATION */}
          <section className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/70 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <Eye size={15} className="text-[#D4AF37]" /> Tipo de Balón y Cancha
              </h2>
            </div>

            {/* Ball Type */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'SOCCER_CLASSIC', label: 'Fútbol Clásico', icon: '⚽' },
                { id: 'SOCCER_NEON', label: 'Fútbol Flúor Neón', icon: '⚡' },
                { id: 'BASKETBALL', label: 'Baloncesto', icon: '🏀' },
                { id: 'TENNIS', label: 'Pelota de Tenis', icon: '🎾' }
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBallType(b.id as BallType)}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                    ballType === b.id 
                      ? 'bg-zinc-800 border-[#D4AF37] text-white ring-1 ring-[#D4AF37]' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-[11px] font-bold">{b.label}</span>
                </button>
              ))}
            </div>

            {/* Pitch Theme */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: 'TURF', label: 'Césped Fútbol', bg: 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300' },
                { id: 'DARK_ARENA', label: 'Arena Oscura', bg: 'bg-zinc-900 border-zinc-800 text-zinc-300' },
                { id: 'INDOOR_COURT', label: 'Duela Básquet', bg: 'bg-amber-950/50 border-amber-800/40 text-amber-300' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPitchTheme(p.id as PitchTheme)}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                    pitchTheme === p.id ? `${p.bg} border-white ring-1 ring-white/30 font-black` : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Visual Guides Switches */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={() => setShowVectorArrow(!showVectorArrow)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-2"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${showVectorArrow ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-zinc-700'}`}>
                  {showVectorArrow && '✓'}
                </div>
                Mostrar Flecha Directriz en Vivo
              </button>

              <button
                type="button"
                onClick={() => setShowInstructionPill(!showInstructionPill)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-2"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${showInstructionPill ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-zinc-700'}`}>
                  {showInstructionPill && '✓'}
                </div>
                Píldora de Instrucción Táctica
              </button>
            </div>
          </section>
        </main>

        {/* BOTTOM LAUNCH BAR */}
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent border-t border-zinc-900 z-30">
          <div className="max-w-3xl mx-auto">
            <button 
              type="button"
              onClick={startDrill}
              className="w-full bg-[#D4AF37] hover:bg-[#c49f30] active:scale-98 text-black font-black py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-3 text-base sm:text-lg shadow-[0_0_35px_rgba(212,175,55,0.4)] transition-all uppercase tracking-[0.15em]"
            >
              <Play fill="black" size={22} />
              Iniciar Simulación ({durationMode === 'TIME' ? `${totalTimeSec}s` : `${totalReps} Cambios`})
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: POST-DRILL RESULTS SCREEN
  // =========================================================================
  if (isFinished) {
    const avgReaction = tapReactionTimes.length > 0 
      ? Math.round(tapReactionTimes.reduce((a, b) => a + b, 0) / tapReactionTimes.length) 
      : null;
    const bestReaction = tapReactionTimes.length > 0 ? Math.min(...tapReactionTimes) : null;

    const avgVision = visionResults.length > 0 
      ? Math.round(visionResults.reduce((a, b) => a + b.timeMs, 0) / visionResults.length) 
      : null;
    const bestVision = visionResults.length > 0
      ? Math.min(...visionResults.map(r => r.timeMs))
      : null;
    const correctVisionCount = visionResults.filter(r => r.isCorrect).length;
    const accuracyPct = visionResults.length > 0
      ? Math.round((correctVisionCount / visionResults.length) * 100)
      : null;

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#D4AF3718_0%,transparent_75%)] pointer-events-none" />

        <div className="relative z-10 space-y-6 w-full max-w-xl my-auto py-8">
          <div className="space-y-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-3xl flex items-center justify-center mx-auto text-[#D4AF37] shadow-xl">
              <Trophy size={38} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-white">
              Drill Balón SwitchedOn Finalizado
            </h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.25em]">
              {drillMode === 'SO_VISION'
                ? 'SO VISION™ (Auto Medición por Cámara IA)'
                : drillMode === 'MIRROR'
                ? 'Modo Espejo (Mirror Agility)'
                : drillMode === 'OPPOSITE'
                ? 'Modo Oposición & Bloqueo'
                : drillMode === 'TAP_REACTION'
                ? 'Toque Reactivo en Pantalla'
                : 'Drill Continuo'}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Cambios</p>
              <p className="text-xl sm:text-2xl font-black text-[#D4AF37]">
                {completedChanges}
              </p>
            </div>

            <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Tiempo Total</p>
              <p className="text-xl sm:text-2xl font-black text-white">
                {elapsedSeconds}<span className="text-xs">s</span>
              </p>
            </div>

            <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">
                {drillMode === 'SO_VISION' ? 'Reacción Media' : 'Ritmo'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">
                {drillMode === 'SO_VISION'
                  ? (avgVision ? `${avgVision}ms` : '--')
                  : `${elapsedSeconds > 0 ? (completedChanges / (elapsedSeconds / 60)).toFixed(1) : 0}/min`}
              </p>
            </div>

            <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">
                {drillMode === 'SO_VISION' ? 'Mejor Reflejo' : drillMode === 'TAP_REACTION' ? 'Mejor Toque' : 'Fintas'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-purple-400">
                {drillMode === 'SO_VISION' && bestVision
                  ? `${bestVision}ms`
                  : drillMode === 'TAP_REACTION' && bestReaction 
                  ? `${bestReaction}ms` 
                  : allowFeints ? 'Activas' : 'Off'}
              </p>
            </div>
          </div>

          {/* SO VISION AI Analytics Card */}
          {drillMode === 'SO_VISION' && (
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5 rounded-3xl border border-[#D4AF37]/40 text-left space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
                  <Sparkles size={16} /> Reporte de Visión Artificial SO VISION™
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400">
                  {accuracyPct !== null ? `${accuracyPct}% Precisión` : ''}
                </span>
              </div>

              {/* Tier Banner */}
              <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Nivel de Velocidad Neuromuscular</p>
                  <p className="text-sm font-black text-white flex items-center gap-1.5">
                    {avgVision && avgVision < 300
                      ? '⚡ Reflejo Élite Mundial (Sub-300ms)'
                      : avgVision && avgVision < 400
                      ? '🏆 Nivel Rendimiento Profesional'
                      : avgVision && avgVision < 520
                      ? '🔥 Nivel Competitivo Avanzado'
                      : '📈 En Fase de Desarrollo'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-black text-[#D4AF37]">{avgVision || '--'}</span>
                  <span className="text-xs font-bold text-zinc-400 ml-1">ms prom.</span>
                </div>
              </div>

              {/* Repetition logs table */}
              {visionResults.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Historial por Repetición
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {visionResults.map((res, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-mono font-bold text-[10px]">
                            {res.rep}
                          </span>
                          <span className="font-bold text-zinc-200">
                            {res.timeMs} ms
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-zinc-400">
                            Mov: {res.detectedDirection === 'LEFT' ? '⬅️ Izq' : res.detectedDirection === 'RIGHT' ? '➡️ Der' : '⬆️ Centro'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            res.isFalseStart
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : res.isCorrect
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {res.isFalseStart ? 'Anticipación' : res.isCorrect ? '✓ Correcto' : '↔ Opuesto'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tap Reaction Card if used */}
          {drillMode === 'TAP_REACTION' && tapReactionTimes.length > 0 && (
            <div className="bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300">Promedio de Reacción Táctil:</span>
                <span className="font-black text-emerald-400 text-base">{avgReaction} ms</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {avgReaction && avgReaction < 350 ? '⚡ Nivel Reflejos Élite Mundial' : avgReaction && avgReaction < 480 ? '🔥 Nivel Reflejos Avanzado Pro' : '👍 Nivel Base de Estimulación'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button 
              type="button"
              onClick={handleSaveResults}
              disabled={isSaving || isSaved}
              className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                isSaved 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 cursor-default' 
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 active:scale-98'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 size={16} /> ¡Drill Registrado en Historial Neuro!
                </>
              ) : isSaving ? (
                <span>Guardando sesión...</span>
              ) : (
                <>
                  <Save size={16} /> Guardar Sesión en Registro Neuro
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={startDrill}
                className="bg-[#D4AF37] hover:bg-[#c49f30] active:scale-98 text-black font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={15} /> Repetir Drill
              </button>

              <button 
                type="button"
                onClick={resetDrill}
                className="bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider"
              >
                Configuración
              </button>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="text-xs text-zinc-500 hover:text-zinc-300 py-1 transition-colors"
            >
              Volver al Centro Neuro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: LIVE DRILL SIMULATOR (SWITCHED ON BALL HUD)
  // =========================================================================
  return (
    <div 
      className="fixed inset-0 bg-black flex flex-col select-none overflow-hidden z-50 cursor-pointer"
      onClick={handleScreenTap}
    >
      {/* 3D TACTICAL COURT BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {pitchTheme === 'TURF' ? (
          // Realistic Soccer Turf with Depth Perspective
          <div className="absolute inset-0 bg-[#0c2817] flex flex-col justify-between opacity-95">
            {/* Striped grass */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#0a2113,#0a2113_60px,#0d2b19_60px,#0d2b19_120px)] opacity-60" />
            
            {/* Perspective Grid & Center Circle */}
            <div className="absolute inset-x-0 bottom-0 top-1/4 border-t-2 border-white/20 flex items-center justify-center">
              <div className="w-64 h-64 sm:w-96 sm:h-96 rounded-full border-2 border-white/20 border-dashed" />
              <div className="absolute w-4 h-4 rounded-full bg-white/30" />
              {/* Penalty arcs & boxes */}
              <div className="absolute top-0 w-80 h-32 border-b-2 border-l-2 border-r-2 border-white/15 rounded-b-3xl" />
              <div className="absolute bottom-0 w-80 h-32 border-t-2 border-l-2 border-r-2 border-white/15 rounded-t-3xl" />
            </div>

            {/* Stadium spotlight glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.12)_0%,transparent_70%)]" />
          </div>
        ) : pitchTheme === 'DARK_ARENA' ? (
          // Cyber Pro Arena
          <div className="absolute inset-0 bg-[#09090b]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#D4AF3712_0%,transparent_70%)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-[#D4AF37]/15" />
          </div>
        ) : (
          // Indoor Basketball Wood
          <div className="absolute inset-0 bg-[#29170e]">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#24140c,#24140c_20px,#311c11_20px,#311c11_40px)] opacity-80" />
            <div className="absolute inset-0 border-4 border-amber-500/20 m-6 rounded-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border-2 border-amber-500/25" />
          </div>
        )}
      </div>

      {/* TOP STATUS BAR */}
      <header className="p-4 sm:p-6 flex items-center justify-between z-30 pointer-events-auto">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            resetDrill();
          }}
          className="px-3.5 py-1.5 bg-black/60 hover:bg-black/90 border border-white/20 rounded-xl flex items-center gap-1.5 text-xs font-bold text-white backdrop-blur-md transition-all active:scale-95 shadow-lg"
        >
          <ArrowLeft size={16} />
          <span>Detener</span>
        </button>

        {/* Live Counters */}
        <div className="flex items-center gap-3 text-right">
          <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-right">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">
              {durationMode === 'TIME' ? 'Tiempo' : 'Pases'}
            </p>
            <p className="text-xl sm:text-2xl font-mono font-black text-white leading-none">
              {durationMode === 'TIME' 
                ? `${totalTimeSec - elapsedSeconds}s`
                : `${completedChanges}/${totalReps}`}
            </p>
          </div>

          <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-right">
            <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest leading-none mb-1">
              Cambios
            </p>
            <p className="text-xl sm:text-2xl font-mono font-black text-[#D4AF37] leading-none">
              {completedChanges}
            </p>
          </div>
        </div>
      </header>

      {/* SO VISION FLOATING LIVE VIEWFINDER (IF SO_VISION MODE) */}
      {drillMode === 'SO_VISION' && (
        <div className="absolute top-20 right-4 sm:right-6 z-40 flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className={`relative w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden border-2 shadow-2xl transition-all duration-300 ${
            isAwaitingVisionReaction
              ? 'border-[#D4AF37] ring-4 ring-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.4)]'
              : lastVisionResult
              ? lastVisionResult.isCorrect
                ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                : 'border-amber-500 ring-2 ring-amber-500/30'
              : 'border-zinc-700 bg-black/80'
          }`}>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? '-scale-x-100' : ''}`}
            />

            {/* In-viewfinder HUD indicators */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono font-bold">
                <span className={`px-1.5 py-0.5 rounded text-[8px] transition-colors ${
                  motionGateDetected === 'LEFT' ? 'bg-emerald-500 text-black font-black' : 'bg-black/60 text-zinc-400'
                }`}>
                  ⬅️ IZQ
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] bg-black/60 text-[#D4AF37]">
                  {isAwaitingVisionReaction ? 'ESCUCHANDO' : 'LISTO'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] transition-colors ${
                  motionGateDetected === 'RIGHT' ? 'bg-emerald-500 text-black font-black' : 'bg-black/60 text-zinc-400'
                }`}>
                  DER ➡️
                </span>
              </div>

              <div className="flex items-center justify-between text-[8px] text-white">
                <div className="bg-black/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Activity size={10} className="text-emerald-400" />
                  <span className="font-mono">{liveMotionEnergy}%</span>
                </div>
                {lastVisionResult && (
                  <span className="bg-emerald-500 text-black font-mono font-black px-1.5 py-0.5 rounded text-[9px]">
                    {lastVisionResult.timeMs}ms
                  </span>
                )}
              </div>
            </div>

            {/* Flip Camera Control on PiP */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCameraFacing();
              }}
              className="absolute bottom-1.5 right-1.5 p-1 bg-black/70 hover:bg-black text-white rounded-lg pointer-events-auto border border-white/20 transition-all active:scale-95"
              title="Cambiar cámara frontal/trasera"
            >
              <SwitchCamera size={12} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>SO VISION™ 30 FPS</span>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT: BALL CANVAS */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-20">
        <AnimatePresence mode="wait">
          {/* Initial 3-2-1 Countdown */}
          {countdown > 0 ? (
            <motion.div
              key="countdown"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <span className="text-[10rem] sm:text-[14rem] font-mono font-black text-[#D4AF37] leading-none drop-shadow-[0_0_80px_rgba(212,175,55,0.6)]">
                {countdown}
              </span>
              <div className="bg-black/80 px-6 py-2 rounded-2xl border border-white/20">
                <p className="text-xs sm:text-sm font-black text-white uppercase tracking-[0.25em]">
                  ¡Mira el balón y mantén perfil de alerta!
                </p>
              </div>
            </motion.div>
          ) : (
            /* SIMULATION IN PROGRESS */
            <div className="relative w-full h-full flex items-center justify-center">
              {/* DIRECTION VECTOR ARROW (OPTIONAL GUIDE) */}
              {showVectorArrow && currentDirection.key !== 'CENTER' && (
                <motion.div 
                  key={`arrow-${completedChanges}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.35, scale: 1 }}
                  className="absolute pointer-events-none text-white/40"
                  style={{
                    transform: `translate(${ballCoords.x * 2.2}px, ${ballCoords.y * 2.2}px)`
                  }}
                >
                  <div className="w-40 h-40 rounded-full border border-white/20 flex items-center justify-center animate-ping" />
                </motion.div>
              )}

              {/* SHADOW ON GROUND (Scales realistically with elevation / approach) */}
              <motion.div 
                className="absolute rounded-full bg-black/70 blur-md pointer-events-none"
                animate={{
                  x: `${ballCoords.x * 2.5}px`,
                  y: `${(ballCoords.y * 2.0) + (ballCoords.scale * 45)}px`,
                  width: `${60 * ballCoords.scale}px`,
                  height: `${22 * ballCoords.scale}px`,
                  opacity: isFeintActive ? 0.9 : 0.65,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 140,
                  damping: 18
                }}
              />

              {/* MOVING BALL SPHERE WITH 3D TRAJECTORY */}
              <motion.div
                className="absolute w-28 h-28 sm:w-36 sm:h-36 z-20 cursor-pointer"
                animate={{
                  x: `${ballCoords.x * 2.5}px`,
                  y: `${ballCoords.y * 2.0}px`,
                  scale: ballCoords.scale,
                  rotate: ballCoords.rotate
                }}
                transition={{
                  type: isFeintActive ? 'tween' : 'spring',
                  stiffness: isFeintActive ? 320 : 130,
                  damping: isFeintActive ? 15 : 18,
                  duration: isFeintActive ? 0.25 : undefined
                }}
              >
                {renderBallSvg()}

                {/* FEINT FLASH ALERT */}
                {isFeintActive && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 1 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    className="absolute inset-0 rounded-full border-4 border-red-500 bg-red-500/20"
                  />
                )}
              </motion.div>

              {/* TAP REACTION FEEDBACK BADGE (IF TAPPED) */}
              {drillMode === 'TAP_REACTION' && lastTapReactionMs && (
                <motion.div
                  key={`tap-${lastTapReactionMs}-${completedChanges}`}
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-1/4 bg-emerald-500 text-black px-5 py-2 rounded-2xl font-mono font-black text-lg shadow-[0_0_30px_rgba(16,185,129,0.7)] pointer-events-none z-30"
                >
                  ⚡ {lastTapReactionMs} ms
                </motion.div>
              )}

              {/* SO VISION REACTION FEEDBACK BADGE (AUTO-MEASURED BY AI CAMERA) */}
              {drillMode === 'SO_VISION' && lastVisionResult && (
                <motion.div
                  key={`vision-badge-${lastVisionResult.rep}-${lastVisionResult.timeMs}`}
                  initial={{ opacity: 0, y: -25, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute top-1/4 px-6 py-2.5 rounded-2xl font-mono font-black text-lg shadow-2xl pointer-events-none z-30 flex items-center gap-2.5 border ${
                    lastVisionResult.isFalseStart
                      ? 'bg-red-500 text-white border-red-400 shadow-[0_0_35px_rgba(239,68,68,0.7)]'
                      : lastVisionResult.isCorrect
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.7)]'
                      : 'bg-amber-500 text-black border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.7)]'
                  }`}
                >
                  <span>⚡ {lastVisionResult.timeMs} ms</span>
                  <span className="text-xs uppercase px-2 py-0.5 rounded-lg bg-black/20 font-bold">
                    {lastVisionResult.isFalseStart 
                      ? '⚠️ Anticipación' 
                      : lastVisionResult.isCorrect 
                      ? '✓ Correcto' 
                      : '↔ Desvío'}
                  </span>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM INSTRUCTION PILL (ATHLETE GUIDANCE) */}
      <footer className="p-4 sm:p-6 z-30 pointer-events-auto flex flex-col items-center gap-2">
        {showInstructionPill && (
          <div className="bg-black/80 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl max-w-lg w-full text-center shadow-2xl">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <span className={`text-xs sm:text-sm font-black uppercase tracking-wider ${
                currentDirection.key === 'FEINT' 
                  ? 'text-red-400 animate-pulse' 
                  : 'text-[#D4AF37]'
              }`}>
                {currentDirection.key === 'FEINT' ? '⚠️ ¡FINTA / AMAGO!' : currentDirection.label}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase">
                ({drillMode === 'SO_VISION' ? 'SO VISION™ IA' : drillMode === 'MIRROR' ? 'Modo Espejo' : drillMode === 'OPPOSITE' ? 'Oposición' : 'Reacción'})
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-medium">
              {drillMode === 'OPPOSITE' 
                ? currentDirection.athleteActionOpposite 
                : currentDirection.athleteActionMirror}
            </p>
          </div>
        )}

        {drillMode === 'TAP_REACTION' && (
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em]">
            👉 Toca la pantalla al cambiar el balón para medir tus ms
          </p>
        )}

        {drillMode === 'SO_VISION' && (
          <div className="bg-black/80 backdrop-blur-md border border-[#D4AF37]/30 px-5 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
            <Scan size={14} className={isAwaitingVisionReaction ? "text-[#D4AF37] animate-spin" : "text-emerald-400 animate-pulse"} />
            <span className="text-[11px] font-black uppercase tracking-wider text-white">
              {isAwaitingVisionReaction 
                ? '¡Sensor IA Activo! Muévete en dirección al balón' 
                : lastVisionResult 
                ? `Último registro: ${lastVisionResult.timeMs} ms (${lastVisionResult.isCorrect ? 'Dirección Correcta' : 'Desvío Lateral'})` 
                : 'SO VISION™ Calibrado: Muévete en cuanto cambie el balón'}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
};
