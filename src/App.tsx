import * as React from 'react';
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Home, Users } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load all screens for optimal performance
const LoginScreen = lazy(() => import('./screens/LoginScreen').then(m => ({ default: m.LoginScreen })));
const RoleSelectorScreen = lazy(() => import('./screens/RoleSelectorScreen').then(m => ({ default: m.RoleSelectorScreen })));
const TrainerDashboard = lazy(() => import('./screens/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })));
const ClientDashboard = lazy(() => import('./screens/ClientDashboard').then(m => ({ default: m.ClientDashboard })));
const ExerciseBankScreen = lazy(() => import('./screens/ExerciseBankScreen').then(m => ({ default: m.ExerciseBankScreen })));
const WorkoutsScreen = lazy(() => import('./screens/WorkoutsScreen').then(m => ({ default: m.WorkoutsScreen })));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen').then(m => ({ default: m.HistoryScreen })));
const ReportsScreen = lazy(() => import('./screens/ReportsScreen').then(m => ({ default: m.ReportsScreen })));
const DeportistasScreen = lazy(() => import('./screens/DeportistasScreen').then(m => ({ default: m.DeportistasScreen })));
const AthleteProfileScreen = lazy(() => import('./screens/AthleteProfileScreen').then(m => ({ default: m.AthleteProfileScreen })));
const ValoracionScreen = lazy(() => import('./screens/ValoracionScreen').then(m => ({ default: m.ValoracionScreen })));
const ZonasScreen = lazy(() => import('./screens/ZonasScreen').then(m => ({ default: m.ZonasScreen })));
const SeguimientoScreen = lazy(() => import('./screens/SeguimientoScreen').then(m => ({ default: m.SeguimientoScreen })));
const TestsScreen = lazy(() => import('./screens/TestsScreen').then(m => ({ default: m.TestsScreen })));
const VideoAnalysisScreen = lazy(() => import('./screens/VideoAnalysisScreen').then(m => ({ default: m.VideoAnalysisScreen })));
const DiagnosisScreen = lazy(() => import('./screens/DiagnosisScreen').then(m => ({ default: m.DiagnosisScreen })));
const PlanningScreen = lazy(() => import('./screens/PlanningScreen').then(m => ({ default: m.PlanningScreen })));
const KidsModuleScreen = lazy(() => import('./screens/KidsModuleScreen').then(m => ({ default: m.KidsModuleScreen })));
const SessionExecutionScreen = lazy(() => import('./screens/SessionExecutionScreen').then(m => ({ default: m.SessionExecutionScreen })));
const ChallengesScreen = lazy(() => import('./screens/ChallengesScreen').then(m => ({ default: m.ChallengesScreen })));
const TournamentsScreen = lazy(() => import('./screens/TournamentsScreen').then(m => ({ default: m.TournamentsScreen })));
const ProgressionScreen = lazy(() => import('./screens/ProgressionScreen').then(m => ({ default: m.ProgressionScreen })));
const TabataScreen = lazy(() => import('./screens/TabataScreen').then(m => ({ default: m.TabataScreen })));
const CircuitExecutionScreen = lazy(() => import('./screens/CircuitExecutionScreen').then(m => ({ default: m.CircuitExecutionScreen })));
const ReactionScreen = lazy(() => import('./screens/ReactionScreen').then(m => ({ default: m.ReactionScreen })));
const InitialEvaluationScreen = lazy(() => import('./screens/evaluation/InitialEvaluationScreen').then(m => ({ default: m.InitialEvaluationScreen })));

// Global Loading Component
const PageLoader = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center">
    <Loader2 className="text-[#D4AF37] animate-spin mb-4" size={48} />
    <p className="text-zinc-500 font-medium animate-pulse uppercase tracking-[0.2em] text-[10px]">WLSPORTS</p>
  </div>
);

const AppShell: React.FC = () => {
  const { user, userProfile, isTrainer, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Helper for screen navigation
  const getOnNavigate = (basePath?: string) => (screen: string, data?: any) => {
    if (screen === 'home') navigate('/');
    else if (screen === 'trainer-dashboard') navigate('/trainer-dashboard');
    else if (screen === 'client-dashboard') navigate('/client-dashboard');
    else if (screen === 'deportistas') navigate('/deportistas');
    else if (screen === 'exercise-bank') navigate('/exercise-bank');
    else if (screen === 'athlete-profile') navigate(`/atleta/${data?.id || data?.athleteId}`, { state: data });
    else if (screen === 'evaluacion360') {
      const athleteId = data?.id || data?.athleteId || (basePath?.includes('/atleta/') ? basePath.split('/').pop() : null);
      if (athleteId) navigate(`/atleta/${athleteId}/evaluacion360`, { state: data });
      else navigate('/evaluacion360', { state: data });
    }
    else if (screen === 'ejecucion-directa') navigate(`/ejecucion-sesion`, { state: data?.workout });
    else if (basePath) navigate(`${basePath}/${screen}`, { state: data });
    else navigate(`/${screen}`, { state: data });
  };

  if (loading) return <PageLoader />;

  // UI elements visibility logic
  const isHome = location.pathname === '/' || location.pathname === '/trainer-dashboard' || location.pathname === '/client-dashboard';
  const showNavButtons = user && !location.pathname.includes('/login');

  return (
    <div className="min-h-screen bg-black font-sans selection:bg-[#D4AF37] selection:text-black transition-colors duration-300">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Access */}
          <Route path="/login" element={
            user ? (
              <Navigate to={userProfile?.role === 'client' ? "/client-dashboard" : "/trainer-dashboard"} replace />
            ) : (
              <LoginScreen />
            )
          } />

          {/* Core Dashboards */}
          <Route path="/trainer-dashboard" element={
            <ProtectedRoute allowedRoles={['trainer', 'superadmin']}>
              <TrainerDashboard onNavigate={getOnNavigate()} />
            </ProtectedRoute>
          } />

          <Route path="/client-dashboard" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientDashboard onNavigate={getOnNavigate(`/atleta/${user?.uid}`)} />
            </ProtectedRoute>
          } />

          <Route path="/role-selector" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <RoleSelectorScreen />
            </ProtectedRoute>
          } />

          {/* Functional Modules */}
          <Route path="/deportistas" element={
            <ProtectedRoute allowedRoles={['trainer', 'superadmin']}>
              <DeportistasScreen />
            </ProtectedRoute>
          } />

          <Route path="/atleta/:id" element={
            <ProtectedRoute allowedRoles={['trainer', 'superadmin', 'client']}>
              <AthleteProfileScreen onNavigate={getOnNavigate()} />
            </ProtectedRoute>
          } />

          <Route path="/atleta/:id/evaluacion360" element={
            <ProtectedRoute allowedRoles={['trainer', 'superadmin', 'client']}>
              <InitialEvaluationScreen />
            </ProtectedRoute>
          } />

          <Route path="/evaluacion360" element={
            <ProtectedRoute allowedRoles={['trainer', 'superadmin', 'client']}>
              <InitialEvaluationScreen />
            </ProtectedRoute>
          } />

          <Route path="/exercise-bank" element={
            <ProtectedRoute allowedRoles={['trainer', 'superadmin']}>
              <ExerciseBankScreen userId={user?.uid || ''} onBack={() => navigate(-1)} userProfile={userProfile} />
            </ProtectedRoute>
          } />

          {/* Evaluation & Planning Tools */}
          <Route path="/valoracion" element={<ProtectedRoute><ValoracionScreen /></ProtectedRoute>} />
          <Route path="/zonas" element={<ProtectedRoute><ZonasScreen /></ProtectedRoute>} />
          <Route path="/seguimiento" element={<ProtectedRoute><SeguimientoScreen /></ProtectedRoute>} />
          <Route path="/tests" element={<ProtectedRoute><TestsScreen /></ProtectedRoute>} />
          <Route path="/video-analysis" element={<ProtectedRoute><VideoAnalysisScreen /></ProtectedRoute>} />
          <Route path="/diagnostico" element={<ProtectedRoute><DiagnosisScreen /></ProtectedRoute>} />
          <Route path="/planificacion" element={<ProtectedRoute><PlanningScreen /></ProtectedRoute>} />
          
          {/* Execution & Tracking */}
          <Route path="/ejecucion-sesion" element={<ProtectedRoute><SessionExecutionScreen /></ProtectedRoute>} />
          <Route path="/ejecucion-sesion/:workoutId" element={<ProtectedRoute><SessionExecutionScreen /></ProtectedRoute>} />
          <Route path="/entrenamientos" element={<ProtectedRoute><WorkoutsScreen /></ProtectedRoute>} />
          <Route path="/atleta/:id/entrenamientos" element={<ProtectedRoute allowedRoles={['trainer', 'superadmin']}><WorkoutsScreen /></ProtectedRoute>} />
          <Route path="/historial" element={<ProtectedRoute><HistoryScreen /></ProtectedRoute>} />
          <Route path="/atleta/:id/historial" element={<ProtectedRoute allowedRoles={['trainer', 'superadmin']}><HistoryScreen /></ProtectedRoute>} />
          <Route path="/informes" element={<ProtectedRoute><ReportsScreen /></ProtectedRoute>} />

          {/* Gamification & Tools */}
          <Route path="/retos" element={<ProtectedRoute><ChallengesScreen /></ProtectedRoute>} />
          <Route path="/torneos" element={<ProtectedRoute><TournamentsScreen /></ProtectedRoute>} />
          <Route path="/progresion" element={<ProtectedRoute><ProgressionScreen /></ProtectedRoute>} />
          <Route path="/tabata" element={<ProtectedRoute><TabataScreen /></ProtectedRoute>} />
          <Route path="/ejecucion-circuito" element={<ProtectedRoute><CircuitExecutionScreen /></ProtectedRoute>} />
          <Route path="/reaccion" element={<ProtectedRoute><ReactionScreen /></ProtectedRoute>} />
          <Route path="/kids-module" element={<ProtectedRoute><KidsModuleScreen /></ProtectedRoute>} />

          {/* Root Redirects */}
          <Route path="/" element={
            !user ? <Navigate to="/login" replace /> : 
            <Navigate to={userProfile?.role === 'client' ? "/client-dashboard" : "/trainer-dashboard"} replace />
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Global Context-Aware Floating Actions */}
      {showNavButtons && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-between px-6 pointer-events-none z-50">
          <div className="pointer-events-auto">
            {!isHome && (
              <button 
                onClick={() => navigate('/')}
                className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-[#D4AF37] p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 flex items-center justify-center group"
                title="Inicio"
              >
                <Home size={24} className="group-hover:rotate-12 transition-transform" />
              </button>
            )}
          </div>
          
          <div className="pointer-events-auto">
            {isTrainer && location.pathname.includes('/atleta/') && (
              <button 
                onClick={() => navigate('/deportistas')}
                className="bg-zinc-900 border border-zinc-800 text-[#D4AF37] p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 flex items-center gap-2 group"
              >
                <Users size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Cambiar Atleta</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
