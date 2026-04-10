import * as React from 'react';
import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, loginWithGoogle, loginAnonymously, logout, handleFirestoreError, OperationType } from './firebase';
import { TrainerDashboard } from './screens/TrainerDashboard';
import { ClientDashboard } from './screens/ClientDashboard';
import { LoginScreen } from './screens/LoginScreen';
import { RoleSelectorScreen } from './screens/RoleSelectorScreen';
import { WorkoutsScreen } from './screens/WorkoutsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { DeportistasScreen } from './screens/DeportistasScreen';
import { ValoracionScreen } from './screens/ValoracionScreen';
import { ZonasScreen } from './screens/ZonasScreen';
import { AthleteProfileScreen } from './screens/AthleteProfileScreen';
import { SeguimientoScreen } from './screens/SeguimientoScreen';
import { AnamnesisScreen } from './screens/AnamnesisScreen';
import { TestsScreen } from './screens/TestsScreen';
import { VideoAnalysisScreen } from './screens/VideoAnalysisScreen';
import { DiagnosisScreen } from './screens/DiagnosisScreen';
import { PlanningScreen } from './screens/PlanningScreen';
import { KidsModuleScreen } from './screens/KidsModuleScreen';
import { SessionExecutionScreen } from './screens/SessionExecutionScreen';
import { ChallengesScreen } from './screens/ChallengesScreen';
import { TournamentsScreen } from './screens/TournamentsScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { AthleteListScreen } from './screens/AthleteListScreen';
import { TabataScreen } from './screens/TabataScreen';
import { ReactionScreen } from './screens/ReactionScreen';
import { LogIn, LogOut, Loader2, AlertCircle, Users, Home, ShieldAlert } from 'lucide-react';
import { getDoc } from 'firebase/firestore';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocurrió un error inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error.includes("Missing or insufficient permissions")) {
          errorMessage = "No tienes permisos para realizar esta acción.";
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">¡Ups! Algo salió mal</h1>
          <p className="text-zinc-400 mb-6 max-w-md">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#D4AF37] text-black px-6 py-2 rounded-full font-bold"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { ExerciseBankScreen } from './screens/ExerciseBankScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenData, setScreenData] = useState<any>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [userRole, setUserRole] = useState<'trainer' | 'client'>('client');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleNavigate = (screen: string, data: any = null) => {
    setScreenData(data);
    setCurrentScreen(screen);
  };

  useEffect(() => {
    setLoading(true);
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Usuario logueado con redirect:", result.user);
        }
      })
      .catch((error) => {
        console.error("Error en login redirect:", error);
        setAuthError("Error al iniciar sesión con Google. Por favor, intenta de nuevo.");
      })
      .finally(() => {
        // We don't set loading to false here because onAuthStateChanged will handle it
      });
  }, []);

  useEffect(() => {
    const checkAutoLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      const hasLoggedOut = localStorage.getItem('wlsports_logged_out') === 'true';
      
      if (params.get('guest') === 'true' && !user && !loading && !hasLoggedOut) {
        try {
          await loginAnonymously();
        } catch (err) {
          console.error("Auto-login failed:", err);
        }
      }
    };
    checkAutoLogin();
  }, [user, loading]);

  const handleLogout = async () => {
    localStorage.setItem('wlsports_logged_out', 'true');
    await logout();
    setCurrentScreen('home');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        localStorage.removeItem('wlsports_logged_out');
      }
      
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          let userDoc = await getDoc(userRef);
          
          let role: 'trainer' | 'client' = 'client';

          // 1. Account Claiming Logic (for Trainers created by email)
          if (!userDoc.exists() && u.email) {
            const emailRef = doc(db, 'users', u.email.toLowerCase());
            const emailDoc = await getDoc(emailRef);
            if (emailDoc.exists()) {
              const data = emailDoc.data();
              role = data.role || role; // Use existing role if found
              if (role === 'superadmin' as any) {
                role = 'trainer';
              }
              // Link the pre-created account to the real UID
              await setDoc(userRef, { 
                ...data, 
                uid: u.uid,
                lastLogin: serverTimestamp(),
                photoURL: u.photoURL || data.photoURL || null,
                displayName: u.displayName || data.displayName || 'Usuario'
              }, { merge: true });
              userDoc = await getDoc(userRef);
            }
          }

          // 3. Normal Role Fetching
          if (userDoc.exists()) {
            role = userDoc.data().role || role;
            if (role === 'superadmin' as any) {
              role = 'trainer';
            }
          }

          // 4. Update/Create User Document
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email || 'invitado@wlsports.com',
            displayName: u.displayName || 'Invitado',
            photoURL: u.photoURL || null,
            lastLogin: serverTimestamp(),
            role: role,
            isAnonymous: u.isAnonymous,
            status: userDoc.exists() ? (userDoc.data().status || 'active') : 'active'
          }, { merge: true });

          // Set state immediately
          setUserRole(role);
          
          const finalDoc = await getDoc(userRef);
          if (finalDoc.exists()) {
            setUserProfile(finalDoc.data());
          }
        } catch (error) {
          console.error('Auth state error:', error);
          // Don't throw here to avoid infinite loop in ErrorBoundary if it's a transient error
          // handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectAthlete = (athlete: any) => {
    setSelectedAthlete(athlete);
    setCurrentScreen('athlete-profile');
  };

  const isTrainer = userRole === 'trainer';
  const targetUserId = selectedAthlete ? selectedAthlete.id : (user?.uid || '');
  const currentTrainerId = userRole === 'trainer' ? (user?.uid || null) : (userProfile?.trainerId || null);

  const renderScreen = () => {
    if (!user) {
      return <LoginScreen onLogin={loginWithGoogle} onLoginAnonymous={loginAnonymously} externalError={authError} />;
    }

    if (userProfile && (userProfile.status === 'blocked' || userProfile.status === 'deleted')) {
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
            className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      );
    }

    switch (currentScreen) {
      case 'home':
        return (
          <RoleSelectorScreen 
            onSelectRole={(role) => {
              if (role === 'trainer') handleNavigate('trainer-dashboard');
              else handleNavigate('client-dashboard');
            }}
            onLogout={handleLogout}
            user={user}
            currentRole={userRole}
          />
        );
      case 'trainer-dashboard':
        return <TrainerDashboard user={user} onNavigate={handleNavigate} onLogout={handleLogout} onBack={() => handleNavigate('home')} />;
      case 'client-dashboard':
        return <ClientDashboard user={user} onNavigate={handleNavigate} onLogout={handleLogout} onBack={() => handleNavigate('home')} />;
      case 'exercise-bank':
        return (
          <ExerciseBankScreen
            userId={user.uid}
            onBack={() => handleNavigate('trainer-dashboard')}
          />
        );
      case 'entrenamientos':
        return <WorkoutsScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} onNavigate={handleNavigate} userId={targetUserId} trainerId={currentTrainerId} />;
      case 'historial':
        return <HistoryScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} trainerId={currentTrainerId} />;
      case 'informes':
        return <ReportsScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} trainerId={currentTrainerId} />;
      case 'deportistas':
        return <DeportistasScreen 
          onBack={() => handleNavigate('home')} 
          onSelectAthlete={handleSelectAthlete}
          role={userRole}
          userId={user.uid}
        />;
      case 'athlete-profile':
        return <AthleteProfileScreen athlete={selectedAthlete} onBack={() => { setSelectedAthlete(null); handleNavigate('home'); }} onNavigate={handleNavigate} isAdmin={isTrainer} />;
      case 'valoracion':
        return <ValoracionScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} isAdmin={isTrainer} trainerId={currentTrainerId} />;
      case 'zonas':
        return <ZonasScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} trainerId={currentTrainerId} />;
      case 'seguimiento':
        return <SeguimientoScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} trainerId={currentTrainerId} />;
      case 'anamnesis':
        return <AnamnesisScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} isAdmin={isTrainer} trainerId={currentTrainerId} />;
      case 'tests':
        return <TestsScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} isAdmin={isTrainer} trainerId={currentTrainerId} />;
      case 'videoAnalysis':
        return <VideoAnalysisScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} isAdmin={isTrainer} trainerId={currentTrainerId} />;
      case 'diagnostico':
        return <DiagnosisScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} isAdmin={isTrainer} trainerId={currentTrainerId} />;
      case 'planificacion':
        return <PlanningScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} isAdmin={isTrainer} trainerId={currentTrainerId} />;
      case 'kidsModule':
        return <KidsModuleScreen onBack={() => handleNavigate(selectedAthlete ? 'athlete-profile' : 'home')} userId={targetUserId} isAdmin={isTrainer} trainerId={currentTrainerId} />;
      case 'ejecucion-sesion':
        return <SessionExecutionScreen onBack={() => handleNavigate('entrenamientos')} userId={targetUserId} workout={screenData} trainerId={currentTrainerId} />;
      case 'retos':
        return <ChallengesScreen onBack={() => handleNavigate('home')} userId={targetUserId} role={userRole} userProfile={userProfile} />;
      case 'torneos':
        return <TournamentsScreen onBack={() => handleNavigate('home')} userId={targetUserId} role={userRole} />;
      case 'tabata':
        return <TabataScreen onBack={() => handleNavigate('home')} userId={targetUserId} />;
      case 'reaccion':
        return <ReactionScreen onBack={() => handleNavigate('home')} userId={targetUserId} />;
      default:
        return (
          <RoleSelectorScreen 
            onSelectRole={(role) => {
              if (role === 'trainer') handleNavigate('trainer-dashboard');
              else handleNavigate('client-dashboard');
            }}
            onLogout={handleLogout}
            user={user}
            currentRole={userRole}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-[#D4AF37] animate-spin" size={48} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black font-sans selection:bg-[#D4AF37] selection:text-black">
        {renderScreen()}
        
        {/* Home Floating Action Button */}
        {currentScreen !== 'home' && (
          <button 
            onClick={() => {
              setCurrentScreen('home');
              setScreenData(null);
            }}
            className="fixed bottom-6 left-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-[#D4AF37] p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-all active:scale-95 flex items-center justify-center"
            title="Inicio"
          >
            <Home size={24} />
          </button>
        )}

        {/* Coach Floating Action Button to switch athletes */}
        {isTrainer && selectedAthlete && (
          <button 
            onClick={() => {
              setSelectedAthlete(null);
              setCurrentScreen('deportistas');
            }}
            className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-800 text-[#D4AF37] p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-all active:scale-95 flex items-center gap-2"
          >
            <Users size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Cambiar Atleta</span>
          </button>
        )}
      </div>
    </ErrorBoundary>
  );
}
