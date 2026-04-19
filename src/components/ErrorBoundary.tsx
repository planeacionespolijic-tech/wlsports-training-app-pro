import * as React from 'react';
import { ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
  state: State = { hasError: false, error: null };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocurrió un error inesperado al cargar la aplicación.";
      
      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error?.includes("Missing or insufficient permissions")) {
            errorMessage = "No tienes permisos suficientes para acceder a este recurso.";
          } else {
            errorMessage = parsedError.error || this.state.error.message;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-black mb-4 tracking-tighter uppercase">¡Vaya! Algo salió mal</h1>
          <p className="text-zinc-400 mb-8 max-w-md text-balance">
            {errorMessage}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#D4AF37] text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all"
            >
              <RefreshCcw size={20} />
              Reintentar
            </button>
            <button 
              onClick={() => (this as any).setState({ hasError: false, error: null })}
              className="px-8 py-3 rounded-xl font-bold text-zinc-400 hover:text-white transition-all"
            >
              Volver a intentar
            </button>
          </div>
          
          <div className="mt-12 pt-12 border-t border-zinc-900 w-full max-w-sm">
            <p className="text-xs text-zinc-600 font-mono">
              DEBUG_INFO: {new Date().toISOString()}
            </p>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
