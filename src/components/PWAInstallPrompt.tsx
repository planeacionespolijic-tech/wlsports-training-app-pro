import React, { useState, useEffect } from 'react';
import { 
  Download, Smartphone, Share2, PlusSquare, X, Sparkles, 
  CheckCircle2, Info, ExternalLink, ArrowDownToLine, Globe, Apple, Play
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  // App URLs for external/direct installation
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const publicShareUrl = 'https://ais-pre-t7zuerz7ayqh4khz6xwne3-209266619043.us-east1.run.app';

  useEffect(() => {
    // 1. Detect iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // 2. Detect if running inside standalone PWA (already installed)
    try {
      const isStandaloneMode =
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator && (window.navigator as unknown as { standalone?: boolean }).standalone === true) ||
        (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://'));

      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    } catch {
      // Ignore
    }

    // 3. Detect Platform (iOS vs Android vs Desktop)
    try {
      const ua = (typeof window !== 'undefined' && window.navigator && window.navigator.userAgent) 
        ? window.navigator.userAgent.toLowerCase() 
        : '';
      const isIOSDevice = /iphone|ipad|ipod/.test(ua) || 
        (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroidDevice = /android/.test(ua);

      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);
    } catch {
      // Ignore
    }

    // 4. Listen to native beforeinstallprompt event (Chrome, Edge, Android Browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstalledSuccessfully(true);
      setTimeout(() => {
        setIsDismissed(true);
        setShowModal(false);
      }, 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // If running inside the installed standalone PWA, no need for the install banner
  if (isInstalled && !installedSuccessfully) {
    return null;
  }

  const handleInstallClick = async () => {
    // If we have the native prompt ready (direct 1-click install on Android/Desktop Chrome)
    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstalledSuccessfully(true);
          setDeferredPrompt(null);
          setTimeout(() => {
            setIsDismissed(true);
            setShowModal(false);
          }, 2000);
        }
      } catch (err) {
        console.warn('Native install prompt failed or was cancelled:', err);
        // Fallback to visual modal
        setShowModal(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Open modal with direct instructions, full direct link, and manual install triggers
      setShowModal(true);
    }
  };

  const handleOpenDirectApp = () => {
    window.open(publicShareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Floating Install Button / Banner */}
      {!isDismissed && (
        <div 
          id="pwa-install-banner"
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-40 max-w-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-zinc-950/95 border border-[#D4AF37]/50 p-3.5 shadow-2xl backdrop-blur-xl transition-all hover:border-[#D4AF37] flex items-center justify-between gap-3 group">
            {/* Ambient gold glow */}
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#D4AF37]/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src="/owl_vision_logo.jpg" 
                alt="Owl Vision Pro WLSPORTS" 
                className="w-10 h-10 rounded-xl object-cover border border-[#D4AF37]/50 shadow-md shrink-0 group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wide uppercase">Instalar OWL VISION PRO</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                    WLSPORTS
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {deferredPrompt 
                    ? '1 toque para descargar e instalar' 
                    : isIOS 
                    ? 'Instalar en iPhone / iPad' 
                    : 'Descargar e instalar en tu celular'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="btn-install-pwa"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-900/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
                <span>{isInstalling ? 'Instalando...' : 'Instalar'}</span>
              </button>

              <button
                id="btn-dismiss-pwa"
                onClick={() => setIsDismissed(true)}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/60 transition-colors"
                title="Cerrar"
                aria-label="Cerrar aviso de instalación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrete Reopen Pill if dismissed */}
      {isDismissed && (
        <button
          id="btn-reopen-install-pwa"
          onClick={() => setShowModal(true)}
          className="fixed bottom-24 right-4 md:right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-[#D4AF37]/60 text-[#D4AF37] text-[11px] font-bold shadow-xl backdrop-blur hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          title="Descargar e Instalar App Nativa WLSPORTS"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>Descargar App</span>
        </button>
      )}

      {/* Comprehensive Install & Download Modal */}
      {showModal && (
        <div 
          id="pwa-install-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-zinc-950 border border-[#D4AF37]/50 p-6 shadow-2xl text-white relative overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-zinc-900 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <ArrowDownToLine className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Descargar e Instalar WLSPORTS
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </h3>
                  <p className="text-[11px] text-zinc-400">Aplicación nativa para tu dispositivo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success state */}
            {installedSuccessfully ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">¡App Instalada con Éxito!</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  WLSPORTS ya está en la pantalla principal de tu teléfono. Puedes abrirla directamente como cualquier app nativa.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Highlight banner with 1-click install if available */}
                {deferredPrompt && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#D4AF37]/10 to-transparent border border-[#D4AF37]/40 space-y-2">
                    <p className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Tu navegador soporta instalación directa inmediata
                    </p>
                    <button
                      onClick={handleInstallClick}
                      disabled={isInstalling}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-900/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isInstalling ? 'Instalando...' : 'Descargar e Instalar Ahora (1 Toque)'}</span>
                    </button>
                  </div>
                )}

                {/* If inside preview iframe (e.g. AI Studio preview panel), advise opening in full tab / phone browser */}
                {isInIframe && (
                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-[#D4AF37]/30 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Globe className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">¿Estás en la vista previa?</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Para instalar la app directamente en tu teléfono o pantalla de inicio, abre el enlace oficial en el navegador de tu celular:
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenDirectApp}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir App en Pestaña Completa</span>
                    </button>
                  </div>
                )}

                {/* Platform Specific Steps */}
                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isIOS ? 'Pasos para iPhone / iPad (Safari)' : 'Pasos para Android (Chrome)'}
                  </p>

                  {isIOS ? (
                    /* iOS Instructions */
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">1. Pulsa "Compartir"</p>
                          <p className="text-zinc-400 text-[11px]">En la barra inferior de Safari, toca el icono de Compartir (cuadrado con flecha).</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <PlusSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">2. "Agregar a pantalla de inicio"</p>
                          <p className="text-zinc-400 text-[11px]">Baja en las opciones y selecciona <strong>Agregar a pantalla de inicio</strong>.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">3. Toca "Agregar"</p>
                          <p className="text-zinc-400 text-[11px]">En la esquina superior derecha. Se creará el ícono nativo con logo y pantalla completa.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Android / Chrome Instructions */
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                          <ArrowDownToLine className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Opción 1: Botón Automático</p>
                          <p className="text-zinc-400 text-[11px]">
                            Presiona el botón dorado <strong>"Instalar"</strong>. El sistema descargará e instalará el paquete PWA automáticamente.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Info className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Opción 2: Menú de Chrome (⋮)</p>
                          <p className="text-zinc-400 text-[11px]">
                            Si no aparece la ventana emergente, toca los <strong>tres puntos (⋮)</strong> arriba a la derecha y selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advantages of Native App */}
                  <div className="mt-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <p className="text-[11px] font-bold text-zinc-400 mb-1.5 uppercase">Ventajas de la App instalada:</p>
                    <ul className="text-[11px] text-zinc-400 space-y-1">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Abre a pantalla completa sin barras de navegador</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Acceso instantáneo con un toque desde tu pantalla de inicio</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Funcionamiento rápido y fluido con almacenamiento local</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
                  >
                    Cerrar
                  </button>
                  {deferredPrompt && (
                    <button
                      onClick={handleInstallClick}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs transition active:scale-95 shadow-lg shadow-amber-900/30 cursor-pointer"
                    >
                      Instalar Ahora
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
