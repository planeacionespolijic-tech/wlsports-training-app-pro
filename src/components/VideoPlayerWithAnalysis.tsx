import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Maximize2,
  Minimize2,
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight, 
  Gauge, 
  Eye, 
  Grid, 
  Flame,
  Check,
  Smartphone,
  Monitor
} from 'lucide-react';

interface VideoPlayerWithAnalysisProps {
  src: string;
  title?: string;
  onFrameCapture?: (dataUrl: string, timestamp: number) => void;
  className?: string;
  showQuickToolbar?: boolean;
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
  showQuickToolbar = true,
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
  const [isTheaterFullscreen, setIsTheaterFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<any>(null);

  const effectiveFullscreen = isFullscreen || isTheaterFullscreen;

  // Synchronize playback speed and reset on src change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, src]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = playbackRate;
    }
  }, [src]);

  // Handle Fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const nativeFs = !!document.fullscreenElement;
      setIsFullscreen(nativeFs);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle Escape key for theater fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTheaterFullscreen) {
        setIsTheaterFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTheaterFullscreen]);

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
    // Standard ~30fps (~0.033s per frame)
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
    if (effectiveFullscreen) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(console.error);
      }
      setIsTheaterFullscreen(false);
    } else {
      setIsTheaterFullscreen(true);
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          // Native fullscreen failed/blocked by iframe; theater fullscreen fallback remains active
        });
      }
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
      }, 3500);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className={
        effectiveFullscreen
          ? "fixed inset-0 z-[9999] w-screen h-screen bg-black flex flex-col justify-between overflow-hidden select-none"
          : `relative bg-black rounded-2xl overflow-hidden select-none group border border-zinc-800 ${className}`
      }
    >
      {/* Top Header Bar when in Fullscreen */}
      {effectiveFullscreen && (
        <div className="bg-gradient-to-b from-black via-black/90 to-transparent p-3 sm:p-4 z-30 flex items-center justify-between gap-3 text-white transition-opacity duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg shrink-0">
              <Eye size={18} />
            </span>
            <div className="truncate">
              <h3 className="font-black text-sm text-white truncate">{title || "Videoanálisis Biomecánico"}</h3>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1 text-zinc-300 font-semibold">
                  {isPortrait ? <Smartphone size={12} className="text-[#D4AF37]" /> : <Monitor size={12} className="text-[#D4AF37]" />}
                  {isPortrait ? "Formato Vertical" : "Formato Horizontal"}
                </span>
                {playbackRate < 1.0 && (
                  <span className="text-amber-400 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">
                    {playbackRate}x Lenta
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Grid Toggle in Fullscreen Header */}
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                showGrid 
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                  : 'bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
              }`}
              title="Alternar cuadrícula de alineación biomecánica"
            >
              <Grid size={15} />
              <span className="hidden sm:inline">Guía Postural</span>
            </button>

            {/* Exit Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              title="Salir de pantalla completa (Esc)"
            >
              <Minimize2 size={16} />
              <span>Cerrar Pantalla Grande</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Video Stage */}
      <div className={
        effectiveFullscreen 
          ? "flex-1 w-full h-full relative flex items-center justify-center overflow-hidden bg-black" 
          : "relative w-full flex items-center justify-center bg-black overflow-hidden"
      }>
        <video
          ref={videoRef}
          src={src}
          playsInline
          className={
            effectiveFullscreen
              ? "max-w-full max-h-full w-auto h-auto object-contain bg-black cursor-pointer"
              : isPortrait
              ? "w-full max-h-[520px] aspect-[9/16] object-contain bg-black cursor-pointer mx-auto"
              : "w-full h-full aspect-video object-contain bg-black cursor-pointer"
          }
          onClick={togglePlay}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
                setIsPortrait(videoRef.current.videoHeight > videoRef.current.videoWidth);
              }
            }
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
              <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/40" />
            </div>
            <div className="border-b border-[#D4AF37]/50 relative">
              <div className="absolute bottom-1 left-1 text-[9px] text-[#D4AF37]/80 font-mono">2/3</div>
            </div>
            <div className="border-r border-b border-[#D4AF37]/50" />
            <div className="border-r border-b border-[#D4AF37]/50 relative">
              {/* Central plumbline for spinal / balance axis */}
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

        {/* Center Play Button Overlay when Paused */}
        {!isPlaying && (
          <div 
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer z-10"
          >
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/90 text-black flex items-center justify-center pl-1 shadow-2xl hover:scale-110 active:scale-95 transition-transform">
              <Play size={32} className="fill-current" />
            </div>
          </div>
        )}

        {/* Top Floating Badge in Inline Mode */}
        {!effectiveFullscreen && title && (
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span className="text-xs font-bold text-white truncate max-w-[200px]">{title}</span>
            {isPortrait && (
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                Vertical
              </span>
            )}
          </div>
        )}

        {/* Fullscreen Trigger in Inline Mode */}
        {!effectiveFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 p-2 bg-black/75 hover:bg-black text-white hover:text-[#D4AF37] rounded-xl border border-white/10 backdrop-blur-md z-10 transition-all shadow-lg active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Ver en pantalla completa"
          >
            <Maximize2 size={16} />
            <span className="hidden sm:inline">Pantalla Grande</span>
          </button>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div 
        className={`${
          effectiveFullscreen 
            ? 'bg-black/95 border-t border-zinc-800 px-4 pt-3 pb-4 z-30' 
            : 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/85 to-transparent px-3.5 pt-8 pb-3 z-20'
        } transition-opacity duration-300 ${showControls || !isPlaying || effectiveFullscreen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Scrubber / Progress Bar & Time */}
        <div className="space-y-1 mb-2.5">
          <div className="relative flex items-center group/slider">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] focus:outline-none"
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 px-0.5">
            <span className="text-[#D4AF37] font-bold">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left group: Playback & Frame Stepping */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={togglePlay}
              className="p-2.5 bg-zinc-900/90 hover:bg-[#D4AF37] text-white hover:text-black rounded-xl transition-colors border border-zinc-800 shadow-md active:scale-95"
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
              className="px-2.5 py-1.5 bg-zinc-900/80 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] text-zinc-300 rounded-xl transition-colors border border-zinc-800 text-xs font-bold flex items-center gap-1 active:scale-95"
              title="Cuadro anterior (-1 frame)"
            >
              <ChevronLeft size={15} />
              <span className="text-[11px] font-mono">-1F</span>
            </button>

            {/* Frame Forward (Precision) */}
            <button
              onClick={() => stepFrame(1)}
              className="px-2.5 py-1.5 bg-zinc-900/80 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] text-zinc-300 rounded-xl transition-colors border border-zinc-800 text-xs font-bold flex items-center gap-1 active:scale-95"
              title="Siguiente cuadro (+1 frame)"
            >
              <span className="text-[11px] font-mono">+1F</span>
              <ChevronRight size={15} />
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
            {/* Quick Slow Motion Pills (1-Tap on mobile) */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setPlaybackRate(0.25)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all ${
                  playbackRate === 0.25 
                    ? 'bg-amber-500 text-black shadow-md scale-105' 
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Cámara ultra lenta (0.25x)"
              >
                0.25x
              </button>
              <button
                onClick={() => setPlaybackRate(0.5)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all ${
                  playbackRate === 0.5 
                    ? 'bg-amber-500 text-black shadow-md scale-105' 
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Cámara lenta 50% (0.5x)"
              >
                0.5x
              </button>
              <button
                onClick={() => setPlaybackRate(1.0)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all ${
                  playbackRate === 1.0 
                    ? 'bg-[#D4AF37] text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Velocidad normal (1x)"
              >
                1x
              </button>
            </div>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-xl transition-colors border ${
                showGrid 
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800'
              }`}
              title="Guía de alineación y cuadrícula biomecánica"
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
              className={`p-2 rounded-xl transition-colors border ${
                effectiveFullscreen 
                  ? 'bg-red-600/20 text-red-300 border-red-500/40' 
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
              }`}
              title={effectiveFullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
            >
              {effectiveFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Biomechanical Analysis Bar (When in inline mode) */}
      {showQuickToolbar && !effectiveFullscreen && (
        <div className="bg-zinc-950 border-t border-zinc-800/80 p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-zinc-400">
              <Gauge size={14} className="text-[#D4AF37]" />
              <span>Cámara Lenta:</span>
            </div>
            {playbackRate < 1.0 && (
              <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1 animate-pulse">
                <Flame size={10} /> {playbackRate}x activo
              </span>
            )}
          </div>

          {/* Quick Speed Pills */}
          <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
            {[
              { val: 0.1, label: '0.1x' },
              { val: 0.25, label: '0.25x' },
              { val: 0.5, label: '0.5x' },
              { val: 0.75, label: '0.75x' },
              { val: 1.0, label: '1.0x' },
            ].map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => setPlaybackRate(item.val)}
                className={`py-2 px-2.5 rounded-xl text-xs font-black font-mono transition-all text-center border ${
                  playbackRate === item.val
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)] scale-[1.02]'
                    : item.val < 1.0
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-amber-300/90 border-amber-500/30'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Frame Stepping & Biomechanical Grid */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-900">
            <div className="flex items-center gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => stepFrame(-1)}
                className="flex-1 py-2 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800 flex items-center justify-center gap-1 active:scale-95 transition-all"
                title="Retroceder 1 cuadro (~33ms)"
              >
                <ChevronLeft size={14} className="text-[#D4AF37]" />
                <span>-1 Frame</span>
              </button>
              <button
                type="button"
                onClick={() => stepFrame(1)}
                className="flex-1 py-2 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800 flex items-center justify-center gap-1 active:scale-95 transition-all"
                title="Avanzar 1 cuadro (~33ms)"
              >
                <span>+1 Frame</span>
                <ChevronRight size={14} className="text-[#D4AF37]" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all active:scale-95 ${
                showGrid
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
              }`}
              title="Cuadrícula postural de tercios y eje central"
            >
              <Grid size={14} />
              <span className="hidden sm:inline">Guía Postural</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center gap-1.5 transition-all active:scale-95"
              title="Abrir en pantalla completa para análisis detallado"
            >
              <Maximize2 size={14} />
              <span>Pantalla Completa</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
