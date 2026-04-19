import * as React from 'react';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load all screens
const LoginScreen = lazy(() => import('./screens/LoginScreen').then(module => ({ default: module.LoginScreen })));
const RoleSelectorScreen = lazy(() => import('./screens/RoleSelectorScreen').then(module => ({ default: module.RoleSelectorScreen })));
const TrainerDashboard = lazy(() => import('./screens/TrainerDashboard').then(module => ({ default: module.TrainerDashboard })));
const ClientDashboard = lazy(() => import('./screens/ClientDashboard').then(module => ({ default: module.ClientDashboard })));
const ExerciseBankScreen = lazy(() => import('./screens/ExerciseBankScreen').then(module => ({ default: module.ExerciseBankScreen })));
const WorkoutsScreen = lazy(() => import('./screens/WorkoutsScreen').then(module => ({ default: module.WorkoutsScreen })));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen').then(module => ({ default: module.HistoryScreen })));
const ReportsScreen = lazy(() => import('./screens/ReportsScreen').then(module => ({ default: module.ReportsScreen })));
const DeportistasScreen = lazy(() => import('./screens/DeportistasScreen').then(module => ({ default: module.DeportistasScreen })));
const AthleteProfileScreen = lazy(() => import('./screens/AthleteProfileScreen').then(module => ({ default: module.AthleteProfileScreen })));
const ValoracionScreen = lazy(() => import('./screens/ValoracionScreen').then(module => ({ default: module.ValoracionScreen })));
const ZonasScreen = lazy(() => import('./screens/ZonasScreen').then(module => ({ default: module.ZonasScreen })));
const SeguimientoScreen = lazy(() => import('./screens/SeguimientoScreen').then(module => ({ default: module.SeguimientoScreen })));
const AnamnesisScreen = lazy(() => import('./screens/AnamnesisScreen').then(module => ({ default: module.AnamnesisScreen })));
const TestsScreen = lazy(() => import('./screens/TestsScreen').then(module => ({ default: module.TestsScreen })));
const VideoAnalysisScreen = lazy(() => import('./screens/VideoAnalysisScreen').then(module => ({ default: module.VideoAnalysisScreen })));
const DiagnosisScreen = lazy(() => import('./screens/DiagnosisScreen').then(module => ({ default: module.DiagnosisScreen })));
const PlanningScreen = lazy(() => import('./screens/PlanningScreen').then(module => ({ default: module.PlanningScreen })));
const KidsModuleScreen = lazy(() => import('./screens/KidsModuleScreen').then(module => ({ default: module.KidsModuleScreen })));
const SessionExecutionScreen = lazy(() => import('./screens/SessionExecutionScreen').then(module => ({ default: module.SessionExecutionScreen })));
const ChallengesScreen = lazy(() => import('./screens/ChallengesScreen').then(module => ({ default: module.ChallengesScreen })));
const TournamentsScreen = lazy(() => import('./screens/TournamentsScreen').then(module => ({ default: module.TournamentsScreen })));
const ProgressionScreen = lazy(() => import('./screens/ProgressionScreen').then(module => ({ default: module.ProgressionScreen })));
const TabataScreen = lazy(() => import('./screens/TabataScreen').then(module => ({ default: module.TabataScreen })));
const ReactionScreen = lazy(() => import('./screens/ReactionScreen').then(module => ({ default: module.ReactionScreen })));

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <Loader2 className="text-[#D4AF37] animate-spin" size={48} />
  </div>
);

// Navigation Wrapper to handle Floating Buttons and Context integration
const AppShell = () => {
  const { user, userProfile, isTrainer, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Logic to determine if we should show floating buttons
  const isHome = location.pathname === '/' || location.pathname === '/trainer-dashboard' || location.pathname === '/client-dashboard';
  const showHomeFab = !isHome && user;

  return (
    <div className="min-h-screen bg-black font-sans selection:bg-[#D4AF37] selection:text-black">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginScreen onLogin={() => {}} onLoginAnonymous={() => {}} />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              {userProfile?.role === 'trainer' || userProfile?.role === 'superadmin' 
                ? <Navigate to="/trainer-dashboard" replace /> 
                : <Navigate to="/client-dashboard" replace />
              }
            </ProtectedRoute>
          } />

          <Route path="/trainer-dashboard" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <TrainerDashboard user={user} userProfile={userProfile} onNavigate={(s: any, d: any) => navigate(`/${s}`, { state: d })} onLogout={logout} onBack={() => navigate(-1)} />
            </ProtectedRoute>
          } />

          <Route path="/client-dashboard" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientDashboard user={user} onNavigate={(s: any, d: any) => navigate(`/${s}`, { state: d })} onLogout={logout} onBack={() => navigate(-1)} />
            </ProtectedRoute>
          } />

          <Route path="/role-selector" element={
            <ProtectedRoute>
              <RoleSelectorScreen onSelectRole={(r: any) => navigate(r === 'trainer' ? '/trainer-dashboard' : '/client-dashboard')} onLogout={logout} user={user} currentRole={userProfile?.role as any} />
            </ProtectedRoute>
          } />

          <Route path="/exercise-bank" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <ExerciseBankScreen userId={user?.uid as string} onBack={() => navigate(-1)} userProfile={userProfile} />
            </ProtectedRoute>
          } />

          <Route path="/entrenamientos" element={<ProtectedRoute><WorkoutsScreen onBack={() => navigate(-1)} onNavigate={(s: any, d: any) => navigate(`/${s}`, { state: d })} userId={user?.uid as string} trainerId={userProfile?.trainerId || null} /></ProtectedRoute>} />
          <Route path="/historial" element={<ProtectedRoute><HistoryScreen onBack={() => navigate(-1)} userId={user?.uid as string} trainerId={userProfile?.trainerId || null} /></ProtectedRoute>} />
          <Route path="/informes" element={<ProtectedRoute><ReportsScreen onBack={() => navigate(-1)} userId={user?.uid as string} trainerId={userProfile?.trainerId || null} /></ProtectedRoute>} />
          
          <Route path="/deportistas" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <DeportistasScreen onBack={() => navigate(-1)} onSelectAthlete={(a: any) => navigate(`/atleta/${a.id}`, { state: a })} role={userProfile?.role as any} userId={user?.uid as string} />
            </ProtectedRoute>
          } />

          <Route path="/atleta/:id" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <AthleteProfileScreen athlete={location.state} onBack={() => navigate(-1)} onNavigate={(s: any, d: any) => navigate(`/${s}`, { state: { ...d, athleteId: location.pathname.split('/').pop() } })} isAdmin={isTrainer} />
            </ProtectedRoute>
          } />

          {/* Unified paths for athlete-specific screens */}
          <Route path="/valoracion" element={<ProtectedRoute><ValoracionScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} isAdmin={isTrainer} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />
          <Route path="/zonas" element={<ProtectedRoute><ZonasScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />
          <Route path="/seguimiento" element={<ProtectedRoute><SeguimientoScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />
          <Route path="/anamnesis" element={<ProtectedRoute><AnamnesisScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} isAdmin={isTrainer} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />
          <Route path="/tests" element={<ProtectedRoute><TestsScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} isAdmin={isTrainer} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />
          <Route path="/video-analysis" element={<ProtectedRoute><VideoAnalysisScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} isAdmin={isTrainer} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />
          <Route path="/diagnostico" element={<ProtectedRoute><DiagnosisScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} isAdmin={isTrainer} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />
          <Route path="/planificacion" element={<ProtectedRoute><PlanningScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} isAdmin={isTrainer} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />
          <Route path="/ejecucion-sesion" element={<ProtectedRoute><SessionExecutionScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} workout={location.state} trainerId={isTrainer ? user?.uid : (userProfile?.trainerId || null)} isAdmin={isTrainer} /></ProtectedRoute>} />
          <Route path="/ejecucion-sesion/:workoutId" element={<ProtectedRoute><SessionExecutionScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} workout={location.state} trainerId={isTrainer ? user?.uid : (userProfile?.trainerId || null)} isAdmin={isTrainer} /></ProtectedRoute>} />

          <Route path="/retos" element={<ProtectedRoute><ChallengesScreen onBack={() => navigate(-1)} userId={user?.uid as string} role={userProfile?.role as any} userProfile={userProfile} /></ProtectedRoute>} />
          <Route path="/torneos" element={<ProtectedRoute><TournamentsScreen onBack={() => navigate(-1)} userId={user?.uid as string} role={userProfile?.role as any} /></ProtectedRoute>} />
          <Route path="/progresion" element={<ProtectedRoute><ProgressionScreen onBack={() => navigate(-1)} userId={user?.uid as string} role={userProfile?.role as any} userProfile={userProfile} /></ProtectedRoute>} />
          <Route path="/tabata" element={<ProtectedRoute><TabataScreen onBack={() => navigate(-1)} userId={user?.uid as string} /></ProtectedRoute>} />
          <Route path="/reaccion" element={<ProtectedRoute><ReactionScreen onBack={() => navigate(-1)} userId={user?.uid as string} /></ProtectedRoute>} />
          <Route path="/kids-module" element={<ProtectedRoute><KidsModuleScreen onBack={() => navigate(-1)} userId={location.state?.athleteId || user?.uid} isAdmin={isTrainer} trainerId={isTrainer ? user?.uid : userProfile?.trainerId} /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Home Floating Action Button */}
      {showHomeFab && (
        <button 
          onClick={() => navigate('/')}
          className="fixed bottom-6 left-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-[#D4AF37] p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-all active:scale-95 flex items-center justify-center"
          title="Inicio"
        >
          <Home size={24} />
        </button>
      )}

      {/* Trainer Floating Action Button to switch athletes */}
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

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
