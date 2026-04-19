import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { logout } from '../firebase';

interface ProtectedRouteProps {
  user: any;
  userProfile: UserProfile | null;
  loading: boolean;
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  user, 
  userProfile, 
  loading, 
  allowedRoles, 
  children 
}) => {
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="text-[#D4AF37] animate-spin mb-4" size={48} />
        <p className="text-zinc-500 font-medium animate-pulse">Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle blocked/deleted status
  if (userProfile && (userProfile.status === 'blocked' || userProfile.status === 'deleted')) {
    const handleLogout = async () => {
      localStorage.setItem('wlsports_logged_out', 'true');
      await logout();
      window.location.href = '/login';
    };

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="text-red-500" size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
        <p className="text-zinc-500 max-w-xs mb-8">
          Tu cuenta ha sido {userProfile.status === 'blocked' ? 'bloqueada' : 'eliminada'} por el administrador. 
          Si crees que esto es un error, contacta con soporte.
        </p>
        <button 
          onClick={handleLogout}
          className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all border border-zinc-800"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  // Handle role validation
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    // If client tries to access trainer dashboard, redirect to client dashboard
    if (userProfile.role === 'client') {
      return <Navigate to="/dashboard" replace />;
    }
    // If trainer tries to access something restricted, redirect to trainer home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
