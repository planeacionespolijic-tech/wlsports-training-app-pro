import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, Sparkles, CheckCircle2, ArrowDownToLine, ExternalLink, AlertCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC<{ className?: string; variant?: 'floating' | 'inline' }> = ({ 
  className = '',
  variant = 'floating' 
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Detect if running inside an iframe (e.g. AI Studio preview)
    try {
      if (typeof window !== 'undefined' && window.self !== window.top) {
        setIsInIframe(true);
      }
    } catch {
      setIsInIframe(true);
    }

    // 2. Check if early beforeinstallprompt was already captured on window
    const earlyPrompt = (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;
    if (earlyPrompt) {
      setDeferredPrompt(earlyPrompt);
    }

    const handlePromptReady = () => {
      const p = (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;
      if (p) {
        setDeferredPrompt(p);
      }
    };

    window.addEventListener('pwa-prompt-ready', handlePromptReady);

    // 3. Detect if the app is already installed or running in standalone mode
    try {
      const isStandaloneActive =
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: window-controls-overlay)').matches) ||
        (typeof window !== 'undefined' && (window.navigator as unknown as { standalone?: boolean }).standalone === true) ||
        (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://'));

      if (isStandaloneActive) {
        setIsStandalone(true);
      }
    } catch {
      // Safe fallback
    }

    // 4. Detect iOS device (iPhone / iPad / iPod)
    try {
      const ua = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent 
        ? window.navigator.userAgent.toLowerCase() 
        : '';
      const isApple = /iphone|ipad|ipod/.test(ua) || 
        (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isApple);
    } catch {
      // Safe fallback
    }

    // 5. Listen to native beforeinstallprompt event in Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      (window as unknown as { deferredPrompt?: null }).deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // If already running inside installed standalone app, hide button
  if (isStandalone && !installedSuccess) {
    return null;
  }

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;

    if (promptToUse) {
      // Android / Chrome: trigger native OS installation prompt
      try {
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === 'accepted') {
          setInstalledSuccess(true);
          setDeferredPrompt(null);
          (window as unknown as { deferredPrompt?: null }).deferredPrompt = null;
          setShowModal(false);
          setTimeout(() => setIsStandalone(true), 2500);
        }
      } catch (err) {
        console.warn('Error during native install prompt:', err);
        setShowModal(true);
      }
    } else {
      // Show guidance modal with instructions & direct actions
      setShowModal(true);
    }
  };

  const handleOpenDirectURL = () => {
    const currentUrl = window.location.href;
    try {
      window.open(currentUrl, '_blank');
    } catch {
      window.location.href = currentUrl;
    }
  };

  return (
    <>
      {/* Main Install App Button */}
      {variant === 'inline' ? (
        <button
          id="btn-pwa-install-inline"
          onClick={handleInstallClick}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-900/30 active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
          <span>Instalar App Nativa</span>
        </button>
      ) : (
        <div
          id="pwa-install-button-wrapper"
          className="fixed bottom-20 right-4 sm:right-6 md:bottom-8 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <button
            id="btn-pwa-install-action"
            onClick={handleInstallClick}
            className="group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-950/95 border border-[#D4AF37]/60 hover:border-[#D4AF37] text-white shadow-2xl backdrop-blur-xl hover:shadow-[#D4AF37]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37] to-amber-600 text-black flex items-center justify-center font-black shadow-md">
              <Download className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white tracking-wide uppercase">Instalar App</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                  Nativa
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                {isIOS ? 'iPhone / iPad' : 'Android & Chrome'}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Guided Install Modal */}
      {showModal && (
        <div 
          id="pwa-install-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-[#D4AF37]/50 p-6 shadow-2xl text-white relative overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/owl_vision_logo.jpg" 
                  alt="Owl Vision Pro WLSPORTS" 
                  className="w-10 h-10 rounded-xl object-cover border-2 border-[#D4AF37]/50 shadow-md shrink-0 bg-black"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-bold text-sm text-white">OWL VISION PRO</h3>
                  <p className="text-[11px] text-[#D4AF37] font-semibold">WLSPORTS WebAPK Oficial</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If in iframe: show warning and one-click open button */}
            {isInIframe && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#D4AF37] mb-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Estás en el visor de AI Studio</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed mb-3">
                  Google Chrome bloquea la instalación de aplicaciones nativas cuando se cargan dentro de un marco (iframe). Para instalar la app en tu teléfono, ábrela en una pestaña directa:
                </p>
                <button
                  onClick={handleOpenDirectURL}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en Pestaña Directa</span>
                </button>
              </div>
            )}

            <div className="space-y-3 my-4 text-xs text-zinc-300">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">1. Pulsa el botón "Compartir"</p>
                      <p className="text-zinc-400 text-[11px] mt-0.5">
                        En la barra inferior de Safari, toca el icono de <strong>Compartir</strong> (cuadrado con flecha hacia arriba).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">2. "Agregar a pantalla de inicio"</p>
                      <p className="text-zinc-400 text-[11px] mt-0.5">
                        Desplázate por el menú y pulsa <strong>"Agregar a pantalla de inicio"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">3. Toca "Agregar"</p>
                      <p className="text-zinc-400 text-[11px] mt-0.5">
                        Confirma arriba a la derecha. Tendrá su propio icono de app nativa sin barras de navegación.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Android direct prompt if available */}
                  {(deferredPrompt || (typeof window !== 'undefined' && (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt)) ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200">
                      <p className="font-bold text-emerald-300 text-xs mb-1">¡Instalador nativo listo!</p>
                      <p className="text-zinc-300 text-[11px] mb-3">
                        Pulsa el botón de abajo para que Google Chrome compile e instale el paquete nativo WebAPK con el logo oficial en tu cajón de aplicaciones.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                          <ArrowDownToLine className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">1. Menú de Google Chrome (⋮)</p>
                          <p className="text-zinc-400 text-[11px] mt-0.5">
                            En la esquina superior derecha de tu navegador Chrome, toca los <strong>tres puntos verticales (⋮)</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Download className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">2. Selecciona "Instalar aplicación"</p>
                          <p className="text-zinc-400 text-[11px] mt-0.5">
                            Pulsa <strong>"Instalar aplicación"</strong> (o <strong>"Instalar WLSPORTS"</strong>). Chrome descargará e instalará el paquete WebAPK con el logo oficial.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">3. Aparece en el cajón de apps</p>
                          <p className="text-zinc-400 text-[11px] mt-0.5">
                            Se instalará como app del sistema (sin el icono pequeño de Chrome en la esquina) y con pantalla de carga propia.
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                        <p className="font-semibold text-[#D4AF37] mb-1">⚠️ ¿Tienes un acceso directo viejo?</p>
                        <p className="text-zinc-300 leading-relaxed">
                          Si antes creaste un acceso directo (con el icono pequeño de Chrome), <strong>elimínalo primero de la pantalla de inicio</strong>. Luego recarga esta página en Chrome y selecciona <strong>"Instalar aplicación"</strong>.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-4">
              {(deferredPrompt || (typeof window !== 'undefined' && (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt)) && (
                <button
                  id="btn-retry-native-prompt"
                  onClick={async () => {
                    const p = deferredPrompt || (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;
                    if (p) {
                      setShowModal(false);
                      try {
                        await p.prompt();
                        const { outcome } = await p.userChoice;
                        if (outcome === 'accepted') {
                          setInstalledSuccess(true);
                          setDeferredPrompt(null);
                          (window as unknown as { deferredPrompt?: null }).deferredPrompt = null;
                        }
                      } catch (err) {
                        console.warn(err);
                      }
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-black font-extrabold text-xs transition active:scale-95 shadow-lg shadow-amber-900/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Instalar Aplicación Nativa Ahora</span>
                </button>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
