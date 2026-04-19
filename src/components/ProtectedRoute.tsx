import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  allowedRoles, 
  children 
}) => {
  const { user, userProfile, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="text-[#D4AF37] animate-spin mb-4" size={48} />
        <p className="text-zinc-500 font-medium animate-pulse uppercase tracking-[0.2em] text-[10px]">Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle blocked/deleted status
  if (userProfile && (userProfile.status === 'blocked' || userProfile.status === 'deleted')) {
    const handleLogoutSession = async () => {
      await logout();
    };

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="text-red-500" size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2 uppercase italic tracking-tighter">Acceso Restringido</h1>
        <p className="text-zinc-500 max-w-xs mb-8 text-sm">
          Tu cuenta ha sido {userProfile.status === 'blocked' ? 'bloqueada' : 'eliminada'} por el administrador. 
          Si crees que esto es un error, contacta con soporte.
        </p>
        <button 
          onClick={handleLogoutSession}
          className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all border border-zinc-800 uppercase tracking-widest text-xs"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  // Handle role validation
  if (allowedRoles && userProfile) {
     // superadmin matches trainer for UI routes
     const effectiveRole = userProfile.role === 'superadmin' ? 'trainer' : userProfile.role;
     if (!allowedRoles.includes(effectiveRole as UserRole) && !allowedRoles.includes(userProfile.role)) {
        if (userProfile.role === 'client') {
          return <Navigate to="/client-dashboard" replace />;
        }
        return <Navigate to="/trainer-dashboard" replace />;
     }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
