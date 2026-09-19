import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight, 
  Gauge, 
  Eye, 
  Grid, 
  Sparkles,
  Download,
  Flame,
  Check
} from 'lucide-react';

interface VideoPlayerWithAnalysisProps {
  src: string;
  title?: string;
  onFrameCapture?: (dataUrl: string, timestamp: number) => void;
  className?: string;
}

const SPEED_OPTIONS = [
  { label: '0.1x', value: 0.1, desc: 'Ultra lenta' },
  { label: '0.25x', value: 0.25, desc: 'Cámara lenta máx' },
  { label: '0.5x', value: 0.5, desc: 'Cámara lenta 50%' },
  { label: '0.75x', value: 0.75, desc: 'Lenta moderada' },
  { label: '1.0x', value: 1.0, desc: 'Velocidad normal' },
  { label: '1.5x', value: 1.5, desc: 'Rápida' },
  { label: '2.0x', value: 2.0, desc: 'Doble velocidad' },
];

export const VideoPlayerWithAnalysis: React.FC<VideoPlayerWithAnalysisProps> = ({
  src,
  title,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<any>(null);

  // Synchronize playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle Fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    // Assuming standard 30fps (~0.033s per frame)
    const frameTime = 1 / 30;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + frames * frameTime));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const jumpSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(console.error);
    } else {
      await document.exitFullscreen().catch(console.error);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00.00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className={`relative bg-black rounded-2xl overflow-hidden select-none group border border-zinc-800 ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        playsInline
        className="w-full h-full object-contain bg-black cursor-pointer aspect-video"
        onClick={togglePlay}
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Grid Overlay for Biomechanical Posture Alignment */}
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-70">
          <div className="border-r border-b border-[#D4AF37]/50 relative">
            <div className="absolute bottom-1 right-1 text-[9px] text-[#D4AF37]/80 font-mono">1/3</div>
          </div>
          <div className="border-r border-b border-[#D4AF37]/50 relative">
            <div className="absolute bottom-1 right-1 text-[9px] text-[#D4AF37]/80 font-mono">Eje</div>
          </div>
          <div className="border-b border-[#D4AF37]/50" />
          <div className="border-r border-b border-[#D4AF37]/50" />
          <div className="border-r border-b border-[#D4AF37] relative flex items-center justify-center">
            {/* Center crosshair */}
            <div className="w-4 h-4 border border-dashed border-red-500 rounded-full" />
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full absolute" />
          </div>
          <div className="border-b border-[#D4AF37]/50" />
          <div className="border-r border-[#D4AF37]/50" />
          <div className="border-r border-[#D4AF37]/50" />
          <div />
        </div>
      )}

      {/* Top Bar Indicators (Speed badge & Frame accuracy) */}
      <div className={`absolute top-3 left-3 right-3 flex items-center justify-between z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          {playbackRate < 1 && (
            <span className="bg-red-600/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse tracking-wider">
              <Flame size={12} /> CÁMARA LENTA {playbackRate}x
            </span>
          )}
          {title && (
            <span className="bg-black/70 backdrop-blur-md text-zinc-200 text-xs font-semibold px-3 py-1 rounded-full border border-zinc-800 truncate max-w-[200px] sm:max-w-xs">
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-zinc-800 text-[11px] font-mono text-[#D4AF37]">
          <span>{formatTime(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Center Big Play Button (Visible on Pause) */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 bg-[#D4AF37]/90 text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform z-20 cursor-pointer"
          aria-label="Reproducir video"
        >
          <Play size={28} className="fill-current ml-1" />
        </button>
      )}

      {/* Bottom Control Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/85 to-transparent px-3.5 pt-8 pb-3 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Scrubber / Progress Bar */}
        <div className="relative flex items-center mb-3 group/slider">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] focus:outline-none"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Left group: Playback & Frame Stepping */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={togglePlay}
              className="p-2 bg-zinc-900/80 hover:bg-[#D4AF37] text-white hover:text-black rounded-xl transition-colors border border-zinc-800"
              title={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-current" />}
            </button>

            {/* Jump -5s */}
            <button
              onClick={() => jumpSeconds(-5)}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-colors border border-zinc-800"
              title="Retroceder 5 segundos"
            >
              <RotateCcw size={16} />
            </button>

            {/* Frame Backward (Precision) */}
            <button
              onClick={() => stepFrame(-1)}
              className="px-2 py-1.5 bg-zinc-900/80 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] text-zinc-300 rounded-xl transition-colors border border-zinc-800 text-xs font-bold flex items-center gap-1"
              title="Cuadro anterior (-1 frame)"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline text-[10px] font-mono">Frame</span>
            </button>

            {/* Frame Forward (Precision) */}
            <button
              onClick={() => stepFrame(1)}
              className="px-2 py-1.5 bg-zinc-900/80 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] text-zinc-300 rounded-xl transition-colors border border-zinc-800 text-xs font-bold flex items-center gap-1"
              title="Siguiente cuadro (+1 frame)"
            >
              <span className="hidden sm:inline text-[10px] font-mono">Frame</span>
              <ChevronRight size={14} />
            </button>

            {/* Jump +5s */}
            <button
              onClick={() => jumpSeconds(5)}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-colors border border-zinc-800"
              title="Avanzar 5 segundos"
            >
              <RotateCw size={16} />
            </button>
          </div>

          {/* Right group: Speed Selector, Grid Toggle, Volume, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-xl transition-colors border ${
                showGrid 
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800'
              }`}
              title="Guía de alineación y cuadrícula"
            >
              <Grid size={16} />
            </button>

            {/* Speed Selector Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all border text-xs font-bold ${
                  playbackRate < 1 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                    : 'bg-zinc-900/80 text-zinc-300 hover:text-white border-zinc-800'
                }`}
                title="Velocidad y cámara lenta"
              >
                <Gauge size={14} />
                <span className="font-mono">{playbackRate}x</span>
              </button>

              {/* Speed Menu Popup */}
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden py-1.5 z-30">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest text-zinc-500 border-b border-zinc-800/80 mb-1">
                    Velocidad de Análisis
                  </div>
                  {SPEED_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setPlaybackRate(opt.value);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-zinc-800 transition-colors ${
                        playbackRate === opt.value ? 'text-[#D4AF37] font-bold bg-[#D4AF37]/10' : 'text-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-mono font-bold">{opt.label}</span>
                        <span className="text-[10px] text-zinc-500">{opt.desc}</span>
                      </div>
                      {playbackRate === opt.value && <Check size={14} className="text-[#D4AF37]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/80 px-2 py-1.5 rounded-xl border border-zinc-800">
              <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-colors border border-zinc-800"
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
