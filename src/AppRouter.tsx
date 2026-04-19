import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, UserRole } from './types';
import ProtectedRoute from './components/ProtectedRoute';
import { Loader2, Home as HomeIcon, Users, AlertTriangle } from 'lucide-react';
import { loginWithGoogle, loginAnonymously, logout } from './firebase';

// Lazy load screens
const LoginScreen = lazy(() => import('./screens/LoginScreen').then(m => ({ default: m.LoginScreen })));
const RoleSelectorScreen = lazy(() => import('./screens/RoleSelectorScreen').then(m => ({ default: m.RoleSelectorScreen })));
const TrainerDashboard = lazy(() => import('./screens/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })));
const ClientDashboard = lazy(() => import('./screens/ClientDashboard').then(m => ({ default: m.ClientDashboard })));
const DeportistasScreen = lazy(() => import('./screens/DeportistasScreen').then(m => ({ default: m.DeportistasScreen })));
const AthleteProfileScreen = lazy(() => import('./screens/AthleteProfileScreen').then(m => ({ default: m.AthleteProfileScreen })));
const WorkoutsScreen = lazy(() => import('./screens/WorkoutsScreen').then(m => ({ default: m.WorkoutsScreen })));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen').then(m => ({ default: m.HistoryScreen })));
const ReportsScreen = lazy(() => import('./screens/ReportsScreen').then(m => ({ default: m.ReportsScreen })));
const ValoracionScreen = lazy(() => import('./screens/ValoracionScreen').then(m => ({ default: m.ValoracionScreen })));
const ZonasScreen = lazy(() => import('./screens/ZonasScreen').then(m => ({ default: m.ZonasScreen })));
const SeguimientoScreen = lazy(() => import('./screens/SeguimientoScreen').then(m => ({ default: m.SeguimientoScreen })));
const AnamnesisScreen = lazy(() => import('./screens/AnamnesisScreen').then(m => ({ default: m.AnamnesisScreen })));
const TestsScreen = lazy(() => import('./screens/TestsScreen').then(m => ({ default: m.TestsScreen })));
const VideoAnalysisScreen = lazy(() => import('./screens/VideoAnalysisScreen').then(m => ({ default: m.VideoAnalysisScreen })));
const DiagnosisScreen = lazy(() => import('./screens/DiagnosisScreen').then(m => ({ default: m.DiagnosisScreen })));
const PlanningScreen = lazy(() => import('./screens/PlanningScreen').then(m => ({ default: m.PlanningScreen })));
const KidsModuleScreen = lazy(() => import('./screens/KidsModuleScreen').then(m => ({ default: m.KidsModuleScreen })));
const SessionExecutionScreen = lazy(() => import('./screens/SessionExecutionScreen').then(m => ({ default: m.SessionExecutionScreen })));
const ChallengesScreen = lazy(() => import('./screens/ChallengesScreen').then(m => ({ default: m.ChallengesScreen })));
const TournamentsScreen = lazy(() => import('./screens/TournamentsScreen').then(m => ({ default: m.TournamentsScreen })));
const ProgressionScreen = lazy(() => import('./screens/ProgressionScreen').then(m => ({ default: m.ProgressionScreen })));
const ExerciseBankScreen = lazy(() => import('./screens/ExerciseBankScreen').then(m => ({ default: m.ExerciseBankScreen })));
const TabataScreen = lazy(() => import('./screens/TabataScreen').then(m => ({ default: m.TabataScreen })));
const ReactionScreen = lazy(() => import('./screens/ReactionScreen').then(m => ({ default: m.ReactionScreen })));

interface AppRouterProps {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
}

const LoadingFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <Loader2 className="text-[#D4AF37] animate-spin" size={48} />
  </div>
);

const Home = ({ user, userProfile, loading, isTrainer, handleLogout }: any) => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (userProfile && !loading) {
      if (userProfile.role === 'trainer' || userProfile.role === 'superadmin') {
        navigate('/trainer', { replace: true });
      } else if (userProfile.role === 'client') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [userProfile, loading, navigate]);

  return (
    <ProtectedRoute user={user} userProfile={userProfile} loading={loading}>
      <RoleSelectorScreen 
        onSelectRole={(role) => navigate(role === 'trainer' ? '/trainer' : '/dashboard')}
        onLogout={handleLogout}
        user={user!}
        currentRole={isTrainer ? 'trainer' : 'client'}
      />
    </ProtectedRoute>
  );
};

const AppRouter: React.FC<AppRouterProps> = ({ user, userProfile, loading, authError }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTrainer = userProfile?.role === 'trainer' || userProfile?.role === 'superadmin';

  // Handle Shared Links
  React.useEffect(() => {
    if (user && userProfile && !loading) {
      const params = new URLSearchParams(window.location.search);
      const shareType = params.get('share');
      const shareId = params.get('id');

      if (shareType === 'workout' && shareId) {
        const fetchWorkoutAndNavigate = async () => {
          try {
            const workoutDoc = await getDoc(doc(db, 'workouts', shareId));
            if (workoutDoc.exists()) {
              const workoutData = { id: workoutDoc.id, ...workoutDoc.data() };
              // Clear search params
              window.history.replaceState({}, document.title, window.location.pathname);
              // Navigate to execution screen
              navigate(`/atleta/${user.uid}/ejecucion-sesion`, { state: workoutData });
            }
          } catch (error) {
            console.error("Error fetching shared workout:", error);
          }
        };
        fetchWorkoutAndNavigate();
      }
    }
  }, [user, userProfile, loading, navigate]);

  const handleLogout = async () => {
    localStorage.setItem('wlsports_logged_out', 'true');
    await logout();
    navigate('/login');
  };

  // Helper for screen navigation
  const getOnNavigate = (basePath?: string) => (screen: string, data?: any) => {
    if (screen === 'home') navigate('/');
    else if (screen === 'trainer-dashboard') navigate('/trainer');
    else if (screen === 'client-dashboard') navigate('/dashboard');
    else if (screen === 'deportistas') navigate('/deportistas');
    else if (screen === 'exercise-bank') navigate('/ejercicios');
    else if (screen === 'athlete-profile') navigate(`/atleta/${data?.id}`, { state: data });
    else if (screen === 'ejecucion-directa') navigate(`/atleta/${data?.athleteId}/ejecucion-sesion`, { state: data?.workout });
    else if (basePath) navigate(`${basePath}/${screen}`, { state: data });
    else navigate(`/${screen}`, { state: data });
  };

  return (
    <div className="min-h-screen bg-black font-sans selection:bg-[#D4AF37] selection:text-black">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : 
            <LoginScreen onLogin={loginWithGoogle} onLoginAnonymous={loginAnonymously} externalError={authError} />
          } />

          <Route path="/blocked" element={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="text-red-500 mb-4" size={64} />
              <h1 className="text-2xl font-black text-white mb-2">Acceso Bloqueado</h1>
              <p className="text-zinc-500 max-w-sm mb-6">Tu cuenta ha sido suspendida. Contacta con soporte para más información.</p>
              <button onClick={handleLogout} className="text-[#D4AF37] font-bold uppercase tracking-widest text-xs">Cerrar Sesión</button>
            </div>
          } />

          <Route path="/deleted" element={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="text-zinc-500 mb-4" size={64} />
              <h1 className="text-2xl font-black text-white mb-2">Cuenta Eliminada</h1>
              <p className="text-zinc-500 max-w-sm mb-6">Esta cuenta ya no está disponible.</p>
              <button onClick={handleLogout} className="text-[#D4AF37] font-bold uppercase tracking-widest text-xs">Cerrar Sesión</button>
            </div>
          } />

          <Route path="/" element={<Home user={user} userProfile={userProfile} loading={loading} isTrainer={isTrainer} handleLogout={handleLogout} />} />

          <Route path="/trainer" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <TrainerDashboard user={user!} userProfile={userProfile} onNavigate={getOnNavigate()} onLogout={handleLogout} onBack={() => navigate(-1)} />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['client']}>
              <ClientDashboard user={user!} onNavigate={getOnNavigate(`/atleta/${user?.uid}`)} onLogout={handleLogout} onBack={() => navigate(-1)} />
            </ProtectedRoute>
          } />

          <Route path="/deportistas" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <DeportistasScreen onBack={() => navigate(-1)} onSelectAthlete={(a) => navigate(`/atleta/${a.id}`, { state: a })} role={userProfile?.role || 'trainer'} userId={user?.uid || ''} />
            </ProtectedRoute>
          } />

          <Route path="/ejercicios" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <ExerciseBankScreen userId={user?.uid || ''} onBack={() => navigate(-1)} userProfile={userProfile} />
            </ProtectedRoute>
          } />

          {/* Global Tool Routes for Trainer */}
          <Route path="/tabata" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <TabataScreen onBack={() => navigate(-1)} userId={user?.uid || ''} />
            </ProtectedRoute>
          } />
          <Route path="/reaccion" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <ReactionScreen onBack={() => navigate(-1)} userId={user?.uid || ''} />
            </ProtectedRoute>
          } />
          <Route path="/retos" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <ChallengesScreen onBack={() => navigate(-1)} userId={user?.uid || ''} />
            </ProtectedRoute>
          } />
          <Route path="/torneos" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <TournamentsScreen onBack={() => navigate(-1)} userId={user?.uid || ''} />
            </ProtectedRoute>
          } />
          <Route path="/progresion" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <ProgressionScreen onBack={() => navigate(-1)} userId={user?.uid || ''} />
            </ProtectedRoute>
          } />
          <Route path="/videoAnalysis" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <VideoAnalysisScreen onBack={() => navigate(-1)} userId={user?.uid || ''} />
            </ProtectedRoute>
          } />
           <Route path="/entrenamientos" element={
            <ProtectedRoute user={user} userProfile={userProfile} loading={loading} allowedRoles={['trainer', 'superadmin']}>
              <WorkoutsScreen onBack={() => navigate(-1)} userId={user?.uid || ''} trainerId={user?.uid || ''} onNavigate={getOnNavigate(`/atleta/${user?.uid}`)} />
            </ProtectedRoute>
          } />

          {/* Dynamic Athlete Routes */}
          <Route path="/atleta/:id">
            <Route index element={<AthleteRouteWrapper Component={AthleteProfileScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="entrenamientos" element={<AthleteRouteWrapper Component={WorkoutsScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="historial" element={<AthleteRouteWrapper Component={HistoryScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="informes" element={<AthleteRouteWrapper Component={ReportsScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="valoracion" element={<AthleteRouteWrapper Component={ValoracionScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="zonas" element={<AthleteRouteWrapper Component={ZonasScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="seguimiento" element={<AthleteRouteWrapper Component={SeguimientoScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="anamnesis" element={<AthleteRouteWrapper Component={AnamnesisScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="tests" element={<AthleteRouteWrapper Component={TestsScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="videoAnalysis" element={<AthleteRouteWrapper Component={VideoAnalysisScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="diagnostico" element={<AthleteRouteWrapper Component={DiagnosisScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="planificacion" element={<AthleteRouteWrapper Component={PlanningScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="kidsModule" element={<AthleteRouteWrapper Component={KidsModuleScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="ejecucion-sesion" element={<AthleteRouteWrapper Component={SessionExecutionScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="ejecucion-sesion/:workoutId" element={<AthleteRouteWrapper Component={SessionExecutionScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="retos" element={<AthleteRouteWrapper Component={ChallengesScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="torneos" element={<AthleteRouteWrapper Component={TournamentsScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="progresion" element={<AthleteRouteWrapper Component={ProgressionScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="tabata" element={<AthleteRouteWrapper Component={TabataScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
            <Route path="reaccion" element={<AthleteRouteWrapper Component={ReactionScreen} user={user} isTrainer={isTrainer} userProfile={userProfile} />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Floating Buttons preserved from original */}
      {location.pathname !== '/' && location.pathname !== '/login' && (
        <button 
          onClick={() => navigate('/')}
          className="fixed bottom-6 left-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-[#D4AF37] p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-all active:scale-95 flex items-center justify-center"
          title="Inicio"
        >
          <HomeIcon size={24} />
        </button>
      )}

      {isTrainer && location.pathname.includes('/atleta/') && (
        <button 
          onClick={() => navigate('/deportistas')}
          className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-800 text-[#D4AF37] p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-all active:scale-95 flex items-center gap-2"
        >
          <Users size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Cambiar Atleta</span>
        </button>
      )}
    </div>
  );
};

// Internal wrapper to handle shared props and athlete ID injection
const AthleteRouteWrapper: React.FC<{ Component: any; user: User | null; isTrainer: boolean; userProfile: UserProfile | null }> = ({ 
  Component, user, isTrainer, userProfile 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Distinguish between athlete data and other state (like workout)
  const isAthleteInState = location.state && (location.state as any).role === 'client';
  const initialAthlete = isAthleteInState ? location.state : null;
  const initialWorkout = !isAthleteInState ? location.state : null;

  const [athlete, setAthlete] = React.useState<any>(initialAthlete);
  const [loading, setLoading] = React.useState(!initialAthlete);

  React.useEffect(() => {
    if (!athlete && id) {
      const fetchAthlete = async () => {
        try {
          const docRef = doc(db, 'users', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setAthlete({ id: snap.id, ...snap.data() });
          }
        } catch (error) {
          console.error("Error fetching athlete for route:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchAthlete();
    }
  }, [id, athlete]);

  const onNavigate = (screen: string, data?: any) => {
    navigate(`/atleta/${id}/${screen}`, { state: data });
  };

  if (loading) return <LoadingFallback />;

  return (
    <Component 
      userId={id}
      athlete={athlete}
      isAdmin={isTrainer}
      role={userProfile?.role}
      userProfile={userProfile}
      workout={initialWorkout}
      trainerId={isTrainer ? user?.uid : userProfile?.trainerId}
      onBack={() => navigate(-1)} 
      onNavigate={onNavigate} 
    />
  );
};

export default AppRouter;

